import { Elysia, t } from "elysia";
import { AppContext } from "@/contex/appContex";
import { verifyToken } from "@/middlewares/auth";
import recommendationController from "@/modules/recommendation/recommendation.controller";

class RecommendationRoute {
  public router;

  constructor() {
    this.router = new Elysia({ prefix: "/recommendations" }).derive(() => ({
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
    this.router.get(
      "/",
      (c: AppContext) => recommendationController.getList(c),
      {
        beforeHandle: [verifyToken().beforeHandle],
        query: t.Object({
          snapshotId: t.Optional(t.String()),
        }),
        detail: {
          tags: ["Recommendation"],
          summary: "Get recommendation list",
        },
      },
    );

    this.router.get(
      "/daily",
      (c: AppContext) => recommendationController.getDaily(c),
      {
        beforeHandle: [verifyToken().beforeHandle],
        detail: {
          tags: ["Recommendation"],
          summary: "Get daily recommendations",
        },
      },
    );

    this.router.post(
      "/cache/refresh",
      (c: AppContext) => recommendationController.refreshCache(c),
      {
        beforeHandle: [verifyToken().beforeHandle],
        body: t.Object({}),
        detail: {
          tags: ["Recommendation"],
          summary: "Refresh recommendation cache",
        },
      },
    );
  }
}

export default new RecommendationRoute().router;
