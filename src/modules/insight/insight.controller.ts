import { AppContext } from "@/contex/appContex";
import { ErrorHandling, HttpResponse } from "@/contex/error";
import insightService from "@/modules/insight/insight.service";
import { InsightQuery } from "@/modules/insight/insight.types";

class InsightController {
  public async getInsights(c: AppContext) {
    try {
      if (!c.user?.id) return HttpResponse(c).unauthorized();

      const query = (c.query ?? {}) as InsightQuery;
      const data = await insightService.getInsights(
        c.user.id,
        query.snapshotId,
      );
      return HttpResponse(c).ok(data, "Insights fetched");
    } catch (error) {
      return ErrorHandling(c, error);
    }
  }

  public async getDaily(c: AppContext) {
    try {
      if (!c.user?.id) return HttpResponse(c).unauthorized();

      const data = await insightService.generateDailySummary(c.user.id);
      return HttpResponse(c).ok(data, "Daily insight fetched");
    } catch (error) {
      return ErrorHandling(c, error);
    }
  }

  public refreshCache(c: AppContext) {
    try {
      if (!c.user?.id) return HttpResponse(c).unauthorized();

      const removed = insightService.refreshCache(c.user.id);
      return HttpResponse(c).accepted({ removed }, "Insight cache refreshed");
    } catch (error) {
      return ErrorHandling(c, error);
    }
  }
}

export default new InsightController();
