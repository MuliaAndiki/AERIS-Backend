import { ScoreBreakdown } from "@/modules/scoring/score.types";
import prisma from "prisma/client";
import { MODULE_CACHE_TTL } from "@/modules/cache/cache-policy";
import { moduleCache } from "@/modules/cache/module-cache";

export class ScoreService {
  calculateTotalScore(detail: ScoreBreakdown): number {
    const total =
      detail.airQualityScore +
      detail.heatRiskScore +
      detail.floodRiskScore +
      detail.noiseScore +
      detail.greenSpaceScore;

    return Math.max(0, Math.min(100, Math.round(total / 5)));
  }

  async getScore(userId: string, snapshotId?: string) {
    const cacheKey = ["score", userId, "summary", snapshotId ?? "latest"].join(
      ":",
    );

    return moduleCache.getOrSet(
      cacheKey,
      MODULE_CACHE_TTL.SCORE_MS,
      async () => {
        const snapshot = await this.resolveSnapshot(userId, snapshotId);

        return {
          snapshotId: snapshot.id,
          environmentalScore: snapshot.environmentalScore,
        };
      },
    );
  }

  async getScoreDetails(userId: string, snapshotId?: string) {
    const cacheKey = ["score", userId, "detail", snapshotId ?? "latest"].join(
      ":",
    );

    return moduleCache.getOrSet(
      cacheKey,
      MODULE_CACHE_TTL.SCORE_MS,
      async () => {
        const snapshot = await this.resolveSnapshot(userId, snapshotId);

        if (!snapshot.scoreDetail) {
          throw new Error("Score detail not found");
        }

        return snapshot.scoreDetail;
      },
    );
  }

  refreshCache(userId: string) {
    return moduleCache.deleteByPrefix(`score:${userId}:`);
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
          scoreDetail: true,
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
        scoreDetail: true,
      },
    });

    if (!latest) {
      throw new Error("No snapshot found");
    }

    return latest;
  }
}

export default new ScoreService();
