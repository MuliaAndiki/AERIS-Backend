import { AppContext } from "@/context/appContext";
import { ErrorHandling, HttpResponse } from "@/context/error";
import { environmentCache } from "@/modules/environment/environment.cache";
import { ENV_CACHE_TTL } from "@/modules/environment/environment.cache-policy";
import { moduleCache } from "@/modules/cache/module-cache";
import MapProvider from "@/providers/map.provider";
import prisma from "prisma/client";

class NoiseService {
  public async getNoise(c: AppContext) {
    try {
      if (!c.user?.id) {
        return HttpResponse(c).unauthorized("Unauthorized");
      }

      const userLocation = await prisma.userLocation.findFirst({
        where: {
          userId: c.user.id,
        },
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          latitude: true,
          longitude: true,
          city: true,
          state: true,
          country: true,
        },
      });

      if (!userLocation) {
        return HttpResponse(c).badRequest("Location not found");
      }

      const cacheKey = [
        "noise-major-road-count",
        c.user.id,
        userLocation.latitude,
        userLocation.longitude,
      ].join(":");

      const majorRoadCount = await environmentCache.getOrSet(
        cacheKey,
        ENV_CACHE_TTL.NOISE_MS,
        () =>
          MapProvider.noise.getMajorRoadCount(
            userLocation.latitude,
            userLocation.longitude,
            c,
          ),
      );

      const roadDensityIndex = Math.max(0, Math.min(100, majorRoadCount * 15));
      const estimatedNoiseLevel = Math.max(
        35,
        Math.min(95, 35 + majorRoadCount * 8),
      );
      const noiseScore = Math.max(0, Math.min(100, roadDensityIndex));

      const latestSnapshot = await prisma.environmentalSnapshot.findFirst({
        where: {
          locationId: userLocation.id,
        },
        orderBy: {
          snapshotTime: "desc",
        },
        select: {
          id: true,
        },
      });

      const snapshot =
        latestSnapshot ??
        (await prisma.environmentalSnapshot.create({
          data: {
            locationId: userLocation.id,
            snapshotTime: new Date(),
            environmentalScore: 60,
          },
          select: {
            id: true,
          },
        }));

      await prisma.noiseEstimation.upsert({
        where: {
          snapshotId: snapshot.id,
        },
        create: {
          snapshotId: snapshot.id,
          roadDensityIndex,
          estimatedNoiseLevel,
        },
        update: {
          roadDensityIndex,
          estimatedNoiseLevel,
        },
      });

      const scoreDetail = await prisma.environmentalScoreDetail.upsert({
        where: {
          snapshotId: snapshot.id,
        },
        create: {
          snapshotId: snapshot.id,
          airQualityScore: 60,
          heatRiskScore: 60,
          floodRiskScore: 60,
          noiseScore,
          greenSpaceScore: 60,
        },
        update: {
          noiseScore,
        },
        select: {
          airQualityScore: true,
          heatRiskScore: true,
          floodRiskScore: true,
          noiseScore: true,
          greenSpaceScore: true,
        },
      });

      const environmentalScore = Math.round(
        (scoreDetail.airQualityScore +
          scoreDetail.heatRiskScore +
          scoreDetail.floodRiskScore +
          scoreDetail.noiseScore +
          scoreDetail.greenSpaceScore) /
          5,
      );

      await prisma.environmentalSnapshot.update({
        where: {
          id: snapshot.id,
        },
        data: {
          environmentalScore,
        },
      });

      moduleCache.deleteByPrefix(`snapshot:${c.user.id}:`);
      moduleCache.deleteByPrefix(`score:${c.user.id}:`);

      return HttpResponse(c).ok({
        state: userLocation.state,
        city: userLocation.city,
        country: userLocation.country,
        roadDensityIndex,
        estimatedNoiseLevel,
        majorRoadCount,
        noiseScore,
        snapshotId: snapshot.id,
      });
    } catch (error) {
      return ErrorHandling(c, error);
    }
  }
}

export default new NoiseService();
