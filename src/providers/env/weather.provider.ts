import { AxiosEnvironment } from "@/utils/axios";
import { HttpResponse, ErrorHandling } from "@/contex/error";
import { AppContext } from "@/contex/appContex";
class WeatherProvider {
  public async getWeather(lat: number, lon: number, c: AppContext) {
    try {
      const { weather } = AxiosEnvironment({ lat, lon });

      const respone = await weather.get("/forecast");

      if (!respone) {
        return HttpResponse(c).badGateway();
      }
      // audit respone disini
      return respone.data;
    } catch (error) {
      return ErrorHandling(c, error);
    }
  }
}

export default new WeatherProvider();
