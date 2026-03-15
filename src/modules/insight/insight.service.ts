import { InsightSummary } from "@/modules/insight/insight.types";

export class InsightService {
  generateDailySummary(): InsightSummary {
    return {
      title: "Daily Insight",
      message: "Insight generation is not implemented yet",
      severity: "low",
    };
  }
}

export default new InsightService();
