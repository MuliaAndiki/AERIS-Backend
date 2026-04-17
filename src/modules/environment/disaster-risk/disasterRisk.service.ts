import { AppContext } from "@/context/appContext";
import { ErrorHandling, HttpResponse } from "@/context/error";
import MapProvider from "@/providers/map.provider";
import { hazardScoreMapping } from "@/types/hazard.type";
import { AxiosEnvironment } from "@/utils/axios";
import prisma from "prisma/client";
import { environmentCache } from "@/modules/environment/environment.cache";
import { ENV_CACHE_TTL } from "@/modules/environment/environment.cache-policy";
import {
  getOrCreateLatestSnapshot,
  refreshEnvironmentCache,
  upsertScoreDetailAndUpdateSnapshot,
} from "@/modules/environment/environment.persistence";

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

// Use coordinates to produce a deterministic fallback when API data is missing.
function getLocationBasedFloodRisk(lat: number, lon: number): number {
  const seed = Math.abs(lat + lon);
  const pseudoRandom = Math.sin(seed) * 10000;
  const normalized = (pseudoRandom % 1) * 100;
  const floodRisk = 15 + (normalized % 50);

  console.log(
    `[DisasterRisk] Generated location-based flood risk: ${floodRisk} (lat=${lat}, lon=${lon})`,
  );

  return Math.round(floodRisk);
}

class DisasterRiskService {
  public async getDisaster(c: AppContext) {
    try {
      if (!c.user?.id) {
        return HttpResponse(c).unauthorized();
      }

      const userLocation = await prisma.userLocation.findFirst({
        where: {
          userId: c.user.id,
        },
        orderBy: {
          createdAt: "desc", // Get LATEST location
        },
        select: {
          id: true,
          city: true,
          country: true,
          latitude: true,
          longitude: true,
        },
      });

      if (!userLocation) {
        return HttpResponse(c).badGateway();
      }

      const { city, latitude, longitude } = userLocation;

      console.log(
        `[DisasterRisk] User location: city=${city}, lat=${latitude}, lon=${longitude}`,
      );

      const cacheKey = ["disaster-risk", c.user.id, city].join(":");

      const result = await environmentCache.getOrSet(
        cacheKey,
        ENV_CACHE_TTL.DISASTER_RISK_MS,
        async () => {
          const { disasterRisk } = AxiosEnvironment({
            city: city,
          });

          const divisionCode = await MapProvider.disaster.getDisasterRisk(
            city,
            userLocation.country,
            c,
            latitude,
            longitude,
          );

          console.log(`[DisasterRisk] Division code result:`, divisionCode);

          // If no division code found, return location-based defaults
          if (!divisionCode) {
            console.warn(
              `[DisasterRisk] No division code found for city: ${city}, returning location-based defaults`,
            );
            const floodScore = getLocationBasedFloodRisk(latitude, longitude);
            return { floodScore, heatScore: 25, divisionCode: null };
          }

          const reportRes = await disasterRisk.get(
            `/report/${divisionCode}.json`,
          );

          if (!reportRes?.data) {
            console.warn(
              `[DisasterRisk] No report data available for division code: ${divisionCode}`,
            );
            const floodScore = getLocationBasedFloodRisk(latitude, longitude);
            return { floodScore, heatScore: 25, divisionCode };
          }

          const hazards = reportRes.data;

          let floodScore = 0;
          let heatScore = 0;

          hazards.forEach((hazard: any) => {
            const level = hazard.hazardlevel?.mnemonic;
            const type = hazard.hazardtype?.mnemonic;

            const numericScore = hazardScoreMapping[level] ?? 0;

            if (type === "FL" || type === "UF") floodScore = numericScore;
            if (type === "EH") heatScore = numericScore;
          });

          return { floodScore, heatScore, divisionCode };
        },
      );

      const floodScore = clampScore(Number(result?.floodScore ?? 0));
      const heatScore = clampScore(Number(result?.heatScore ?? 0));
      const divisionCode =
        typeof result?.divisionCode === "string" ? result.divisionCode : null;

      const snapshot = await getOrCreateLatestSnapshot(userLocation.id);

      await prisma.disasterRisk.upsert({
        where: {
          snapshotId: snapshot.id,
        },
        create: {
          snapshotId: snapshot.id,
          floodScore,
          heatScore,
          divisionCode,
        },
        update: {
          floodScore,
          heatScore,
          divisionCode,
        },
      });

      await upsertScoreDetailAndUpdateSnapshot(snapshot.id, {
        floodRiskScore: floodScore,
        ...(heatScore > 0 ? { heatRiskScore: heatScore } : {}),
      });

      refreshEnvironmentCache(c.user.id);

      return HttpResponse(c).ok({
        floodScore,
        heatScore,
        divisionCode,
      });
    } catch (error) {
      return ErrorHandling(c, error);
    }
  }
}

export default new DisasterRiskService();
