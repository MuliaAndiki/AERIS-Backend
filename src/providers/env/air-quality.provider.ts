import { AxiosEnvironment } from "@/utils/axios";
import { HttpResponse, ErrorHandling } from "@/contex/error";
import { AppContext } from "@/contex/appContex";
class AirQualityProvider {
  public async getAirQuality(
    lat: number,
    lon: number,
    city: string,
    state: string,
    country: string,
    c: AppContext,
  ) {
    try {
      const { airQuality } = AxiosEnvironment({
        city,
        country,
        lat,
        lon,
        state,
      });

      const respone = await airQuality.get("/airquality");

      if (!respone) {
        return HttpResponse(c).badGateway();
      }
      return respone.data;
    } catch (error) {
      return ErrorHandling(c, error);
    }
  }
}

export default new AirQualityProvider();
