import WeatherProvider from "./env/weather.provider";
import AirQualityProvider from "./env/air-quality.provider";
class MapProvider {
  weater = WeatherProvider;
  airQuality = AirQualityProvider;
}

export default new MapProvider();
