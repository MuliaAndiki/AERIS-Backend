import { AppContext } from "@/contex/appContex";
import { ErrorHandling, HttpResponse } from "@/contex/error";
import prisma from "prisma/client";
import MapProvinder from "@/providers/map.provider";

class GreenSpaceService {
  public async getGreenSpace(c: AppContext) {
    try {
      if (!c.user?.id) {
        return HttpResponse(c).unauthorized();
      }

      const locationQuery = await prisma.userLocation.findFirst({
        where: {
          userId: c.user.id,
        },
        select: {
          latitude: true,
          city: true,
          longitude: true,
          radius: true,
        },
      });

      if (!locationQuery) {
        return HttpResponse(c).badGateway();
      }

      const { latitude, longitude, radius } = locationQuery;

      const greenSpace = await MapProvinder.greenSpace.getGreenSpace(
        latitude,
        longitude,
        radius,
        c,
      );

      if (!greenSpace) {
        return HttpResponse(c).badRequest();
      }

      return { greenSpace };
    } catch (error) {
      return ErrorHandling(c, error);
    }
  }
}

export default new GreenSpaceService();
