import { Elysia, t } from "elysia";
import { AppContext } from "@/contex/appContex";
import { verifyToken } from "@/middlewares/auth";
import insightController from "@/modules/insight/insight.controller";

class InsightRoute {
  public router;

  constructor() {
    this.router = new Elysia({ prefix: "/insights" }).derive(() => ({
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
    this.router.get("/", (c: AppContext) => insightController.getInsights(c), {
      beforeHandle: [verifyToken().beforeHandle],
      query: t.Object({
        snapshotId: t.Optional(t.String()),
      }),
      detail: {
        tags: ["Insight"],
        summary: "Get insights from latest or selected snapshot",
      },
    });

    this.router.get(
      "/daily",
      (c: AppContext) => insightController.getDaily(c),
      {
        beforeHandle: [verifyToken().beforeHandle],
        detail: {
          tags: ["Insight"],
          summary: "Get daily insight summary",
        },
      },
    );

    this.router.post(
      "/cache/refresh",
      (c: AppContext) => insightController.refreshCache(c),
      {
        beforeHandle: [verifyToken().beforeHandle],
        body: t.Object({}),
        detail: {
          tags: ["Insight"],
          summary: "Refresh insight cache",
        },
      },
    );
  }
}

export default new InsightRoute().router;
