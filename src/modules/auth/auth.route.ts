import Elysia from "elysia";
import AuthController from "@/modules/auth/auth.controller";
import { AppContext } from "@/contex/appContex";
import { verifyToken } from "@/middlewares/auth";

class AuthRouter {
  public authRouter;

  constructor() {
    this.authRouter = new Elysia({ prefix: "/auth" }).derive(() => ({
      json(data: any, status = 200) {
        return new Response(JSON.stringify(data), {
          status,
          headers: { "Content-Type": "application/json" },
        });
      },
    }));
    this.routes();
  }

  private routes() {
    this.authRouter.post("/login", (c: AppContext) => AuthController.login(c));
    this.authRouter.post("/register", (c: AppContext) =>
      AuthController.register(c),
    );
    this.authRouter.post(
      "/logout",
      (c: AppContext) => AuthController.logout(c),
      {
        beforeHandle: [verifyToken().beforeHandle],
      },
    );
    this.authRouter.post("/forgot", (c: AppContext) =>
      AuthController.forgotPassword(c),
    );

    this.authRouter.post("/verifyOtp", (c: AppContext) =>
      AuthController.verifyOtp(c),
    );
    this.authRouter.post("/resend", (c: AppContext) =>
      AuthController.resendOtp(c),
    );
    this.authRouter.post("/reset-password", (c: AppContext) =>
      AuthController.resetPassword(c),
    );
    // this.authRouter.post("/google-login", (c: AppContext) =>
    //   AuthController.LoginWithGoogle(c),
    // );
  }
}

export default new AuthRouter().authRouter;
