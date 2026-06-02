import prisma from "prisma/client";
import { MODULE_CACHE_TTL } from "@/modules/cache/cache-policy";
import { moduleCache } from "@/modules/cache/module-cache";
import { client } from "@/utils/client";

const LLM_COOLDOWN_MS = 5 * 60 * 60 * 1000; // 5 hours

/** Shared relation shape for snapshot reads — limits greenArea columns. */
const snapshotDetailInclude = {
  airQuality: true,
  disasterRisk: true,
  heatRisk: true,
  weatherCondition: true,
  noiseEstimation: true,
  scoreDetail: true,
  recommendations: true,
  greenAccessScores: {
    include: {
      greenArea: {
        select: {
          id: true,
          name: true,
          latitude: true,
          longitude: true,
          areaSize: true,
        },
      },
    },
  },
} as const;

/** Lean read for snapshot generation — only fields needed to clone metrics. */
const snapshotSourceSelect = {
  airQuality: {
    select: { aqi: true, category: true, dominantPollutant: true },
  },
  disasterRisk: {
    select: { floodScore: true, heatScore: true, divisionCode: true },
  },
  heatRisk: {
    select: { feelsLike: true, heatRiskScore: true, riskLevel: true },
  },
  weatherCondition: {
    select: {
      temperature: true,
      humidity: true,
      rainfall: true,
      weatherStatus: true,
    },
  },
  noiseEstimation: {
    select: { roadDensityIndex: true, estimatedNoiseLevel: true },
  },
  scoreDetail: {
    select: {
      airQualityScore: true,
      heatRiskScore: true,
      floodRiskScore: true,
      noiseScore: true,
      greenSpaceScore: true,
    },
  },
} as const;

class SnapshotService {
  private client;
  /** Track last LLM generation time per locationId to respect rate limits */
  private lastLlmGenerationByLocation: Map<string, number> = new Map();

  constructor() {
    this.client = client;
  }

  /**
   * Static fallback recommendations (rule-based, no LLM).
   * Used when within the 5-hour cooldown or when the LLM call fails.
   */
  private generateStaticRecommendations(
    airQualityScore: number,
    heatRiskScore: number,
    floodRiskScore: number,
    noiseScore: number,
    greenSpaceScore: number,
    environmentalScore: number,
  ) {
    const recommendations: { message: string; severity: number }[] = [];

    if (airQualityScore < 40) {
      recommendations.push({
        message:
          "Air quality is poor. Consider staying indoors and wearing an N95 mask if you go outside.",
        severity: 3,
      });
    } else if (airQualityScore < 60) {
      recommendations.push({
        message:
          "Air quality is moderate. Sensitive groups should limit outdoor activities.",
        severity: 2,
      });
    }

    if (heatRiskScore > 70) {
      recommendations.push({
        message:
          "High heat risk detected. Stay hydrated, wear light clothing, and avoid strenuous activities.",
        severity: 3,
      });
    } else if (heatRiskScore > 50) {
      recommendations.push({
        message:
          "Moderate heat today. Remember to drink plenty of water and use sunscreen.",
        severity: 2,
      });
    }

    if (floodRiskScore > 70) {
      recommendations.push({
        message:
          "High flood risk in this area. Avoid flooded areas and have an emergency plan ready.",
        severity: 3,
      });
    } else if (floodRiskScore > 50) {
      recommendations.push({
        message: "Elevated flood risk. Stay alert and avoid low-lying areas.",
        severity: 2,
      });
    }

    if (noiseScore > 70) {
      recommendations.push({
        message:
          "High noise levels detected. Use noise-cancelling headphones or earplugs if sensitive to noise.",
        severity: 2,
      });
    }

    if (greenSpaceScore < 40) {
      recommendations.push({
        message:
          "Limited green spaces nearby. Consider taking a short trip to a park for better air quality and mental health.",
        severity: 1,
      });
    }

    if (environmentalScore < 45) {
      recommendations.push({
        message:
          "Overall environmental conditions are poor today. Plan activities accordingly and protect yourself.",
        severity: 3,
      });
    } else if (environmentalScore < 70) {
      recommendations.push({
        message:
          "Environmental conditions are moderate. Monitor changes throughout the day.",
        severity: 2,
      });
    } else {
      recommendations.push({
        message:
          "Good environmental conditions today. Great time for outdoor activities!",
        severity: 1,
      });
    }

    return recommendations.slice(0, 5);
  }

