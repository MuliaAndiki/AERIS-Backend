import { ScoreBreakdown } from "@/modules/scoring/score.types";

export class ScoreService {
  calculateTotalScore(detail: ScoreBreakdown): number {
    const total =
      detail.airQualityScore +
      detail.heatRiskScore +
      detail.floodRiskScore +
      detail.noiseScore +
      detail.greenSpaceScore;

    return Math.max(0, Math.min(100, Math.round(total / 5)));
  }
}

export default new ScoreService();
