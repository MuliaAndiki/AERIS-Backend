/*
  Warnings:

  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `posts` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "RoleType" AS ENUM ('USER', 'ADMIN');

-- DropTable
DROP TABLE "public"."User";

-- DropTable
DROP TABLE "public"."posts";

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "fullName" TEXT NOT NULL,
    "password" TEXT,
    "role" "RoleType" NOT NULL,
    "isVerify" BOOLEAN NOT NULL DEFAULT false,
    "otp" TEXT,
    "expOtp" TIMESTAMP(3),
    "token" TEXT,
    "activateExp" TIMESTAMP(3),
    "activateToken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "avaUrl" TEXT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userAgent" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT NOT NULL,

    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_locations" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "city" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "environmental_snapshots" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "snapshotTime" TIMESTAMP(3) NOT NULL,
    "environmentalScore" INTEGER NOT NULL,

    CONSTRAINT "environmental_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "air_quality" (
    "id" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "aqi" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "dominantPollutant" TEXT NOT NULL,

    CONSTRAINT "air_quality_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weather_conditions" (
    "id" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "temperature" DOUBLE PRECISION NOT NULL,
    "humidity" DOUBLE PRECISION NOT NULL,
    "rainfall" DOUBLE PRECISION NOT NULL,
    "weatherStatus" TEXT NOT NULL,

    CONSTRAINT "weather_conditions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "noise_estimations" (
    "id" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "roadDensityIndex" INTEGER NOT NULL,
    "estimatedNoiseLevel" INTEGER NOT NULL,

    CONSTRAINT "noise_estimations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "environmental_score_details" (
    "id" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "airQualityScore" INTEGER NOT NULL,
    "heatRiskScore" INTEGER NOT NULL,
    "floodRiskScore" INTEGER NOT NULL,
    "noiseScore" INTEGER NOT NULL,
    "greenSpaceScore" INTEGER NOT NULL,

    CONSTRAINT "environmental_score_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recommendations" (
    "id" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "recommendationType" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "severity" INTEGER NOT NULL,

    CONSTRAINT "recommendations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "green_areas" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "areaSize" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "green_areas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "green_access_scores" (
    "id" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "greenAreaId" TEXT NOT NULL,
    "distanceKm" DOUBLE PRECISION NOT NULL,
    "accessibilityScore" INTEGER NOT NULL,

    CONSTRAINT "green_access_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_providers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "providerType" TEXT NOT NULL,
    "baseUrl" TEXT NOT NULL,

    CONSTRAINT "api_providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "data_fetch_logs" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "fetchTime" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,
    "responseSummary" TEXT,

    CONSTRAINT "data_fetch_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE INDEX "user_sessions_userId_idx" ON "user_sessions"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "air_quality_snapshotId_key" ON "air_quality"("snapshotId");

-- CreateIndex
CREATE UNIQUE INDEX "weather_conditions_snapshotId_key" ON "weather_conditions"("snapshotId");

-- CreateIndex
CREATE UNIQUE INDEX "noise_estimations_snapshotId_key" ON "noise_estimations"("snapshotId");

-- CreateIndex
CREATE UNIQUE INDEX "environmental_score_details_snapshotId_key" ON "environmental_score_details"("snapshotId");

-- AddForeignKey
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_locations" ADD CONSTRAINT "user_locations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "environmental_snapshots" ADD CONSTRAINT "environmental_snapshots_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "user_locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "air_quality" ADD CONSTRAINT "air_quality_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "environmental_snapshots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weather_conditions" ADD CONSTRAINT "weather_conditions_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "environmental_snapshots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "noise_estimations" ADD CONSTRAINT "noise_estimations_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "environmental_snapshots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "environmental_score_details" ADD CONSTRAINT "environmental_score_details_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "environmental_snapshots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "environmental_snapshots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "green_access_scores" ADD CONSTRAINT "green_access_scores_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "environmental_snapshots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "green_access_scores" ADD CONSTRAINT "green_access_scores_greenAreaId_fkey" FOREIGN KEY ("greenAreaId") REFERENCES "green_areas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_fetch_logs" ADD CONSTRAINT "data_fetch_logs_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "api_providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
