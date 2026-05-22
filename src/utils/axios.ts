import axios, { AxiosInstance } from "axios";
import { env } from "@/config/env";
interface Coordinates {
  lat?: number;
  lon?: number;
  radius?: number;
  city?: string;
  state?: string;
  country?: string;
}

export function AxiosEnvironment({
  lat,
  lon,
  radius,
  city,
  country,
  state,
}: Coordinates) {
  const airQuality: AxiosInstance = axios.create({
    baseURL: "https://api.api-ninjas.com/v1",
    timeout: 10000,
    timeoutErrorMessage: "airQuality url Error",
    headers: {
      "X-Api-Key": env.API_NINJA,
    },
    params: {
      city: city,
      country: country,
      state: state,
      latitude: lat,
      longitude: lon,
    },
  });

  const weather: AxiosInstance = axios.create({
    baseURL: "https://api.open-meteo.com/v1",
    timeout: 10000,
    timeoutErrorMessage: "Weater url Error",
    params: {
      latitude: lat,
      longitude: lon,
      current:
        "temperature_2m,relative_humidity_2m,weather_code,apparent_temperature",
      timezone: "auto",
    },
  });

  const disasterRisk: AxiosInstance = axios.create({
    baseURL: "https://thinkhazard.org/en",
    timeout: 10000,
    timeoutErrorMessage: "floodRisk url Error",
  });
  const greenSpace: AxiosInstance = axios.create({
    baseURL: "https://api.geoapify.com/v2/places",
    timeout: 30000,
    timeoutErrorMessage: "greenSpace url Error",
    params: {
      categories: "leisure.park,leisure.park.garden,national_park",
      filter: `circle:${lon ?? 0},${lat ?? 0},${radius ?? 1000}`,
      bias: `proximity:${lon ?? 0},${lat ?? 0}`,
      limit: 50,
      apiKey: env.GEOAPIFY,
    },
  });
  const noise: AxiosInstance = axios.create({
    baseURL: "https://overpass-api.de/api",
    timeout: 20000,
    timeoutErrorMessage: "noise url Error",
  });

  return { airQuality, disasterRisk, greenSpace, noise, weather };
}
