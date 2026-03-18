import { AppContext } from "@/contex/appContex";
import { ErrorHandling, HttpResponse } from "@/contex/error";
import MapProvinder from "@/providers/map.provider";
import { hazardScoreMapping } from "@/types/harzard.type";
import { AxiosEnvironment } from "@/utils/axios";
import prisma from "prisma/client";

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
        select: {
          city: true,
        },
      });

      if (!userLocation) {
        return HttpResponse(c).badGateway();
      }

      const { city } = userLocation;

      const { disasterRisk } = AxiosEnvironment({
        city: city,
      });

      const divisionCode = await MapProvinder.disaster.getDisasterRisk(city, c);

      if (!divisionCode) {
        return HttpResponse(c).badRequest();
      }

      const reportRes = await disasterRisk.get(`/report/${divisionCode}.json`);

      if (!reportRes) {
        return HttpResponse(c).badRequest();
      }

      const hazards = reportRes.data;

      let floodScore = 0;
      let heatScore = 0;

      hazards.forEach((hazard: any) => {
        const level = hazard.hazardlevel.mnemonic;
        const type = hazard.hazardtype.mnemonic;

        const numericScore = hazardScoreMapping[level] || 0;

        if (type === "FL" || type === "UF") floodScore = numericScore;
        if (type === "EH") heatScore = numericScore;
      });
      return { floodScore, heatScore };
    } catch (error) {
      return ErrorHandling(c, error);
    }
  }
}

export default new DisasterRiskService();
