/*
  Warnings:

  - Added the required column `state` to the `user_locations` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "user_locations" ADD COLUMN     "state" TEXT NOT NULL;
