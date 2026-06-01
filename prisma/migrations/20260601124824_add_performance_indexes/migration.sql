-- CreateIndex
CREATE INDEX "environmental_snapshots_locationId_idx" ON "environmental_snapshots"("locationId");

-- CreateIndex
CREATE INDEX "environmental_snapshots_snapshotTime_idx" ON "environmental_snapshots"("snapshotTime");

-- CreateIndex
CREATE INDEX "environmental_snapshots_locationId_snapshotTime_idx" ON "environmental_snapshots"("locationId", "snapshotTime");

-- CreateIndex
CREATE INDEX "green_access_scores_snapshotId_idx" ON "green_access_scores"("snapshotId");

-- CreateIndex
CREATE INDEX "green_access_scores_greenAreaId_idx" ON "green_access_scores"("greenAreaId");

-- CreateIndex
CREATE INDEX "green_review_greenAreaId_idx" ON "green_review"("greenAreaId");

-- CreateIndex
CREATE INDEX "green_review_userId_idx" ON "green_review"("userId");

-- CreateIndex
CREATE INDEX "green_review_greenAreaId_isHidden_isFlagged_idx" ON "green_review"("greenAreaId", "isHidden", "isFlagged");

-- CreateIndex
CREATE INDEX "recommendations_snapshotId_idx" ON "recommendations"("snapshotId");

-- CreateIndex
CREATE INDEX "recommendations_snapshotId_severity_idx" ON "recommendations"("snapshotId", "severity");

-- CreateIndex
CREATE INDEX "user_locations_userId_idx" ON "user_locations"("userId");

-- CreateIndex
CREATE INDEX "user_locations_userId_createdAt_idx" ON "user_locations"("userId", "createdAt");
