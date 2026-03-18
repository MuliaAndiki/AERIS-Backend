export interface InsightSummary {
  snapshotId?: string;
  date?: string;
  title: string;
  message: string;
  severity: "low" | "medium" | "high";
}

export type InsightQuery = Partial<Record<"snapshotId", string>>;