  /**
   * Generate recommendations using Groq LLM.
   * Sends environmental score data to the model and parses structured JSON output.
   */
  private async generateLlmRecommendations(
    airQualityScore: number,
    heatRiskScore: number,
    floodRiskScore: number,
    noiseScore: number,
    greenSpaceScore: number,
    environmentalScore: number,
    weatherData?: {
      temperature?: number;
      humidity?: number;
      weatherStatus?: string;
    },
  ): Promise<{ message: string; severity: number }[]> {
    const prompt = `You are AERIS, an environmental intelligence assistant. Based on the following environmental data for a user's location, generate 3-5 actionable, personalized daily recommendations.

Environmental Data:
- Air Quality Score: ${airQualityScore}/100 (higher is better)
- Heat Risk Score: ${heatRiskScore}/100 (higher means more heat risk)
- Flood Risk Score: ${floodRiskScore}/100 (higher means more flood risk)
- Noise Level Score: ${noiseScore}/100 (higher means noisier)
- Green Space Accessibility Score: ${greenSpaceScore}/100 (higher is better)
- Overall Environmental Score: ${environmentalScore}/100
${weatherData?.temperature != null ? `- Temperature: ${weatherData.temperature}°C` : ""}
${weatherData?.humidity != null ? `- Humidity: ${weatherData.humidity}%` : ""}
${weatherData?.weatherStatus ? `- Weather Status: ${weatherData.weatherStatus}` : ""}

Rules:
1. Each recommendation must be a short, actionable sentence (max 150 chars).
2. Severity must be 1 (low/info), 2 (moderate/caution), or 3 (high/danger).
3. Focus on practical advice: outdoor activity safety, health protection, travel tips.
4. Be specific to the data — don't give generic advice.
5. Respond ONLY with a valid JSON array, no markdown, no extra text.

Format:
[{"message": "...", "severity": 1|2|3}]`;

    try {
      const response = await this.client.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content:
              "You are an environmental health advisor. Respond ONLY with a valid JSON array. No markdown fences, no explanation.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 512,
        response_format: { type: "json_object" },
      });

      const content = response.choices?.[0]?.message?.content?.trim();
      if (!content) {
        console.warn(
          "[SnapshotService] LLM returned empty content, using static fallback.",
        );
        return this.generateStaticRecommendations(
          airQualityScore,
          heatRiskScore,
          floodRiskScore,
          noiseScore,
          greenSpaceScore,
          environmentalScore,
        );
      }

