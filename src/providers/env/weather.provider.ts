import { AxiosEnvironment } from "@/utils/axios";
import { AppContext } from "@/context/appContext";
class WeatherProvider {
  public async getWeather(lat: number, lon: number, c: AppContext) {
    try {
      const { weather } = AxiosEnvironment({ lat, lon });

      const response = await weather.get("/forecast");

      if (!response) {
        console.warn(
          `[Weather] No response from Open-Meteo API at lat:${lat}, lon:${lon}`,
        );
        return {
          current: {
            temperature_2m: 25,
            relative_humidity_2m: 50,
            weather_code: 1,
            apparent_temperature: 24,
          },
        };
      }
      return response.data;
    } catch (error) {
      console.error(
        `[Weather] Error fetching from Open-Meteo at (${lat}, ${lon}):`,
        error instanceof Error ? error.message : error,
      );
      return {
        current: {
          temperature_2m: 25,
          relative_humidity_2m: 50,
          weather_code: 1,
          apparent_temperature: 24,
        },
      };
    }
  }
}

export default new WeatherProvider();
