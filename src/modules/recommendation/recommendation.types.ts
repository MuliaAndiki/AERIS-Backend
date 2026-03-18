export interface RecommendationItem {
  id: string;
  recommendationType: string;
  message: string;
  severity: number;
}

export type RecommendationQuery = Partial<Record<"snapshotId", string>>;

export interface DailyRecommendationSummary {
  date: string;
  total: number;
  items: RecommendationItem[];
}
