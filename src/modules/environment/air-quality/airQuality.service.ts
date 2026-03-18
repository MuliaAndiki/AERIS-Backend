import { AppContext } from "@/contex/appContex";
import { ErrorHandling, HttpResponse } from "@/contex/error";
import prisma from "prisma/client";
import MapProvinder from "@/providers/map.provider";
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

      const airQuality = await MapProvinder.airQuality.getAirQuality(
        latitude,
        longitude,
        city,
        country,
        state,
        c,
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
