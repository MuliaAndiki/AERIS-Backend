import { Elysia, t } from "elysia";
import environmentController from "@/modules/environment/environment.controller";
import environmentDataController from "@/modules/environment/environment-data.controller";
import { AppContext } from "@/contex/appContex";
import { verifyToken } from "@/middlewares/auth";

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
