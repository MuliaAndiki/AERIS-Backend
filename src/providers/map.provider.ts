import WeatherProvider from "./env/weather.provider";
import AirQualityProvider from "./env/air-quality.provider";
import DisasterProvider from "./env/disaster-risk.provider";
import GreenSpaceProvider from "./env/green-space.provider";
import NoiseProvider from "./env/noise.provider";
class MapProvider {
  weather = WeatherProvider;
  airQuality = AirQualityProvider;
  disaster = DisasterProvider;
  greenSpace = GreenSpaceProvider;
  noise = NoiseProvider;
}

export default new MapProvider();
