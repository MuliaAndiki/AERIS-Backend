import prisma from "prisma/client";
import { JwtPayload } from "@/modules/auth/auth.types";
import {
  DetectLocationQuery,
  DetectLocationResult,
  ResolveLocationBody,
} from "@/modules/location/location.types";

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

  public async resolveLocation(body: ResolveLocationBody, auth?: JwtPayload) {
    const userId = body.userId ?? auth?.id;

    if (!userId) {
      throw new Error("userId is required");
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      throw new Error("User not found");
    }

    return prisma.userLocation.create({
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
  }

  private toNumber(value?: string): number | null {
    if (!value) return null;
    const converted = Number(value);
    return Number.isFinite(converted) ? converted : null;
  }
}

export default new LocationService();
