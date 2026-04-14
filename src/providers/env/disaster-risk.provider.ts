import { AxiosEnvironment } from "@/utils/axios";
import { AppContext } from "@/context/appContext";
import axios from "axios";

class DisasterRiskProvider {
  public async getDisasterRisk(
    cityName: string,
    c: AppContext,
    lat?: number,
    lon?: number,
  ) {
    try {
      const { disasterRisk } = AxiosEnvironment({
        city: cityName,
      });

      // Try lookup by city name first - handle 404 gracefully
      let divisionCode: string | undefined;
      try {
        let searchRes = await disasterRisk.get(`/search.json?q=${cityName}`);
        divisionCode = searchRes.data[0]?.id;
      } catch (searchError: any) {
        if (searchError?.response?.status === 404) {
          console.warn(
            `[DisasterRisk] City "${cityName}" not found in ThinkHazard API (404)`,
          );
        } else {
          throw searchError;
        }
      }

      // If city name lookup fails and we have coordinates, try reverse geocoding
      if (!divisionCode && lat && lon) {
        console.warn(
          `[DisasterRisk] City name lookup failed for "${cityName}", attempting reverse geocode...`,
        );
        try {
          // Use Nominatim reverse geocoding to get English city name
          const nominatimRes = await axios.get(
            `https://nominatim.openstreetmap.org/reverse`,
            {
              params: {
                lat,
                lon,
                format: "json",
              },
              timeout: 5000,
            },
          );

          const englishCity =
            nominatimRes.data?.address?.city ||
            nominatimRes.data?.address?.town ||
            nominatimRes.data?.address?.village ||
            cityName;

          if (englishCity !== cityName) {
            console.info(
              `[DisasterRisk] Reverse geocoded: "${cityName}" → "${englishCity}"`,
            );
            try {
              const searchRes = await disasterRisk.get(
                `/search.json?q=${englishCity}`,
              );
              divisionCode = searchRes.data[0]?.id;
            } catch (reverseSearchError: any) {
              if (reverseSearchError?.response?.status === 404) {
                console.warn(
                  `[DisasterRisk] Translated city "${englishCity}" also not found (404)`,
                );
              }
            }
          }
        } catch (reverseError) {
          console.warn(
            `[DisasterRisk] Reverse geocoding failed:`,
            reverseError instanceof Error ? reverseError.message : reverseError,
          );
        }
      }

      if (!divisionCode) {
        console.warn(
          `[DisasterRisk] No division code found for city: ${cityName}, using safe defaults`,
        );
        return 0; // Safe default (no disaster risk)
      }

      return divisionCode;
    } catch (error) {
      console.error(
        `[DisasterRisk] Error fetching disaster risk for ${cityName}:`,
        error instanceof Error ? error.message : error,
      );
      return 0; // Safe default (no disaster risk) on error
    }
  }
}

export default new DisasterRiskProvider();