      const parsed = JSON.parse(content);
      // Handle both { recommendations: [...] } and direct [...] formats
      const items: unknown[] = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed.recommendations)
          ? parsed.recommendations
          : [];

      if (items.length === 0) {
        console.warn(
          "[SnapshotService] LLM returned no recommendations, using static fallback.",
        );
        return this.generateStaticRecommendations(
          airQualityScore,
          heatRiskScore,
          floodRiskScore,
          noiseScore,
          greenSpaceScore,
          environmentalScore,
        );
      }

      // Validate and normalize each recommendation
      const validated = items
        .filter(
          (item: any) =>
            typeof item?.message === "string" &&
            item.message.length > 0 &&
            [1, 2, 3].includes(Number(item.severity)),
        )
        .map((item: any) => ({
          message: String(item.message).slice(0, 255),
          severity: Number(item.severity),
        }))
        .slice(0, 5);

      if (validated.length === 0) {
        console.warn(
          "[SnapshotService] LLM recommendations failed validation, using static fallback.",
        );
        return this.generateStaticRecommendations(
          airQualityScore,
          heatRiskScore,
          floodRiskScore,
          noiseScore,
          greenSpaceScore,
          environmentalScore,
        );
      }

      console.log(
        `[SnapshotService] Generated ${validated.length} LLM recommendation(s) via Groq.`,
      );
      return validated;
    } catch (error) {
      console.error(
        "[SnapshotService] Groq LLM call failed, falling back to static recommendations:",
        error instanceof Error ? error.message : error,
      );
      return this.generateStaticRecommendations(
        airQualityScore,
        heatRiskScore,
        floodRiskScore,
        noiseScore,
        greenSpaceScore,
        environmentalScore,
      );
    }
  }

  /**
   * Decide whether to use LLM or static recommendations based on cooldown.
   * Cooldown: 5 hours per location to avoid hitting Groq rate limits.
   */
  private async generateRecommendations(
    locationId: string,
    airQualityScore: number,
    heatRiskScore: number,
    floodRiskScore: number,
    noiseScore: number,
    greenSpaceScore: number,
    environmentalScore: number,
    weatherData?: {
      temperature?: number;
      humidity?: number;
      weatherStatus?: string;
    },
  ): Promise<{ message: string; severity: number }[]> {
    const lastGenTime = this.lastLlmGenerationByLocation.get(locationId) ?? 0;
    const elapsed = Date.now() - lastGenTime;

    if (elapsed < LLM_COOLDOWN_MS) {
      const remainingMinutes = Math.round(
        (LLM_COOLDOWN_MS - elapsed) / (60 * 1000),
      );
      console.log(
        `[SnapshotService] LLM cooldown active for location ${locationId}. ${remainingMinutes} min remaining. Using static recommendations.`,
      );
      return this.generateStaticRecommendations(
        airQualityScore,
        heatRiskScore,
        floodRiskScore,
        noiseScore,
        greenSpaceScore,
        environmentalScore,
      );
    }

    // Use LLM and update cooldown timestamp
    const recommendations = await this.generateLlmRecommendations(
      airQualityScore,
      heatRiskScore,
      floodRiskScore,
      noiseScore,
      greenSpaceScore,
      environmentalScore,
      weatherData,
    );

    this.lastLlmGenerationByLocation.set(locationId, Date.now());
    return recommendations;
  }

  public async getCurrent(userId: string, locationId?: string) {
    const resolvedLocationId = await this.resolveLocationId(userId, locationId);
    const cacheKey = ["snapshot", userId, "current", resolvedLocationId].join(
      ":",
    );

    return moduleCache.getOrSet(
      cacheKey,
      MODULE_CACHE_TTL.SNAPSHOT_MS,
      async () => {
        const current = await prisma.environmentalSnapshot.findFirst({
          where: {
            locationId: resolvedLocationId,
          },
          orderBy: {
            snapshotTime: "desc",
          },
          include: snapshotDetailInclude,
        });

        if (!current) {
          throw new Error("No snapshot found");
        }

        return current;
      },
    );
  }

  public async getHistory(userId: string, locationId?: string, limit?: string) {
    const take = Number.isFinite(Number(limit))
      ? Math.min(Math.max(Number(limit), 1), 100)
      : 20;

    const where = locationId
      ? {
          locationId,
          location: {
            userId,
          },
        }
      : {
          location: {
            userId,
          },
        };

    const cacheKey = [
      "snapshot",
      userId,
      "history",
      locationId ?? "latest",
      take,
    ].join(":");

    return moduleCache.getOrSet(cacheKey, MODULE_CACHE_TTL.SNAPSHOT_MS, () =>
      prisma.environmentalSnapshot.findMany({
        where,
        orderBy: {
          snapshotTime: "desc",
        },
        take,
        include: {
          scoreDetail: true,
        },
      }),
    );
  }

  public async getById(userId: string, snapshotId: string) {
    const cacheKey = ["snapshot", userId, "id", snapshotId].join(":");

    return moduleCache.getOrSet(
      cacheKey,
      MODULE_CACHE_TTL.SNAPSHOT_MS,
      async () => {
        const snapshot = await prisma.environmentalSnapshot.findFirst({
          where: {
            id: snapshotId,
            location: {
              userId,
            },
          },
          include: snapshotDetailInclude,
        });

        if (!snapshot) {
          throw new Error("Snapshot not found");
        }

        return snapshot;
      },
    );
  }

  public async generate(userId: string, locationId?: string) {
    const resolvedLocationId = await this.resolveLocationId(userId, locationId);

    const latest = await prisma.environmentalSnapshot.findFirst({
      where: {
        locationId: resolvedLocationId,
      },
      orderBy: {
        snapshotTime: "desc",
      },
      select: snapshotSourceSelect,
    });

    const airQualityScore = latest?.scoreDetail?.airQualityScore ?? 60;
    const heatRiskScore = latest?.scoreDetail?.heatRiskScore ?? 60;
    const floodRiskScore = latest?.scoreDetail?.floodRiskScore ?? 60;
    const noiseScore = latest?.scoreDetail?.noiseScore ?? 60;
    const greenSpaceScore = latest?.scoreDetail?.greenSpaceScore ?? 60;

    const environmentalScore = Math.round(
      (airQualityScore +
        heatRiskScore +
        floodRiskScore +
        noiseScore +
        greenSpaceScore) /
        5,
    );

    const created = await prisma.environmentalSnapshot.create({
      data: {
        locationId: resolvedLocationId,
        snapshotTime: new Date(),
        environmentalScore,
        airQuality: {
          create: {
            aqi: latest?.airQuality?.aqi ?? 50,
            category: latest?.airQuality?.category ?? "Moderate",
            dominantPollutant: latest?.airQuality?.dominantPollutant ?? "pm2_5",
          },
        },
        disasterRisk: {
          create: {
            floodScore: latest?.disasterRisk?.floodScore ?? floodRiskScore,
            heatScore: latest?.disasterRisk?.heatScore ?? heatRiskScore,
            divisionCode: latest?.disasterRisk?.divisionCode ?? null,
          },
        },
        heatRisk: {
          create: {
            feelsLike:
              latest?.heatRisk?.feelsLike ??
              latest?.weatherCondition?.temperature ??
              29,
            heatRiskScore: latest?.heatRisk?.heatRiskScore ?? heatRiskScore,
            riskLevel: latest?.heatRisk?.riskLevel ?? "Low Risk",
          },
        },
        weatherCondition: {
          create: {
            temperature: latest?.weatherCondition?.temperature ?? 29,
            humidity: latest?.weatherCondition?.humidity ?? 72,
            rainfall: latest?.weatherCondition?.rainfall ?? 0,
            weatherStatus: latest?.weatherCondition?.weatherStatus ?? "Cloudy",
          },
        },
        noiseEstimation: {
          create: {
            roadDensityIndex: latest?.noiseEstimation?.roadDensityIndex ?? 50,
            estimatedNoiseLevel:
              latest?.noiseEstimation?.estimatedNoiseLevel ?? 55,
          },
        },
        scoreDetail: {
          create: {
            airQualityScore,
            heatRiskScore,
            floodRiskScore,
            noiseScore,
            greenSpaceScore,
          },
        },
        recommendations: {
          create: await this.generateRecommendations(
            resolvedLocationId,
            airQualityScore,
            heatRiskScore,
            floodRiskScore,
            noiseScore,
            greenSpaceScore,
            environmentalScore,
            {
              temperature: latest?.weatherCondition?.temperature ?? undefined,
              humidity: latest?.weatherCondition?.humidity ?? undefined,
              weatherStatus:
                latest?.weatherCondition?.weatherStatus ?? undefined,
            },
          ),
        },
      },
      include: {
        airQuality: true,
        disasterRisk: true,
        heatRisk: true,
        weatherCondition: true,
        noiseEstimation: true,
        scoreDetail: true,
        recommendations: true,
      },
    });

    this.refreshCache(userId);
    return created;
  }

  public refreshCache(userId: string) {
    const removed = moduleCache.deleteByPrefix(`snapshot:${userId}:`);
    moduleCache.deleteByPrefix(`score:${userId}:`);
    moduleCache.deleteByPrefix(`recommendation:${userId}:`);
    moduleCache.deleteByPrefix(`insight:${userId}:`);
    return removed;
  }

  private async resolveLocationId(userId: string, locationId?: string) {
    if (locationId) {
      const direct = await prisma.userLocation.findFirst({
        where: {
          id: locationId,
          userId,
        },
        select: {
          id: true,
        },
      });

      if (!direct) {
        throw new Error("Location not found");
      }

      return direct.id;
    }

    const latestLocation = await prisma.userLocation.findFirst({
      where: {
        userId,
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
      },
    });

    if (!latestLocation) {
      throw new Error("No location found for user");
    }

    return latestLocation.id;
  }
}

export default new SnapshotService();
