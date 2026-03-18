export interface ScoreBreakdown {
  airQualityScore: number;
  heatRiskScore: number;
  floodRiskScore: number;
  noiseScore: number;
  greenSpaceScore: number;
}

export type ScoreQuery = Partial<Record<"snapshotId", string>>;

export interface ScoreSummary {
  snapshotId: string;
  environmentalScore: number;
}
