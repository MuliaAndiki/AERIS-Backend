-- CreateTable
CREATE TABLE "disaster_risks" (
    "id" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "floodScore" INTEGER NOT NULL,
    "heatScore" INTEGER NOT NULL,
    "divisionCode" TEXT,

    CONSTRAINT "disaster_risks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "heat_risks" (
    "id" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "feelsLike" DOUBLE PRECISION NOT NULL,
    "heatRiskScore" INTEGER NOT NULL,
    "riskLevel" TEXT NOT NULL,

    CONSTRAINT "heat_risks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "disaster_risks_snapshotId_key" ON "disaster_risks"("snapshotId");

-- CreateIndex
CREATE UNIQUE INDEX "heat_risks_snapshotId_key" ON "heat_risks"("snapshotId");

-- AddForeignKey
ALTER TABLE "disaster_risks" ADD CONSTRAINT "disaster_risks_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "environmental_snapshots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "heat_risks" ADD CONSTRAINT "heat_risks_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "environmental_snapshots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
