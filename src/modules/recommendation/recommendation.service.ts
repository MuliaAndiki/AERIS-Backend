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
