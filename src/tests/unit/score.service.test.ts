import { describe, expect, it } from "bun:test";

import { ScoreService } from "@/modules/scoring/score.service";

describe("ScoreService.calculateTotalScore", () => {
  const service = new ScoreService();

  it("returns average score rounded", () => {
    const result = service.calculateTotalScore({
      airQualityScore: 80,
      heatRiskScore: 60,
      floodRiskScore: 70,
      noiseScore: 50,
      greenSpaceScore: 90,
    });

    expect(result).toBe(70);
  });

  it("clamps result to minimum 0", () => {
    const result = service.calculateTotalScore({
      airQualityScore: -100,
      heatRiskScore: -100,
      floodRiskScore: -100,
      noiseScore: -100,
      greenSpaceScore: -100,
    });

    expect(result).toBe(0);
  });

  it("clamps result to maximum 100", () => {
    const result = service.calculateTotalScore({
      airQualityScore: 150,
      heatRiskScore: 150,
      floodRiskScore: 150,
      noiseScore: 150,
      greenSpaceScore: 150,
    });

    expect(result).toBe(100);
  });
});
