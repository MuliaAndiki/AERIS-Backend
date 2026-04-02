import { describe, expect, it } from "bun:test";

import app from "@/app";

type EndpointCase = {
  method: string;
  path: string;
  body?: unknown;
  query?: Record<string, string>;
  authMode?: "none" | "invalid";
};

const endpointCases: EndpointCase[] = [
  { method: "GET", path: "/" },

  {
    method: "POST",
    path: "/api/auth/login",
    body: { email: "a@a.com", password: "x" },
  },
  {
    method: "POST",
    path: "/api/auth/register",
    body: { fullName: "Tester", email: "a@a.com", password: "x", role: "USER" },
  },
  { method: "POST", path: "/api/auth/logout", body: {}, authMode: "invalid" },
  {
    method: "POST",
    path: "/api/auth/forgot",
    body: { email: "invalid-email" },
  },
  {
    method: "POST",
    path: "/api/auth/verify-otp",
    body: { email: "invalid-email", otp: "123456" },
  },
  {
    method: "POST",
    path: "/api/auth/resend",
    body: { email: "invalid-email" },
  },
  {
    method: "POST",
    path: "/api/auth/reset-password",
    body: { email: "a@a.com", password: "x" },
  },

  { method: "GET", path: "/api/location/detect" },
  {
    method: "POST",
    path: "/api/location/resolve",
    body: {
      latitude: 1,
      longitude: 1,
      city: "A",
      state: "B",
      country: "C",
      radius: 500,
    },
    authMode: "invalid",
  },

  { method: "GET", path: "/api/environment/air-quality", authMode: "invalid" },
  { method: "GET", path: "/api/environment/weather", authMode: "invalid" },
  { method: "GET", path: "/api/environment/heat-risk", authMode: "invalid" },
  { method: "GET", path: "/api/environment/noise", authMode: "invalid" },
  {
    method: "GET",
    path: "/api/environment/disaster-risk",
    authMode: "invalid",
  },
  { method: "GET", path: "/api/environment/green-space", authMode: "invalid" },
  {
    method: "GET",
    path: "/api/environment/green-space/reviews",
    query: { greenAreaId: "test" },
    authMode: "invalid",
  },
  {
    method: "GET",
    path: "/api/environment/green-space/test",
    authMode: "invalid",
  },
  {
    method: "POST",
    path: "/api/environment/green-space/reviews",
    body: { greenAreaId: "test", rating: 5, comment: "ok" },
    authMode: "invalid",
  },
  {
    method: "PUT",
    path: "/api/environment/green-space/reviews/test",
    body: { rating: 4 },
    authMode: "invalid",
  },
  {
    method: "PATCH",
    path: "/api/environment/green-space/reviews/test/moderate",
    body: { isHidden: true },
    authMode: "invalid",
  },
  {
    method: "DELETE",
    path: "/api/environment/green-space/reviews/test",
    authMode: "invalid",
  },
  { method: "GET", path: "/api/environment/raw", authMode: "invalid" },
  { method: "GET", path: "/api/environment/providers", authMode: "invalid" },
  {
    method: "GET",
    path: "/api/environment/providers/status",
    authMode: "invalid",
  },

  {
    method: "GET",
    path: "/api/environment/snapshot/current",
    authMode: "invalid",
  },
  {
    method: "GET",
    path: "/api/environment/snapshot/history",
    authMode: "invalid",
  },
  {
    method: "GET",
    path: "/api/environment/snapshot/test",
    authMode: "invalid",
  },
  {
    method: "POST",
    path: "/api/environment/snapshot/generate",
    body: {},
    authMode: "invalid",
  },
  {
    method: "POST",
    path: "/api/environment/snapshot/cache/refresh",
    body: {},
    authMode: "invalid",
  },

  { method: "GET", path: "/api/environment/score", authMode: "invalid" },
  {
    method: "GET",
    path: "/api/environment/score/details",
    authMode: "invalid",
  },
  {
    method: "POST",
    path: "/api/environment/score/preview",
    body: {
      airQualityScore: 60,
      heatRiskScore: 60,
      floodRiskScore: 60,
      noiseScore: 60,
      greenSpaceScore: 60,
    },
    authMode: "invalid",
  },
  {
    method: "POST",
    path: "/api/environment/score/cache/refresh",
    body: {},
    authMode: "invalid",
  },

  { method: "GET", path: "/api/recommendations", authMode: "invalid" },
  { method: "GET", path: "/api/recommendations/daily", authMode: "invalid" },
  {
    method: "POST",
    path: "/api/recommendations/cache/refresh",
    body: {},
    authMode: "invalid",
  },

  { method: "GET", path: "/api/insights", authMode: "invalid" },
  { method: "GET", path: "/api/insights/daily", authMode: "invalid" },
  {
    method: "POST",
    path: "/api/insights/cache/refresh",
    body: {},
    authMode: "invalid",
  },
];

function buildUrl(path: string, query?: Record<string, string>) {
  const base = "http://localhost";

  if (!query || Object.keys(query).length === 0) return `${base}${path}`;

  const params = new URLSearchParams(query);
  return `${base}${path}?${params.toString()}`;
}

describe("Endpoint Contract Coverage", () => {
  for (const endpoint of endpointCases) {
    const title = `${endpoint.method} ${endpoint.path}`;

    it(title, async () => {
      const headers = new Headers();
      if (endpoint.body) headers.set("Content-Type", "application/json");
      if (endpoint.authMode === "invalid")
        headers.set("Authorization", "Bearer invalid-token");

      const request = new Request(buildUrl(endpoint.path, endpoint.query), {
        method: endpoint.method,
        headers,
        body: endpoint.body ? JSON.stringify(endpoint.body) : undefined,
      });

      const response = await app.handle(request);
      const status = response.status;

      expect(status).not.toBe(404);
      expect(status).not.toBe(405);
    });
  }
});
