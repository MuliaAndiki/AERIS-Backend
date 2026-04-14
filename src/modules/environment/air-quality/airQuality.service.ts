import { AppContext } from "@/context/appContext";
import { ErrorHandling, HttpResponse } from "@/context/error";
import prisma from "prisma/client";
import MapProvider from "@/providers/map.provider";
import { environmentCache } from "@/modules/environment/environment.cache";
import { ENV_CACHE_TTL } from "@/modules/environment/environment.cache-policy";
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
        latitude,
        longitude,
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
            country,
            state,
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

      return { airQuality };
    } catch (error) {
      return ErrorHandling(c, error);
    }
  }
}

export default new AirQualityService();
