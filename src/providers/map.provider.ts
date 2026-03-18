import WeatherProvider from "./env/weather.provider";
import AirQualityProvider from "./env/air-quality.provider";
import DisasterProvinder from "./env/disaster-risk.provinder";
import GreenSpaceProvinder from "./env/green-space.provinder";
class MapProvider {
  weater = WeatherProvider;
  airQuality = AirQualityProvider;
  disaster = DisasterProvinder;
  greenSpace = GreenSpaceProvinder;
}

export default new MapProvider();
