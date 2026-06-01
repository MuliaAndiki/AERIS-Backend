import { AppContext } from "@/context/appContext";
import { ErrorHandling, HttpResponse } from "@/context/error";
import prisma from "prisma/client";
import MapProvider from "@/providers/map.provider";
import { environmentCache } from "@/modules/environment/environment.cache";
import { ENV_CACHE_TTL } from "@/modules/environment/environment.cache-policy";
import { roundCoord } from "@/utils/cache-key";
import {
  getOrCreateLatestSnapshot,
  refreshEnvironmentCache,
  upsertScoreDetailAndUpdateSnapshot,
} from "@/modules/environment/environment.persistence";

const FALLBACK_AQI = 50;

function toFiniteNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  return null;
}

function normalizeAqiResult(payload: unknown): Record<string, unknown> {
  if (Array.isArray(payload) && payload.length > 0) {
    const first = payload[0];
    return typeof first === "object" && first !== null
      ? (first as Record<string, unknown>)
      : {};
  }

  if (typeof payload !== "object" || payload === null) {
    return {};
  }

  const result = payload as Record<string, unknown>;
  const nestedResults = result.results;
  if (Array.isArray(nestedResults) && nestedResults.length > 0) {
    const first = nestedResults[0];
    if (typeof first === "object" && first !== null) {
      return first as Record<string, unknown>;
    }
  }

  return result;
}

function resolveAqiValue(data: Record<string, unknown>) {
  const candidates = [data.overall_aqi, data.aqi, data.AQI];
  for (const candidate of candidates) {
    const value = toFiniteNumber(candidate);
    if (value !== null) {
      return Math.max(0, Math.round(value));
    }
  }

  return FALLBACK_AQI;
}

function resolvePollutantValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value !== "object" || value === null) {
    return null;
  }

  const source = value as Record<string, unknown>;
  const candidates = [
    source.concentration,
    source.value,
    source.aqi,
    source.index,
  ];

  for (const candidate of candidates) {
    const numeric = toFiniteNumber(candidate);
    if (numeric !== null) {
      return numeric;
    }
  }

  return null;
}

function resolveDominantPollutant(data: Record<string, unknown>) {
  const keys = ["pm2_5", "pm10", "co", "no2", "so2", "o3"];
  let dominant = "pm2_5";
  let maxValue = Number.NEGATIVE_INFINITY;

  for (const key of keys) {
    const value = resolvePollutantValue(data[key]);
    if (value === null) {
      continue;
    }

    if (value > maxValue) {
      maxValue = value;
      dominant = key;
    }
  }

  return dominant;
}

function resolveCategory(aqi: number) {
  if (aqi <= 50) return "Good";
  if (aqi <= 100) return "Moderate";
  if (aqi <= 150) return "Unhealthy for Sensitive Groups";
  if (aqi <= 200) return "Unhealthy";
  if (aqi <= 300) return "Very Unhealthy";
  return "Hazardous";
}

function resolveAirQualityScore(aqi: number) {
  if (aqi <= 50) return 95;
  if (aqi <= 100) return 80;
  if (aqi <= 150) return 60;
  if (aqi <= 200) return 40;
  if (aqi <= 300) return 20;
  return 5;
}

class AirQualityService {
  public async getAirQuality(c: AppContext) {
    try {
      if (!c.user?.id) {
        return HttpResponse(c).unauthorized("Unauthorized");
      }

      const locationQuery = await prisma.userLocation.findFirst({
        where: {
          userId: c.user?.id,
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
          state: true,
        },
      });
      if (!locationQuery) {
        return HttpResponse(c).badRequest();
      }

      const { latitude, city, country, state, longitude } = locationQuery;

      console.log(
        `[AirQuality] User location: city=${city}, lat=${latitude}, lon=${longitude}`,
      );

      const cacheKey = [
        "air-quality",
        c.user.id,
        roundCoord(latitude),
        roundCoord(longitude),
        city,
        state,
        country,
      ].join(":");

      const airQuality = await environmentCache.getOrSet(
        cacheKey,
        ENV_CACHE_TTL.AIR_QUALITY_MS,
        () =>
          MapProvider.airQuality.getAirQuality(
            latitude,
            longitude,
            city,
            state,
            country,
            c,
          ),
      );

      console.log(
        `[AirQuality] API Response:`,
        JSON.stringify(airQuality).substring(0, 300),
      );

      if (!airQuality) {
        return HttpResponse(c).badGateway();
      }

      const normalizedAqi = normalizeAqiResult(airQuality);
      const aqi = resolveAqiValue(normalizedAqi);
      const category = resolveCategory(aqi);
      const dominantPollutant = resolveDominantPollutant(normalizedAqi);

      const snapshot = await getOrCreateLatestSnapshot(locationQuery.id);

      await prisma.airQuality.upsert({
        where: {
          snapshotId: snapshot.id,
        },
        create: {
          snapshotId: snapshot.id,
          aqi,
          category,
          dominantPollutant,
        },
        update: {
          aqi,
          category,
          dominantPollutant,
        },
      });

      await upsertScoreDetailAndUpdateSnapshot(snapshot.id, {
        airQualityScore: resolveAirQualityScore(aqi),
      });

      refreshEnvironmentCache(c.user.id);

      return { airQuality };
    } catch (error) {
      return ErrorHandling(c, error);
    }
  }
}

export default new AirQualityService();
