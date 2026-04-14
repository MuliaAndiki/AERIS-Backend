import { AppContext } from "@/context/appContext";
import { ErrorHandling, HttpResponse } from "@/context/error";
import { AxiosEnvironment } from "@/utils/axios";

class DisasterRiskProvider {
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

export default new DisasterRiskProvider();
