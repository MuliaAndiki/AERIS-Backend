import { AppContext } from "@/contex/appContex";
import airQualityService from "@/modules/environment/air-quality/airQuality.service";
import weatherService from "@/modules/environment/weather/weather.service";
import disasterRiskService from "@/modules/environment/disaster-risk/disasterRisk.service";
import greenSpaceService from "@/modules/environment/green-space/greenSpace.service";

class EnvironmentDataController {
  public getAirQuality(c: AppContext) {
    return airQualityService.getAirQuality(c);
  }

  public getWeather(c: AppContext) {
    return weatherService.getWeather(c);
  }

  public getDisasterRisk(c: AppContext) {
    return disasterRiskService.getDisaster(c);
  }

  public getGreenSpace(c: AppContext) {
    return greenSpaceService.getGreenSpace(c);
  }
}

export default new EnvironmentDataController();
