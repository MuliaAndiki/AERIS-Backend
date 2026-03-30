import WeatherProvider from "./env/weather.provider";
import AirQualityProvider from "./env/air-quality.provider";
import DisasterProvinder from "./env/disaster-risk.provinder";
import GreenSpaceProvinder from "./env/green-space.provinder";
import NoiseProvider from "./env/noise.provider";
class MapProvider {
  weater = WeatherProvider;
  airQuality = AirQualityProvider;
  disaster = DisasterProvinder;
  greenSpace = GreenSpaceProvinder;
  noise = NoiseProvider;
}

export default new MapProvider();
