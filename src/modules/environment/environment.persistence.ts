import prisma from "prisma/client";
import { moduleCache } from "@/modules/cache/module-cache";

type ScorePatch = Partial<{
  airQualityScore: number;
  heatRiskScore: number;
  floodRiskScore: number;
  noiseScore: number;
  greenSpaceScore: number;
}>;

const DEFAULT_SCORE = 60;

function toScore(value: number | undefined, fallback = DEFAULT_SCORE) {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(0, Math.min(100, Math.round(value as number)));
}

export async function getOrCreateLatestSnapshot(locationId: string) {
  const latestSnapshot = await prisma.environmentalSnapshot.findFirst({
    where: {
      locationId,
    },
    orderBy: {
      snapshotTime: "desc",
    },
    select: {
      id: true,
    },
  });

  if (latestSnapshot) {
    return latestSnapshot;
  }

  return prisma.environmentalSnapshot.create({
    data: {
      locationId,
      snapshotTime: new Date(),
      environmentalScore: DEFAULT_SCORE,
    },
    select: {
      id: true,
    },
  });
}

export async function upsertScoreDetailAndUpdateSnapshot(
  snapshotId: string,
  scorePatch: ScorePatch,
) {
  const existing = await prisma.environmentalScoreDetail.findUnique({
    where: {
      snapshotId,
    },
    select: {
      airQualityScore: true,
      heatRiskScore: true,
      floodRiskScore: true,
      noiseScore: true,
      greenSpaceScore: true,
    },
  });

  const nextDetail = {
    airQualityScore: toScore(
      scorePatch.airQualityScore,
      existing?.airQualityScore ?? DEFAULT_SCORE,
    ),
    heatRiskScore: toScore(
      scorePatch.heatRiskScore,
      existing?.heatRiskScore ?? DEFAULT_SCORE,
    ),
    floodRiskScore: toScore(
      scorePatch.floodRiskScore,
      existing?.floodRiskScore ?? DEFAULT_SCORE,
    ),
    noiseScore: toScore(
      scorePatch.noiseScore,
      existing?.noiseScore ?? DEFAULT_SCORE,
    ),
    greenSpaceScore: toScore(
      scorePatch.greenSpaceScore,
      existing?.greenSpaceScore ?? DEFAULT_SCORE,
    ),
  };

  const scoreDetail = await prisma.environmentalScoreDetail.upsert({
    where: {
      snapshotId,
    },
    create: {
      snapshotId,
      ...nextDetail,
    },
    update: nextDetail,
  });

  const environmentalScore = Math.round(
    (scoreDetail.airQualityScore +
      scoreDetail.heatRiskScore +
      scoreDetail.floodRiskScore +
      scoreDetail.noiseScore +
      scoreDetail.greenSpaceScore) /
      5,
  );

  await prisma.environmentalSnapshot.update({
    where: {
      id: snapshotId,
    },
    data: {
      environmentalScore,
    },
  });

  return {
    scoreDetail,
    environmentalScore,
  };
}

export function refreshEnvironmentCache(userId: string) {
  moduleCache.deleteByPrefix(`snapshot:${userId}:`);
  moduleCache.deleteByPrefix(`score:${userId}:`);
  moduleCache.deleteByPrefix(`recommendation:${userId}:`);
  moduleCache.deleteByPrefix(`insight:${userId}:`);
}
