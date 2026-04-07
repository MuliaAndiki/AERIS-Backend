import app from "@/app";
import jwt from "jsonwebtoken";
import prisma from "prisma/client";
import locationService from "@/modules/location/location.service";
import { ResolveLocationBody } from "@/modules/location/location.types";
import { refreshLocationCache } from "@/jobs/snapshot.job";

const LOCATION_SAVE_DELAY_MS = 60 * 60 * 1000; // 1 hour

type PendingLocationEntry = {
  body: ResolveLocationBody;
  timer: ReturnType<typeof setTimeout>;
};

const pendingLocationSaves = new Map<string, PendingLocationEntry>();

function locationMatches(latest: any, body: ResolveLocationBody) {
  return (
    Number(latest.latitude) === Number(body.latitude) &&
    Number(latest.longitude) === Number(body.longitude) &&
    String(latest.city) === String(body.city) &&
    String(latest.state) === String(body.state) &&
    String(latest.country) === String(body.country) &&
    Number(latest.radius) === Number(body.radius)
  );
}

async function flushPendingLocation(userId: string) {
  const pending = pendingLocationSaves.get(userId);
  if (!pending) {
    return;
  }

  pendingLocationSaves.delete(userId);
  clearTimeout(pending.timer);

  try {
    const latestSavedLocation = await prisma.userLocation.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    if (
      latestSavedLocation &&
      locationMatches(latestSavedLocation, pending.body)
    ) {
      console.log(
        `[Socket] Location for user ${userId} is unchanged, skipping save.`,
      );
      return;
    }

    const location = await locationService.resolveLocation(pending.body);
    await refreshLocationCache(location);

    console.log(
      `[Socket] Saved pending location for user ${userId} at ${location.latitude}, ${location.longitude}.`,
    );
  } catch (error) {
    console.error("WS location save error", error);
  }
}

function scheduleLocationSave(userId: string, body: ResolveLocationBody) {
  const existing = pendingLocationSaves.get(userId);
  if (existing) {
    existing.body = body;
    return;
  }

  const timer = setTimeout(() => {
    void flushPendingLocation(userId);
  }, LOCATION_SAVE_DELAY_MS);

  pendingLocationSaves.set(userId, {
    body,
    timer,
  });
}

export const initSocket = () => {
  app.ws("/ws", {
    async message(ws, message: unknown) {
      try {
        const data = JSON.parse(message as string);
        const wsAny = ws as any;

        if (data.type === "auth") {
          const token = data.token;
          if (!token) {
            ws.close();
            return;
          }

          const payload = jwt.verify(token, process.env.JWT_SECRET!) as {
            id: string;
          };

          const user = await prisma.user.findUnique({
            where: { id: payload.id },
            select: { id: true },
          });

          if (!user) {
            ws.close();
            return;
          }

          wsAny.userId = user.id;
          ws.subscribe(`user:${user.id}`);
          ws.send(
            JSON.stringify({
              type: "auth:ok",
              message: "Socket authenticated",
            }),
          );
          return;
        }

        if (data.type === "location:update") {
          const userId = wsAny.userId as string;
          if (!userId) {
            ws.send(
              JSON.stringify({
                type: "error",
                message: "Socket not authenticated",
              }),
            );
            return;
          }

          const latitude = Number(data.latitude);
          const longitude = Number(data.longitude);
          const radius = Number(data.radius ?? 1000);
          const city = String(data.city ?? "");
          const state = String(data.state ?? "");
          const country = String(data.country ?? "");

          if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
            ws.send(
              JSON.stringify({
                type: "error",
                message: "Invalid latitude or longitude",
              }),
            );
            return;
          }

          const body: ResolveLocationBody = {
            userId,
            latitude,
            longitude,
            city,
            state,
            country,
            radius,
          };

          scheduleLocationSave(userId, body);

          const payload = {
            type: "location:update:received",
            status: "pending",
            message: "Location update received. Will be saved after 1 hour.",
            location: {
              latitude,
              longitude,
              city,
              state,
              country,
              radius,
            },
          };

          ws.send(JSON.stringify(payload));
          ws.publish(`user:${userId}`, JSON.stringify(payload));
          return;
        }
      } catch (err) {
        console.error("WS error", err);
        ws.send(
          JSON.stringify({
            type: "error",
            message: "Invalid websocket payload",
          }),
        );
      }
    },
  });
};
