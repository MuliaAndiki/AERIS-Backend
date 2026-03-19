import { Elysia, t } from "elysia";
import { AppContext } from "@/contex/appContex";
import { verifyToken } from "@/middlewares/auth";
import locationController from "@/modules/location/location.controller";

class LocationRoutes {
  public router;

  constructor() {
    this.router = new Elysia({ prefix: "/location" }).derive(() => ({
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
      "/detect",
      (c: AppContext) => locationController.detect(c),
      {
        query: t.Object({
          latitude: t.Optional(t.String()),
          longitude: t.Optional(t.String()),
          city: t.Optional(t.String()),
          country: t.Optional(t.String()),
        }),
        detail: {
          tags: ["Location"],
          summary: "Detect location from request and optional coordinates",
        },
      },
    );

    this.router.post(
      "/resolve",
      (c: AppContext) => locationController.resolve(c),
      {
        beforeHandle: [verifyToken().beforeHandle],
        body: t.Object({
          userId: t.Optional(t.String()),
          latitude: t.Number(),
          longitude: t.Number(),
          city: t.String(),
          state: t.String(),
          country: t.String(),
          radius: t.Number(),
        }),
        detail: {
          tags: ["Location"],
          summary: "Resolve and store user location",
        },
      },
    );
  }
}

export default new LocationRoutes().router;
