import { AxiosEnvironment } from "@/utils/axios";
import { AppContext } from "@/context/appContext";

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
      // Validate parameters - if any are empty/null, prioritize coordinates
      const hasValidCity = city && typeof city === "string" && city.trim();
      const hasValidState = state && typeof state === "string" && state.trim();
      const hasValidCountry =
        country && typeof country === "string" && country.trim();

      // API Ninjas requires at least city+country or valid coordinates
      if (!hasValidCity || !hasValidCountry) {
        console.warn(
          `[AirQuality] Invalid parameters detected. City: "${city}", Country: "${country}". Using coordinates only.`,
        );
        // Fallback: use coordinates without city parameters
        const { airQuality } = AxiosEnvironment({
          lat,
          lon,
        });
        const response = await airQuality.get("/airquality");

        if (!response) {
          console.warn(
            `[AirQuality] No response from API Ninjas at lat:${lat}, lon:${lon}`,
          );
          return { results: [{ aqi: 50 }] };
        }
        return response.data;
      }

      // Normal path: use city/country parameters
      const { airQuality } = AxiosEnvironment({
        city: city.trim(),
        country: country.trim(),
        lat,
        lon,
        state: hasValidState ? state.trim() : undefined,
      });

      const response = await airQuality.get("/airquality");

      if (!response) {
        console.warn(
          `[AirQuality] No response from API Ninjas at lat:${lat}, lon:${lon}`,
        );
        return { results: [{ aqi: 50 }] };
      }
      return response.data;
    } catch (error) {
      console.error(
        `[AirQuality] Error fetching from API Ninjas at (${lat}, ${lon}):`,
        error instanceof Error ? error.message : error,
      );
      return { results: [{ aqi: 50 }] }; // Moderate air quality default on error
    }
  }
}

export default new AirQualityProvider();
