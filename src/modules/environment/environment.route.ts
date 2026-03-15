import Elysia from "elysia";
import environmentController from "@/modules/environment/environment.controller";
import { AppContext } from "@/contex/appContex";
import { verifyToken } from "@/middlewares/auth";

class EnvironmentRoutes {
  public router;

  constructor() {
    this.router = new Elysia().derive(() => ({
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
      "/environment/raw",
      (c: AppContext) => environmentController.getRawEnvironment(c),
      {
        beforeHandle: [verifyToken().beforeHandle],
      },
    );

    this.router.get(
      "/environment/providers",
      (c: AppContext) => environmentController.getProviders(c),
      {
        beforeHandle: [verifyToken().beforeHandle],
      },
    );

    this.router.get(
      "/environment/providers/status",
      (c: AppContext) => environmentController.getProviderStatus(c),
      {
        beforeHandle: [verifyToken().beforeHandle],
      },
    );
  }
}

export default new EnvironmentRoutes().router;
