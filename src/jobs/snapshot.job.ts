import prisma from "prisma/client";
import MapProvider from "@/providers/map.provider";
import { AxiosEnvironment } from "@/utils/axios";
import { environmentCache } from "@/modules/environment/environment.cache";
import { ENV_CACHE_TTL } from "@/modules/environment/environment.cache-policy";
import { hazardScoreMapping } from "@/types/hazard.type";
import snapshotService from "@/modules/snapshot/snapshot.service";
import { roundCoord } from "@/utils/cache-key";

const SNAPSHOT_JOB_INTERVAL_MS = 3 * 60 * 60 * 1000; // 3 hours
const CLEANUP_JOB_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours
const SNAPSHOT_RETENTION_DAYS = 7;

const fakeContext = {
  json: () => undefined,
} as any;

function isCacheable(value: unknown) {
  if (value == null) return false;
  if (value instanceof Response) return false;
  if (typeof value === "function") return false;
  if (
    typeof value === "object" &&
    value !== null &&
    "status" in value &&
    typeof (value as any).status === "number"
  ) {
    return false;
  }
  return true;
}

export async function refreshLocationCache(location: {
  id: string;
  userId: string;
  latitude: number;
  longitude: number;
  city: string;
  state: string;
  country: string;
  radius: number;
}) {
  const { id, userId, latitude, longitude, city, state, country, radius } =
    location;

  const lat = roundCoord(latitude);
  const lon = roundCoord(longitude);

  const airQualityKey = [
    "air-quality",
    userId,
    lat,
    lon,
    city,
    state,
    country,
  ].join(":");
  const weatherKey = ["weather", userId, lat, lon].join(":");
  const disasterKey = ["disaster-risk", userId, city].join(":");
  const noiseKey = ["noise-major-road-count", userId, lat, lon].join(":");
  const greenSpaceKey = ["green-space", userId, lat, lon, radius].join(":");

  const tasks = [
    async () => {
      const result = await MapProvider.airQuality.getAirQuality(
        latitude,
        longitude,
        city,
        state,
        country,
        fakeContext,
      );
      if (isCacheable(result)) {
        environmentCache.set(
          airQualityKey,
          result,
          ENV_CACHE_TTL.AIR_QUALITY_MS,
        );
      }
    },
    async () => {
      const result = await MapProvider.weather.getWeather(
        latitude,
        longitude,
        fakeContext,
      );
      if (isCacheable(result)) {
        environmentCache.set(weatherKey, result, ENV_CACHE_TTL.WEATHER_MS);
      }
    },
    async () => {
      const divisionCode = await MapProvider.disaster.getDisasterRisk(
        city,
        fakeContext,
      );
      if (typeof divisionCode !== "string") {
        return;
      }

      const { disasterRisk } = AxiosEnvironment({ city });
      const reportRes = await disasterRisk.get(`/report/${divisionCode}.json`);
      if (!reportRes?.data) {
        return;
      }

      const hazards = reportRes.data;
      let floodScore = 0;
      let heatScore = 0;

      hazards.forEach((hazard: any) => {
        const level = hazard.hazardlevel?.mnemonic;
        const type = hazard.hazardtype?.mnemonic;
        const numericScore = hazardScoreMapping[level] ?? 0;

        if (type === "FL" || type === "UF") floodScore = numericScore;
        if (type === "EH") heatScore = numericScore;
      });

      const data = { floodScore, heatScore };
      environmentCache.set(disasterKey, data, ENV_CACHE_TTL.DISASTER_RISK_MS);
    },
    async () => {
      const result = await MapProvider.noise.getMajorRoadCount(
        latitude,
        longitude,
        fakeContext,
      );
      if (typeof result === "number" && Number.isFinite(result)) {
        environmentCache.set(noiseKey, result, ENV_CACHE_TTL.NOISE_MS);
      }
    },
    async () => {
      const result = await MapProvider.greenSpace.getGreenSpace(
        latitude,
        longitude,
        radius,
        fakeContext,
      );
      if (isCacheable(result)) {
        environmentCache.set(
          greenSpaceKey,
          result,
          ENV_CACHE_TTL.GREEN_SPACE_MS,
        );
      }
    },
  ];

  await Promise.allSettled(
    tasks.map((task) =>
      task().catch((error) => {
        console.error(
          `[SnapshotJob] Refresh failed for location ${id}:`,
          error,
        );
      }),
    ),
  );

  // Generate a new snapshot from refreshed cache data
  try {
    await snapshotService.generate(userId, id);
    console.log(
      `[SnapshotJob] Generated snapshot for user ${userId} at location ${id}`,
    );
  } catch (error) {
    console.error(
      `[SnapshotJob] Failed to generate snapshot for user ${userId}:`,
      error,
    );
  }
}

