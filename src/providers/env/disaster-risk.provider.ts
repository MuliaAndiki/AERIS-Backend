import { AxiosEnvironment } from "@/utils/axios";
import { AppContext } from "@/context/appContext";
import axios from "axios";

class DisasterRiskProvider {
  public async getDisasterRisk(
    cityName: string,
    country?: string,
    c?: AppContext,
    lat?: number,
    lon?: number,
  ) {
    try {
      const searchNames = [cityName];
      if (country) {
        searchNames.push(`${cityName}, ${country}`);
      }

      const { disasterRisk } = AxiosEnvironment({
        city: cityName,
      });

      // Try lookup by city name first - handle 404 gracefully
      let divisionCode: string | undefined;
      for (const searchName of searchNames) {
        try {
          const searchRes = await disasterRisk.get(
            `/search.json?q=${encodeURIComponent(searchName)}`,
          );
          divisionCode = searchRes.data[0]?.id;
          if (divisionCode) {
            break;
          }
        } catch (searchError: any) {
          if (searchError?.response?.status === 404) {
            console.warn(
              `[DisasterRisk] City "${searchName}" not found in ThinkHazard API (404)`,
            );
          } else {
            throw searchError;
          }
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
            const reverseSearchNames = [englishCity];
            if (country) {
              reverseSearchNames.push(`${englishCity}, ${country}`);
            }
            for (const searchName of reverseSearchNames) {
              try {
                const searchRes = await disasterRisk.get(
                  `/search.json?q=${encodeURIComponent(searchName)}`,
                );
                divisionCode = searchRes.data[0]?.id;
                if (divisionCode) {
                  break;
                }
              } catch (reverseSearchError: any) {
                if (reverseSearchError?.response?.status === 404) {
                  console.warn(
                    `[DisasterRisk] Translated city "${searchName}" also not found (404)`,
                  );
                }
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
