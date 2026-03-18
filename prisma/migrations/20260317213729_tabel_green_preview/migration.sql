-- CreateTable
CREATE TABLE "green_review" (
    "id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "greenAreaId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "comment" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "green_review_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "green_review" ADD CONSTRAINT "green_review_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "green_review" ADD CONSTRAINT "green_review_greenAreaId_fkey" FOREIGN KEY ("greenAreaId") REFERENCES "green_areas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