async function refreshAllLocationCaches() {
  const locations = await prisma.userLocation.findMany({
    orderBy: [{ userId: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      userId: true,
      latitude: true,
      longitude: true,
      city: true,
      state: true,
      country: true,
      radius: true,
      createdAt: true,
    },
  });

  if (!locations.length) {
    console.log("[SnapshotJob] No user locations found to refresh.");
    return;
  }

  const latestLocationByUser = new Map<string, (typeof locations)[number]>();
  for (const location of locations) {
    if (!latestLocationByUser.has(location.userId)) {
      latestLocationByUser.set(location.userId, location);
    }
  }

  const latestLocations = Array.from(latestLocationByUser.values());

  console.log(
    `[SnapshotJob] Refreshing environment cache for ${latestLocations.length} latest user location(s).`,
  );

  await Promise.allSettled(
    latestLocations.map((location) =>
      refreshLocationCache(location).catch((error) => {
        console.error(
          `[SnapshotJob] Failed to refresh cache for location ${location.id}:`,
          error,
        );
      }),
    ),
  );
}

export function computeRetentionDate(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

export function isOlderThanRetention(date: Date, retentionDate: Date) {
  return date.getTime() < retentionDate.getTime();
}

// async function deleteUser() {
//   const users = await prisma.user.findFirst({
//     where: {
//       isVerify: false,
//     },
//     select: {
//       id: true,
//     },
//   });

//   const deleteUser = await prisma.user.deleteMany({
//     where: {
//       id: users?.id,
//     },
//   });

//   console.log(`useres delete isActive false ${deleteUser.count}`);
// }

async function cleanupOldSnapshots() {
  const retentionDate = computeRetentionDate(SNAPSHOT_RETENTION_DAYS);

  const staleSnapshots = await prisma.environmentalSnapshot.findMany({
    where: {
      snapshotTime: {
        lt: retentionDate,
      },
    },
    select: {
      id: true,
    },
  });

  if (staleSnapshots.length) {
    const snapshotIds = staleSnapshots.map((snapshot) => snapshot.id);

    const { count } = await prisma.environmentalSnapshot.deleteMany({
      where: {
        id: { in: snapshotIds },
      },
    });

    console.log(
      `[SnapshotJob] Deleted ${count} snapshot(s) older than ${SNAPSHOT_RETENTION_DAYS} days.`,
    );
  } else {
    console.log("[SnapshotJob] No old snapshots to delete.");
  }

  const staleLocations = await prisma.userLocation.findMany({
    where: {
      createdAt: {
        lt: retentionDate,
      },
    },
    select: {
      id: true,
    },
  });

  if (!staleLocations.length) {
    console.log("[SnapshotJob] No old user locations to delete.");
    return;
  }

  const staleLocationIds = staleLocations.map((location) => location.id);
  await prisma.userLocation.deleteMany({
    where: {
      id: { in: staleLocationIds },
    },
  });

  console.log(
    `[SnapshotJob] Deleted ${staleLocationIds.length} user location(s) older than ${SNAPSHOT_RETENTION_DAYS} days.`,
  );
}

export function runSnapshotJob() {
  void refreshAllLocationCaches();
  void cleanupOldSnapshots();
  // void deleteUser();

  setInterval(() => {
    void refreshAllLocationCaches();
  }, SNAPSHOT_JOB_INTERVAL_MS);

  setInterval(() => {
    void cleanupOldSnapshots();
  }, CLEANUP_JOB_INTERVAL_MS);

  // setInterval(() => {
  //   void deleteUser();
  // }, CLEANUP_JOB_INTERVAL_MS);

  console.log(
    "[SnapshotJob] Scheduled every 3 hours and cleanup every 24 hours.",
  );
}
