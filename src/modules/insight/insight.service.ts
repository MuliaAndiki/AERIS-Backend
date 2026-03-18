import prisma from "prisma/client";
import { InsightSummary } from "@/modules/insight/insight.types";
import { MODULE_CACHE_TTL } from "@/modules/cache/cache-policy";
import { moduleCache } from "@/modules/cache/module-cache";

export class InsightService {
  async getInsights(
    userId: string,
    snapshotId?: string,
  ): Promise<InsightSummary[]> {
    const cacheKey = ["insight", userId, "list", snapshotId ?? "latest"].join(
      ":",
    );

    return moduleCache.getOrSet(
      cacheKey,
      MODULE_CACHE_TTL.INSIGHT_MS,
      async () => {
        const snapshot = await this.resolveSnapshot(userId, snapshotId);
        const insights: InsightSummary[] = [];

        if (snapshot.airQuality) {
          insights.push({
            snapshotId: snapshot.id,
            title: "Air Quality",
            message: `AQI is ${snapshot.airQuality.aqi} (${snapshot.airQuality.category}).`,
            severity:
              snapshot.airQuality.aqi > 150
                ? "high"
                : snapshot.airQuality.aqi > 80
                  ? "medium"
                  : "low",
          });
        }

        if (snapshot.weatherCondition) {
          insights.push({
            snapshotId: snapshot.id,
            title: "Weather",
            message: `Temperature ${snapshot.weatherCondition.temperature}°C with humidity ${snapshot.weatherCondition.humidity}%.`,
            severity:
              snapshot.weatherCondition.temperature >= 34 ? "high" : "low",
          });
        }

        if (snapshot.noiseEstimation) {
          insights.push({
            snapshotId: snapshot.id,
            title: "Noise",
            message: `Estimated environmental noise is ${snapshot.noiseEstimation.estimatedNoiseLevel} dB.`,
            severity:
              snapshot.noiseEstimation.estimatedNoiseLevel >= 75
                ? "high"
                : snapshot.noiseEstimation.estimatedNoiseLevel >= 60
                  ? "medium"
                  : "low",
          });
        }

        if (insights.length === 0) {
          insights.push({
            snapshotId: snapshot.id,
            title: "Insight",
            message:
              "Environmental data is available but not enough to build detailed insights.",
            severity: "low",
          });
        }

        return insights;
      },
    );
  }

  async generateDailySummary(userId: string): Promise<InsightSummary> {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const cacheKey = [
      "insight",
      userId,
      "daily",
      todayStart.toISOString().slice(0, 10),
    ].join(":");

    return moduleCache.getOrSet(
      cacheKey,
      MODULE_CACHE_TTL.INSIGHT_MS,
      async () => {
        const snapshots = await prisma.environmentalSnapshot.findMany({
          where: {
            location: {
              userId,
            },
            snapshotTime: {
              gte: todayStart,
            },
          },
          select: {
            environmentalScore: true,
          },
        });

        if (snapshots.length === 0) {
          return {
            date: todayStart.toISOString().slice(0, 10),
            title: "Daily Insight",
            message: "No snapshot generated today yet.",
            severity: "low",
          };
        }

        const avgScore = Math.round(
          snapshots.reduce((acc, curr) => acc + curr.environmentalScore, 0) /
            snapshots.length,
        );

        const severity: InsightSummary["severity"] =
          avgScore < 45 ? "high" : avgScore < 70 ? "medium" : "low";

        return {
          date: todayStart.toISOString().slice(0, 10),
          title: "Daily Insight",
          message: `Average environmental score today is ${avgScore}/100 from ${snapshots.length} snapshot(s).`,
          severity,
        };
      },
    );
  }

  refreshCache(userId: string) {
    return moduleCache.deleteByPrefix(`insight:${userId}:`);
  }

  private async resolveSnapshot(userId: string, snapshotId?: string) {
    if (snapshotId) {
      const byId = await prisma.environmentalSnapshot.findFirst({
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
        },
      });

      if (!byId) throw new Error("Snapshot not found");
      return byId;
    }

    const latest = await prisma.environmentalSnapshot.findFirst({
      where: {
        location: {
          userId,
        },
      },
      orderBy: {
        snapshotTime: "desc",
      },
      include: {
        airQuality: true,
        weatherCondition: true,
        noiseEstimation: true,
      },
    });

    if (!latest) throw new Error("No snapshot found");
    return latest;
  }
}

export default new InsightService();
