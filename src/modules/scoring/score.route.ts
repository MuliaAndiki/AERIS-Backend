import { Elysia, t } from "elysia";
import { AppContext } from "@/contex/appContex";
import { verifyToken } from "@/middlewares/auth";
import scoreController from "@/modules/scoring/score.controller";

class ScoreRoute {
  public router;

  constructor() {
    this.router = new Elysia({ prefix: "/environment/score" }).derive(() => ({
      json(data: unknown, status = 200) {
        return new Response(JSON.stringify(data), {
          status,
          headers: { "Content-Type": "application/json" },
        });
      },
    }));

    this.routes();
  }

  private routes() {
    this.router.get("/", (c: AppContext) => scoreController.getScore(c), {
      beforeHandle: [verifyToken().beforeHandle],
      query: t.Object({
        snapshotId: t.Optional(t.String()),
      }),
      detail: {
        tags: ["Scoring"],
        summary: "Get environmental score",
      },
    });

    this.router.get(
      "/details",
      (c: AppContext) => scoreController.getScoreDetails(c),
      {
        beforeHandle: [verifyToken().beforeHandle],
        query: t.Object({
          snapshotId: t.Optional(t.String()),
        }),
        detail: {
          tags: ["Scoring"],
          summary: "Get environmental score detail",
        },
      },
    );

    this.router.post(
      "/preview",
      (c: AppContext) => scoreController.previewScore(c),
      {
        beforeHandle: [verifyToken().beforeHandle],
        body: t.Object({
          airQualityScore: t.Number(),
          heatRiskScore: t.Number(),
          floodRiskScore: t.Number(),
          noiseScore: t.Number(),
          greenSpaceScore: t.Number(),
        }),
        detail: {
          tags: ["Scoring"],
          summary: "Preview environmental score",
        },
      },
    );

    this.router.post(
      "/cache/refresh",
      (c: AppContext) => scoreController.refreshCache(c),
      {
        beforeHandle: [verifyToken().beforeHandle],
        body: t.Object({}),
        detail: {
          tags: ["Scoring"],
          summary: "Refresh score cache",
        },
      },
    );
  }
}

export default new ScoreRoute().router;
