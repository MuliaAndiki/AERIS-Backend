import prisma from "prisma/client";
import axios from "axios";
import { JwtPayload } from "@/modules/auth/auth.types";
import {
  DetectLocationQuery,
  DetectLocationResult,
  ResolveLocationBody,
} from "@/modules/location/location.types";

interface SearchLocationResult {
  name: string;
  city: string;
  state: string;
  country: string;
  latitude: number;
  longitude: number;
}

class LocationService {
  public detectLocation(
    headers: Headers,
    query: DetectLocationQuery,
  ): DetectLocationResult {
    const ipAddress =
      headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      headers.get("x-real-ip") ||
      headers.get("cf-connecting-ip") ||
      "unknown";

    const latitude = this.toNumber(query.latitude);
    const longitude = this.toNumber(query.longitude);

    return {
      ipAddress,
      userAgent: headers.get("user-agent") ?? "unknown",
      latitude,
      longitude,
      city: query.city ?? null,
      country: query.country ?? null,
    };
  }

  public async searchLocations(query: string): Promise<SearchLocationResult[]> {
    if (!query.trim()) {
      return [];
    }

    try {
      // Use OpenStreetMap Nominatim API for geocoding (global search, not limited to Indonesia)
      const response = await axios.get(
        "https://nominatim.openstreetmap.org/search",
        {
          params: {
            q: query, // Global search - not limited by country
            format: "json",
            limit: 10,
          },
          timeout: 5000,
          headers: {
            "User-Agent": "AERIS-App", // Nominatim requires User-Agent
          },
        },
      );

      // Transform Nominatim results to our format
      return response.data
        .map((item: any) => {
          const displayName = item.display_name || "";
          const parts = displayName.split(",").map((p: string) => p.trim());

          // Extract city, state, country from display_name
          let city = item.name || parts[0] || "";
          let state = item.state || "";
          let country = item.country || "Indonesia";

          // Parse display_name to get state
          if (parts.length >= 3) {
            state = parts[parts.length - 2];
          }

          return {
            name: item.name || "",
            city: city,
            state: state,
            country: country,
            latitude: parseFloat(item.lat),
            longitude: parseFloat(item.lon),
          };
        })
        .filter((loc: SearchLocationResult) => {
          // Filter valid locations
          return (
            loc.city &&
            loc.latitude &&
            loc.longitude &&
            !isNaN(loc.latitude) &&
            !isNaN(loc.longitude)
          );
        });
    } catch (error) {
      console.error("Location search error:", error);
      return [];
    }
  }

  public async resolveLocation(body: ResolveLocationBody, auth?: JwtPayload) {
    console.log("[Location.resolve] Received body:", body);
    console.log("[Location.resolve] Auth userId:", auth?.id);

    const userId = body.userId ?? auth?.id;

    if (!userId) {
      console.error("[Location.resolve] ERROR: No userId found");
      throw new Error("userId is required");
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      console.error("[Location.resolve] ERROR: User not found:", userId);
      throw new Error("User not found");
    }

    const created = await prisma.userLocation.create({
      data: {
        userId,
        latitude: Number(body.latitude),
        longitude: Number(body.longitude),
        city: body.city,
        state: body.state,
        country: body.country,
        radius: Number(body.radius),
      },
    });

    console.log("[Location.resolve] SUCCESS: Saved location:", {
      userId,
      city: body.city,
      lat: body.latitude,
      lon: body.longitude,
    });

    return created;
  }

  private toNumber(value?: string): number | null {
    if (!value) return null;
    const converted = Number(value);
    return Number.isFinite(converted) ? converted : null;
  }
}

export default new LocationService();
