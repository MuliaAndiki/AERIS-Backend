import axios, { AxiosInstance } from "axios";
import { env } from "@/config/env";
interface Coordinates {
  lat?: number;
  lon?: number;
  city?: string;
  state?: string;
  country?: string;
}

export function AxiosEnvironment({
  lat,
  lon,
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
    baseURL:
      "https://api.geoapify.com/v2/places?categories=commercial.supermarket&filter=rect%3A10.716463143326969%2C48.755151258420966%2C10.835314015356737%2C48.680903341613316&limit=20&apiKey=267b00bb922f44e5b920b71912119f0e",
    timeout: 30000,
    timeoutErrorMessage: "greenSpace url Error",
    params: {
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
