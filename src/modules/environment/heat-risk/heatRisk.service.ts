import { AppContext } from "@/context/appContext";
import { ErrorHandling, HttpResponse } from "@/context/error";
import MapProvider from "@/providers/map.provider";
import prisma from "prisma/client";
import {
  getOrCreateLatestSnapshot,
  refreshEnvironmentCache,
  upsertScoreDetailAndUpdateSnapshot,
} from "@/modules/environment/environment.persistence";

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

      const weatherData = await MapProvider.weather.getWeather(
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

      const snapshot = await getOrCreateLatestSnapshot(userLocation.id);

      await prisma.heatRisk.upsert({
        where: {
          snapshotId: snapshot.id,
        },
        create: {
          snapshotId: snapshot.id,
          feelsLike,
          heatRiskScore: heatScore,
          riskLevel: level,
        },
        update: {
          feelsLike,
          heatRiskScore: heatScore,
          riskLevel: level,
        },
      });

      await upsertScoreDetailAndUpdateSnapshot(snapshot.id, {
        heatRiskScore: heatScore,
      });

      refreshEnvironmentCache(c.user.id);

      return HttpResponse(c).ok({
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
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
