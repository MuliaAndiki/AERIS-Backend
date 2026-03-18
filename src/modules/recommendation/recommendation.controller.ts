import { AppContext } from "@/contex/appContex";
import { ErrorHandling, HttpResponse } from "@/contex/error";
import recommendationService from "@/modules/recommendation/recommendation.service";
import { RecommendationQuery } from "@/modules/recommendation/recommendation.types";

class RecommendationController {
  public async getList(c: AppContext) {
    try {
      if (!c.user?.id) return HttpResponse(c).unauthorized();

      const query = (c.query ?? {}) as RecommendationQuery;
      const data = await recommendationService.getRecommendations(
        c.user.id,
        query.snapshotId,
      );

      return HttpResponse(c).ok(data, "Recommendations fetched");
    } catch (error) {
      return ErrorHandling(c, error);
    }
  }

  public async getDaily(c: AppContext) {
    try {
      if (!c.user?.id) return HttpResponse(c).unauthorized();

      const data = await recommendationService.getDailyRecommendations(
        c.user.id,
      );
      return HttpResponse(c).ok(data, "Daily recommendations fetched");
    } catch (error) {
      return ErrorHandling(c, error);
    }
  }

  public refreshCache(c: AppContext) {
    try {
      if (!c.user?.id) return HttpResponse(c).unauthorized();

      const removed = recommendationService.refreshCache(c.user.id);
      return HttpResponse(c).accepted(
        { removed },
        "Recommendation cache refreshed",
      );
    } catch (error) {
      return ErrorHandling(c, error);
    }
  }
}

export default new RecommendationController();
