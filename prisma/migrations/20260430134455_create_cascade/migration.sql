-- DropForeignKey
ALTER TABLE "public"."air_quality" DROP CONSTRAINT "air_quality_snapshotId_fkey";

-- DropForeignKey
ALTER TABLE "public"."disaster_risks" DROP CONSTRAINT "disaster_risks_snapshotId_fkey";

-- DropForeignKey
ALTER TABLE "public"."environmental_score_details" DROP CONSTRAINT "environmental_score_details_snapshotId_fkey";

-- DropForeignKey
ALTER TABLE "public"."environmental_snapshots" DROP CONSTRAINT "environmental_snapshots_locationId_fkey";

-- DropForeignKey
ALTER TABLE "public"."green_access_scores" DROP CONSTRAINT "green_access_scores_snapshotId_fkey";

-- DropForeignKey
ALTER TABLE "public"."green_review" DROP CONSTRAINT "green_review_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."heat_risks" DROP CONSTRAINT "heat_risks_snapshotId_fkey";

-- DropForeignKey
ALTER TABLE "public"."noise_estimations" DROP CONSTRAINT "noise_estimations_snapshotId_fkey";

-- DropForeignKey
ALTER TABLE "public"."recommendations" DROP CONSTRAINT "recommendations_snapshotId_fkey";

-- DropForeignKey
ALTER TABLE "public"."user_locations" DROP CONSTRAINT "user_locations_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."user_sessions" DROP CONSTRAINT "user_sessions_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."weather_conditions" DROP CONSTRAINT "weather_conditions_snapshotId_fkey";

-- AddForeignKey
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_locations" ADD CONSTRAINT "user_locations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "environmental_snapshots" ADD CONSTRAINT "environmental_snapshots_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "user_locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "air_quality" ADD CONSTRAINT "air_quality_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "environmental_snapshots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disaster_risks" ADD CONSTRAINT "disaster_risks_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "environmental_snapshots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "heat_risks" ADD CONSTRAINT "heat_risks_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "environmental_snapshots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weather_conditions" ADD CONSTRAINT "weather_conditions_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "environmental_snapshots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "noise_estimations" ADD CONSTRAINT "noise_estimations_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "environmental_snapshots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "environmental_score_details" ADD CONSTRAINT "environmental_score_details_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "environmental_snapshots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "environmental_snapshots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "green_access_scores" ADD CONSTRAINT "green_access_scores_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "environmental_snapshots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "green_review" ADD CONSTRAINT "green_review_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
