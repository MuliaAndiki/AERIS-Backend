import { AppContext } from "@/contex/appContex";
import { HttpResponse, ErrorHandling } from "@/contex/error";
import MapProvinder from "@/providers/map.provider";
import prisma from "prisma/client";
import { environmentCache } from "@/modules/environment/environment.cache";
import { ENV_CACHE_TTL } from "@/modules/environment/environment.cache-policy";

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

      const { latitude, city, country, longitude, state } = locationQuery;

      const cacheKey = ["weather", c.user.id, latitude, longitude].join(":");

      const weather = await environmentCache.getOrSet(
        cacheKey,
        ENV_CACHE_TTL.WEATHER_MS,
        () => MapProvinder.weater.getWeather(latitude, longitude, c),
      );

      if (!weather) {
        return HttpResponse(c).badGateway("Weather API unreachable");
      }

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
