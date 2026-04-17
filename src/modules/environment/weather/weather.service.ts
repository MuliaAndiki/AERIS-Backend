import { AppContext } from "@/context/appContext";
import { HttpResponse, ErrorHandling } from "@/context/error";
import MapProvider from "@/providers/map.provider";
import prisma from "prisma/client";
import { environmentCache } from "@/modules/environment/environment.cache";
import { ENV_CACHE_TTL } from "@/modules/environment/environment.cache-policy";
import {
  getOrCreateLatestSnapshot,
  refreshEnvironmentCache,
} from "@/modules/environment/environment.persistence";

function toNumber(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  return fallback;
}

function weatherCodeToStatus(code: number) {
  if (code === 0) return "Cerah";
  if (code >= 1 && code <= 3) return "Berawan";
  if (code === 45 || code === 48) return "Kabut";
  if (code >= 51 && code <= 57) return "Gerimis";
  if (code >= 61 && code <= 67) return "Hujan";
  if (code >= 71 && code <= 77) return "Salju";
  if (code >= 80 && code <= 86) return "Hujan Guyur";
  if (code >= 95) return "Badai Petir";
  return "Tidak diketahui";
}

class WeatherService {
  public async getWeather(c: AppContext) {
    try {
      if (!c.user?.id) {
        return HttpResponse(c).unauthorized("Unauthorized");
      }

      const locationQuery = await prisma.userLocation.findFirst({
        where: {
          userId: c.user?.id,
        },
        orderBy: {
          createdAt: "desc",
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

      const { latitude, city, country, longitude, state } = locationQuery;

      const cacheKey = ["weather", c.user.id, latitude, longitude].join(":");

      const weather = await environmentCache.getOrSet(
        cacheKey,
        ENV_CACHE_TTL.WEATHER_MS,
        () => MapProvider.weather.getWeather(latitude, longitude, c),
      );

      if (!weather) {
        return HttpResponse(c).badGateway("Weather API unreachable");
      }

      const weatherPayload =
        typeof weather === "object" && weather !== null
          ? (weather as Record<string, unknown>)
          : {};

      const current =
        typeof weatherPayload.current === "object" &&
        weatherPayload.current !== null
          ? (weatherPayload.current as Record<string, unknown>)
          : {};

      const temperature = toNumber(current.temperature_2m, 25);
      const humidity = toNumber(current.relative_humidity_2m, 50);
      const rainfall = toNumber(
        current.rain ?? current.rainfall ?? current.precipitation,
        0,
      );
      const weatherCode = toNumber(current.weather_code, 1);
      const weatherStatus = weatherCodeToStatus(Math.round(weatherCode));

      const snapshot = await getOrCreateLatestSnapshot(locationQuery.id);

      await prisma.weatherCondition.upsert({
        where: {
          snapshotId: snapshot.id,
        },
        create: {
          snapshotId: snapshot.id,
          temperature,
          humidity,
          rainfall,
          weatherStatus,
        },
        update: {
          temperature,
          humidity,
          rainfall,
          weatherStatus,
        },
      });

      refreshEnvironmentCache(c.user.id);

      const result = {
        state,
        city,
        country,
        ...weather,
      };
      return HttpResponse(c).ok(result);
    } catch (error) {
      return ErrorHandling(c, error);
    }
  }
}

export default new WeatherService();
