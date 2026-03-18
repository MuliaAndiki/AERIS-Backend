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
      current: "temperature_2m,relative_humidity_2m,weather_code",
      timezone: "auto",
    },
  });

  const disasterRisk: AxiosInstance = axios.create({
    baseURL: "https://thinkhazard.org/en",
    timeout: 10000,
    timeoutErrorMessage: "floodRisk url Error",
  });
  const greenSpace: AxiosInstance = axios.create({
    baseURL: "https://overpass-api.de/api",
    timeout: 15000,
    timeoutErrorMessage: "greenSpace url Error",
  });
  const noise: AxiosInstance = axios.create({
    baseURL: "#",
    timeout: 10000,
    timeoutErrorMessage: "noise url Error",
  });
  return { airQuality, disasterRisk, greenSpace, noise, weather };
}
