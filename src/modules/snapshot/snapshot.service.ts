import prisma from "prisma/client";
import { MODULE_CACHE_TTL } from "@/modules/cache/cache-policy";
import { moduleCache } from "@/modules/cache/module-cache";

class SnapshotService {
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
          create: [
            {
              recommendationType: "general",
              message: "Conditions are generally stable. Stay hydrated.",
              severity: 2,
            },
          ],
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
