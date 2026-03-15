import axios, { AxiosInstance } from "axios";

export function AxiosEnvironment() {
  const airQuality: AxiosInstance = axios.create({
    baseURL: "#",
    timeout: 10000,
    timeoutErrorMessage: "airQuality url Error",
  });
  const floodRisk: AxiosInstance = axios.create({
    baseURL: "#",
    timeout: 10000,
    timeoutErrorMessage: "floodRisk url Error",
  });
  const greenSpace: AxiosInstance = axios.create({
    baseURL: "#",
    timeout: 10000,
    timeoutErrorMessage: "greenSpace url Error",
  });
  const noise: AxiosInstance = axios.create({
    baseURL: "#",
    timeout: 10000,
    timeoutErrorMessage: "noise url Error",
  });
  return { airQuality, floodRisk, greenSpace, noise };
}
