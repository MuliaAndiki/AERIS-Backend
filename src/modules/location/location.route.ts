import Elysia from "elysia";
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
    this.router.get("/detect", (c: AppContext) => locationController.detect(c));

    this.router.post(
      "/resolve",
      (c: AppContext) => locationController.resolve(c),
      {
        beforeHandle: [verifyToken().beforeHandle],
      },
    );
  }
}

export default new LocationRoutes().router;
