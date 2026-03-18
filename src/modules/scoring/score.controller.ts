import { AppContext } from "@/contex/appContex";
import { ErrorHandling, HttpResponse } from "@/contex/error";
import scoreService from "@/modules/scoring/score.service";
import { ScoreBreakdown, ScoreQuery } from "@/modules/scoring/score.types";

class ScoreController {
  public async getScore(c: AppContext) {
    try {
      if (!c.user?.id) return HttpResponse(c).unauthorized();

      const query = (c.query ?? {}) as ScoreQuery;
      const data = await scoreService.getScore(c.user.id, query.snapshotId);
      return HttpResponse(c).ok(data, "Environmental score fetched");
    } catch (error) {
      return ErrorHandling(c, error);
    }
  }

  public async getScoreDetails(c: AppContext) {
    try {
      if (!c.user?.id) return HttpResponse(c).unauthorized();

      const query = (c.query ?? {}) as ScoreQuery;
      const data = await scoreService.getScoreDetails(
        c.user.id,
        query.snapshotId,
      );
      return HttpResponse(c).ok(data, "Environmental score detail fetched");
    } catch (error) {
      return ErrorHandling(c, error);
    }
  }

  public previewScore(c: AppContext) {
    try {
      const body = c.body as ScoreBreakdown;
      const score = scoreService.calculateTotalScore(body);
      return HttpResponse(c).ok(
        { environmentalScore: score },
        "Score preview calculated",
      );
    } catch (error) {
      return ErrorHandling(c, error);
    }
  }

  public refreshCache(c: AppContext) {
    try {
      if (!c.user?.id) return HttpResponse(c).unauthorized();

      const removed = scoreService.refreshCache(c.user.id);
      return HttpResponse(c).accepted({ removed }, "Score cache refreshed");
    } catch (error) {
      return ErrorHandling(c, error);
    }
  }
}

export default new ScoreController();
