import { Elysia, t } from "elysia";
import environmentController from "@/modules/environment/environment.controller";
import environmentDataController from "@/modules/environment/environment-data.controller";
import { AppContext } from "@/contex/appContex";
import { requireRole, verifyToken } from "@/middlewares/auth";

class EnvironmentRoutes {
  public router;

  constructor() {
    this.router = new Elysia({ prefix: "/environment" }).derive(() => ({
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
      "/air-quality",
      (c: AppContext) => environmentDataController.getAirQuality(c),
      {
        beforeHandle: [verifyToken().beforeHandle],
        detail: {
          tags: ["Environment"],
          summary: "Get current air quality",
        },
      },
    );

    this.router.get(
      "/weather",
      (c: AppContext) => environmentDataController.getWeather(c),
      {
        beforeHandle: [verifyToken().beforeHandle],
        detail: {
          tags: ["Environment"],
          summary: "Get current weather condition",
        },
      },
    );

    this.router.get(
      "/heat-risk",
      (c: AppContext) => environmentDataController.getHeatRisk(c),
      {
        beforeHandle: [verifyToken().beforeHandle],
        detail: {
          tags: ["Environment"],
          summary: "Get heat risk score from apparent temperature",
        },
      },
    );

    this.router.get(
      "/noise",
      (c: AppContext) => environmentDataController.getNoise(c),
      {
        beforeHandle: [verifyToken().beforeHandle],
        detail: {
          tags: ["Environment"],
          summary: "Estimate noise from major road density",
        },
      },
    );

    this.router.get(
      "/disaster-risk",
      (c: AppContext) => environmentDataController.getDisasterRisk(c),
      {
        beforeHandle: [verifyToken().beforeHandle],
        detail: {
          tags: ["Environment"],
          summary: "Get disaster risk score",
        },
      },
    );

    this.router.get(
      "/green-space",
      (c: AppContext) => environmentDataController.getGreenSpace(c),
      {
        beforeHandle: [verifyToken().beforeHandle],
        detail: {
          tags: ["Environment"],
          summary: "Get nearby green space data",
        },
      },
    );

    this.router.get(
      "/green-space/reviews",
      (c: AppContext) => environmentDataController.getGreenSpaceReviews(c),
      {
        beforeHandle: [verifyToken().beforeHandle],
        query: t.Object({
          greenAreaId: t.String(),
          page: t.Optional(t.String()),
          limit: t.Optional(t.String()),
          sort: t.Optional(
            t.Union([t.Literal("latest"), t.Literal("top-rated")]),
          ),
          filter: t.Optional(
            t.Union([
              t.Literal("visible"),
              t.Literal("all"),
              t.Literal("flagged"),
            ]),
          ),
        }),
        detail: {
          tags: ["Environment"],
          summary: "Get green space reviews",
        },
      },
    );

    this.router.get(
      "/green-space/:greenAreaId",
      (c: AppContext) => environmentDataController.getGreenAreaDetail(c),
      {
        beforeHandle: [verifyToken().beforeHandle],
        params: t.Object({
          greenAreaId: t.String(),
        }),
        detail: {
          tags: ["Environment"],
          summary:
            "Get green area detail with average rating and total reviews",
        },
      },
    );

    this.router.post(
      "/green-space/reviews",
      (c: AppContext) => environmentDataController.createGreenSpaceReview(c),
      {
        beforeHandle: [verifyToken().beforeHandle],
        body: t.Object({
          greenAreaId: t.String(),
          rating: t.Number({ minimum: 1, maximum: 5 }),
          comment: t.String(),
        }),
        detail: {
          tags: ["Environment"],
          summary: "Create green space review",
        },
      },
    );

    this.router.put(
      "/green-space/reviews/:reviewId",
      (c: AppContext) => environmentDataController.updateGreenSpaceReview(c),
      {
        beforeHandle: [verifyToken().beforeHandle],
        params: t.Object({
          reviewId: t.String(),
        }),
        body: t.Object({
          rating: t.Optional(t.Number({ minimum: 1, maximum: 5 })),
          comment: t.Optional(t.String()),
          isFlagged: t.Optional(t.Boolean()),
          flagReason: t.Optional(t.String()),
        }),
        detail: {
          tags: ["Environment"],
          summary: "Update green space review",
        },
      },
    );

    this.router.patch(
      "/green-space/reviews/:reviewId/moderate",
      (c: AppContext) => environmentDataController.moderateGreenSpaceReview(c),
      {
        beforeHandle: [
          verifyToken().beforeHandle,
          requireRole(["ADMIN"]).beforeHandle,
        ],
        params: t.Object({
          reviewId: t.String(),
        }),
        body: t.Object({
          isHidden: t.Optional(t.Boolean()),
          isFlagged: t.Optional(t.Boolean()),
          flagReason: t.Optional(t.String()),
        }),
        detail: {
          tags: ["Environment"],
          summary: "Moderate green space review",
        },
      },
    );

    this.router.delete(
      "/green-space/reviews/:reviewId",
      (c: AppContext) => environmentDataController.deleteGreenSpaceReview(c),
      {
        beforeHandle: [verifyToken().beforeHandle],
        params: t.Object({
          reviewId: t.String(),
        }),
        detail: {
          tags: ["Environment"],
          summary: "Delete green space review",
        },
      },
    );

    this.router.get(
      "/raw",
      (c: AppContext) => environmentController.getRawEnvironment(c),
      {
        beforeHandle: [verifyToken().beforeHandle],
        query: t.Object({
          locationId: t.Optional(t.String()),
          userId: t.Optional(t.String()),
        }),
        detail: {
          tags: ["Environment"],
          summary: "Get raw aggregated environmental snapshot",
        },
      },
    );

    this.router.get(
      "/providers",
      (c: AppContext) => environmentController.getProviders(c),
      {
        beforeHandle: [verifyToken().beforeHandle],
        detail: {
          tags: ["Environment"],
          summary: "Get registered API providers",
        },
      },
    );

    this.router.get(
      "/providers/status",
      (c: AppContext) => environmentController.getProviderStatus(c),
      {
        beforeHandle: [verifyToken().beforeHandle],
        detail: {
          tags: ["Environment"],
          summary: "Get API provider statuses",
        },
      },
    );
  }
}

export default new EnvironmentRoutes().router;
