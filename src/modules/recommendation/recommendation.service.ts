import prisma from "prisma/client";
import {
  DailyRecommendationSummary,
  RecommendationItem,
} from "@/modules/recommendation/recommendation.types";
import { MODULE_CACHE_TTL } from "@/modules/cache/cache-policy";
import { moduleCache } from "@/modules/cache/module-cache";

class RecommendationService {
  public async getRecommendations(userId: string, snapshotId?: string) {
    const cacheKey = [
      "recommendation",
      userId,
      "list",
      snapshotId ?? "latest",
    ].join(":");

    return moduleCache.getOrSet(
      cacheKey,
      MODULE_CACHE_TTL.RECOMMENDATION_MS,
      async () => {
        const snapshot = await this.getSnapshotForUser(userId, snapshotId);

        return snapshot.recommendations.map(
          (item): RecommendationItem => ({
            id: item.id,
            recommendationType: item.recommendationType,
            message: item.message,
            severity: item.severity,
          }),
        );
      },
    );
  }

  public async getDailyRecommendations(
    userId: string,
  ): Promise<DailyRecommendationSummary> {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const cacheKey = [
      "recommendation",
      userId,
      "daily",
      todayStart.toISOString().slice(0, 10),
    ].join(":");

    return moduleCache.getOrSet(
      cacheKey,
      MODULE_CACHE_TTL.RECOMMENDATION_MS,
      async () => {
        const recommendations = await prisma.recommendation.findMany({
          where: {
            snapshot: {
              location: {
                userId,
              },
              snapshotTime: {
                gte: todayStart,
              },
            },
          },
          orderBy: {
            severity: "desc",
          },
          select: {
            id: true,
            recommendationType: true,
            message: true,
            severity: true,
          },
        });

        // If no recommendations exist, generate fallback recommendations based on latest snapshot
        if (recommendations.length === 0) {
          const latestSnapshot = await prisma.environmentalSnapshot.findFirst({
            where: {
              location: {
                userId,
              },
            },
            orderBy: {
              snapshotTime: "desc",
            },
            include: {
              scoreDetail: true,
            },
          });

          if (latestSnapshot?.scoreDetail) {
            const detail = latestSnapshot.scoreDetail;
            const score =
              (detail.airQualityScore +
                detail.heatRiskScore +
                detail.floodRiskScore +
                detail.noiseScore +
                detail.greenSpaceScore) /
              5;

            const fallbackRecommendations = [
              {
                id: "fallback-1",
                recommendationType: "general",
                message:
                  score > 70
                    ? "Good environmental conditions today. Great time for outdoor activities!"
                    : score > 50
                      ? "Environmental conditions are moderate. Monitor changes throughout the day."
                      : "Environmental conditions are poor today. Plan activities accordingly.",
                severity: score > 70 ? 1 : score > 50 ? 2 : 3,
              },
            ];

            return {
              date: todayStart.toISOString().slice(0, 10),
              total: fallbackRecommendations.length,
              items: fallbackRecommendations as any,
            };
          }
        }

        return {
          date: todayStart.toISOString().slice(0, 10),
          total: recommendations.length,
          items: recommendations,
        };
      },
    );
  }

  public refreshCache(userId: string) {
    return moduleCache.deleteByPrefix(`recommendation:${userId}:`);
  }

  private async getSnapshotForUser(userId: string, snapshotId?: string) {
    if (snapshotId) {
      const byId = await prisma.environmentalSnapshot.findFirst({
        where: {
          id: snapshotId,
          location: {
            userId,
          },
        },
        include: {
          recommendations: true,
        },
      });

      if (!byId) {
        throw new Error("Snapshot not found");
      }

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
        recommendations: true,
      },
    });

    if (!latest) {
      throw new Error("No snapshot found");
    }

    return latest;
  }
}

export default new RecommendationService();
