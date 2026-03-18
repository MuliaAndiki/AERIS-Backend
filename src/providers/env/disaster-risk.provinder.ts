import { AppContext } from "@/contex/appContex";
import { ErrorHandling, HttpResponse } from "@/contex/error";
import { AxiosEnvironment } from "@/utils/axios";

class DisasterRiskProvinder {
  public async getDisasterRisk(cityName: string, c: AppContext) {
    try {
      const { disasterRisk } = AxiosEnvironment({
        city: cityName,
      });
      const searcRes = await disasterRisk.get(`/search.json?q=${cityName}`);
      const divisionCode = searcRes.data[0]?.id;
      if (!divisionCode) {
        return HttpResponse(c).badRequest;
      }

      return divisionCode;
    } catch (error) {
      return ErrorHandling(c, error);
    }
  }
}

export default new DisasterRiskProvinder();
