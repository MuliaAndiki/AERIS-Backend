import prisma from "prisma/client";
import { MODULE_CACHE_TTL } from "@/modules/cache/cache-policy";
import { moduleCache } from "@/modules/cache/module-cache";

class SnapshotService {
  /**
   * Generate contextual recommendations based on environmental scores
   */
  private generateRecommendations(
    airQualityScore: number,
    heatRiskScore: number,
    floodRiskScore: number,
    noiseScore: number,
    greenSpaceScore: number,
    environmentalScore: number,
  ) {
    const recommendations = [];

    // Air Quality Recommendations
    if (airQualityScore < 40) {
      recommendations.push({
        recommendationType: "health",
        message:
          "Air quality is poor. Consider staying indoors and wearing an N95 mask if you go outside.",
        severity: 3, // High severity
      });
    } else if (airQualityScore < 60) {
      recommendations.push({
        recommendationType: "health",
        message:
          "Air quality is moderate. Sensitive groups should limit outdoor activities.",
        severity: 2, // Medium
      });
    }

    // Heat Risk Recommendations
    if (heatRiskScore > 70) {
      recommendations.push({
        recommendationType: "safety",
        message:
          "High heat risk detected. Stay hydrated, wear light clothing, and avoid strenuous activities.",
        severity: 3, // High
      });
    } else if (heatRiskScore > 50) {
      recommendations.push({
        recommendationType: "safety",
        message:
          "Moderate heat today. Remember to drink plenty of water and use sunscreen.",
        severity: 2, // Medium
      });
    }

    // Flood Risk Recommendations
    if (floodRiskScore > 70) {
      recommendations.push({
        recommendationType: "warning",
        message:
          "High flood risk in this area. Avoid flooded areas and have an emergency plan ready.",
        severity: 3, // High
      });
    } else if (floodRiskScore > 50) {
      recommendations.push({
        recommendationType: "awareness",
        message: "Elevated flood risk. Stay alert and avoid low-lying areas.",
        severity: 2, // Medium
      });
    }

    // Noise Recommendations
    if (noiseScore > 70) {
      recommendations.push({
        recommendationType: "health",
        message:
          "High noise levels detected. Use noise-cancelling headphones or earplugs if sensitive to noise.",
        severity: 2, // Medium
      });
    }

    // Green Space Recommendations
    if (greenSpaceScore < 40) {
      recommendations.push({
        recommendationType: "wellness",
        message:
          "Limited green spaces nearby. Consider taking a short trip to a park for better air quality and mental health.",
        severity: 1, // Low
      });
    }

    // Overall Environmental Score Recommendations
    if (environmentalScore < 45) {
      recommendations.push({
        recommendationType: "general",
        message:
          "Overall environmental conditions are poor today. Plan activities accordingly and protect yourself.",
        severity: 3, // High
      });
    } else if (environmentalScore < 70) {
      recommendations.push({
        recommendationType: "general",
        message:
          "Environmental conditions are moderate. Monitor changes throughout the day.",
        severity: 2, // Medium
      });
    } else {
      recommendations.push({
        recommendationType: "general",
        message:
          "Good environmental conditions today. Great time for outdoor activities!",
        severity: 1, // Low
      });
    }

    // Return at least 3-5 recommendations
    return recommendations.slice(0, 5);
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
          include: {
            airQuality: true,
            weatherCondition: true,
            noiseEstimation: true,
            scoreDetail: true,
            recommendations: true,
            greenAccessScores: {
              include: {
                greenArea: true,
              },
            },
          },
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
          include: {
            airQuality: true,
            weatherCondition: true,
            noiseEstimation: true,
            scoreDetail: true,
            recommendations: true,
            greenAccessScores: {
              include: {
                greenArea: true,
              },
            },
          },
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
      include: {
        airQuality: true,
        weatherCondition: true,
        noiseEstimation: true,
        scoreDetail: true,
      },
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
          create: this.generateRecommendations(
            airQualityScore,
            heatRiskScore,
            floodRiskScore,
            noiseScore,
            greenSpaceScore,
            environmentalScore,
          ),
        },
      },
      include: {
        airQuality: true,
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
