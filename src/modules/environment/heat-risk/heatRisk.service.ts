import { AppContext } from "@/contex/appContex";
import { ErrorHandling, HttpResponse } from "@/contex/error";
import { moduleCache } from "@/modules/cache/module-cache";
import MapProvinder from "@/providers/map.provider";
import prisma from "prisma/client";

class HeatRiskService {
  public async getHeatRisk(c: AppContext) {
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

      const weatherData = await MapProvinder.weater.getWeather(
        userLocation.latitude,
        userLocation.longitude,
        c,
      );

      if (!weatherData || typeof weatherData !== "object") {
        return HttpResponse(c).badGateway("Weather API unreachable");
      }

      const feelsLike = Number(
        (weatherData as any)?.current?.apparent_temperature,
      );

      if (!Number.isFinite(feelsLike)) {
        return HttpResponse(c).badGateway(
          "Weather apparent_temperature is unavailable",
        );
      }

      let heatScore = 10;
      let level = "Low Risk";

      if (feelsLike >= 40) {
        heatScore = 100;
        level = "Bahaya Ekstrem";
      } else if (feelsLike >= 35) {
        heatScore = 80;
        level = "Bahaya";
      } else if (feelsLike >= 30) {
        heatScore = 50;
        level = "Waspada";
      }

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

      const scoreDetail = await prisma.environmentalScoreDetail.upsert({
        where: {
          snapshotId: snapshot.id,
        },
        create: {
          snapshotId: snapshot.id,
          airQualityScore: 60,
          heatRiskScore: heatScore,
          floodRiskScore: 60,
          noiseScore: 60,
          greenSpaceScore: 60,
        },
        update: {
          heatRiskScore: heatScore,
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
        feelsLike,
        heatScore,
        level,
        snapshotId: snapshot.id,
      });
    } catch (error) {
      return ErrorHandling(c, error);
    }
  }
}

export default new HeatRiskService();
