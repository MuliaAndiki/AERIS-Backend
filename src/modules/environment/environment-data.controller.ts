import { AppContext } from "@/context/appContext";
import airQualityService from "@/modules/environment/air-quality/airQuality.service";
import weatherService from "@/modules/environment/weather/weather.service";
import disasterRiskService from "@/modules/environment/disaster-risk/disasterRisk.service";
import greenSpaceService from "@/modules/environment/green-space/greenSpace.service";
import heatRiskService from "@/modules/environment/heat-risk/heatRisk.service";
import noiseService from "@/modules/environment/noise/noise.service";

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

  public getHeatRisk(c: AppContext) {
    return heatRiskService.getHeatRisk(c);
  }

  public getNoise(c: AppContext) {
    return noiseService.getNoise(c);
  }

  public getGreenSpace(c: AppContext) {
    return greenSpaceService.getGreenSpace(c);
  }

  public getGreenSpaceReviews(c: AppContext) {
    return greenSpaceService.getGreenSpaceReviews(c);
  }

  public getGreenAreaDetail(c: AppContext) {
    return greenSpaceService.getGreenAreaDetail(c);
  }

  public createGreenSpaceReview(c: AppContext) {
    return greenSpaceService.createGreenSpaceReview(c);
  }

  public updateGreenSpaceReview(c: AppContext) {
    return greenSpaceService.updateGreenSpaceReview(c);
  }

  public deleteGreenSpaceReview(c: AppContext) {
    return greenSpaceService.deleteGreenSpaceReview(c);
  }

  public moderateGreenSpaceReview(c: AppContext) {
    return greenSpaceService.moderateGreenSpaceReview(c);
  }
}

export default new EnvironmentDataController();
