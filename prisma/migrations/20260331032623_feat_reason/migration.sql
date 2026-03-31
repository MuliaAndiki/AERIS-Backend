/*
  Warnings:

  - Added the required column `updatedAt` to the `green_review` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "green_review" ADD COLUMN     "flagReason" TEXT,
ADD COLUMN     "isFlagged" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isHidden" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;
