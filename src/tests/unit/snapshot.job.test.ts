import { describe, expect, it } from "bun:test";

import {
  computeRetentionDate,
  isOlderThanRetention,
} from "@/jobs/snapshot.job";

describe("snapshot job retention helpers", () => {
  it("computes a retention date roughly 7 days in the past", () => {
    const retentionDate = computeRetentionDate(7);
    const now = Date.now();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

    expect(retentionDate.getTime()).toBeLessThanOrEqual(
      now - sevenDaysMs + 1000,
    );
    expect(retentionDate.getTime()).toBeGreaterThanOrEqual(
      now - sevenDaysMs - 1000,
    );
  });

  it("flags a date older than retention as stale", () => {
    const retentionDate = computeRetentionDate(7);
    const oldDate = new Date(retentionDate.getTime() - 1000);
    expect(isOlderThanRetention(oldDate, retentionDate)).toBe(true);
  });

  it("does not flag a date newer than retention as stale", () => {
    const retentionDate = computeRetentionDate(7);
    const freshDate = new Date(retentionDate.getTime() + 1000);
    expect(isOlderThanRetention(freshDate, retentionDate)).toBe(false);
  });
});
