import { Elysia, t } from "elysia";
import AuthController from "@/modules/auth/auth.controller";
import { AppContext } from "@/contex/appContex";
import { verifyToken } from "@/middlewares/auth";

class AuthRoute {
  public router;

  constructor() {
    this.router = new Elysia({ prefix: "/auth" }).derive(() => ({
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
    this.router.post("/login", (c: AppContext) => AuthController.login(c), {
      body: t.Object({
        email: t.Optional(t.String({ format: "email" })),
        phone: t.Optional(t.String()),
        password: t.String(),
      }),
      detail: {
        tags: ["Auth"],
        summary: "Login with email or phone",
      },
    });

    this.router.post(
      "/register",
      (c: AppContext) => AuthController.register(c),
      {
        body: t.Object({
          fullName: t.String(),
          password: t.String(),
          email: t.Optional(t.String({ format: "email" })),
          phone: t.Optional(t.String()),
          role: t.Optional(t.Union([t.Literal("USER"), t.Literal("ADMIN")])),
        }),
        detail: {
          tags: ["Auth"],
          summary: "Register user account",
        },
      },
    );

    this.router.post("/logout", (c: AppContext) => AuthController.logout(c), {
      beforeHandle: [verifyToken().beforeHandle],
      body: t.Optional(t.Object({})),
      detail: {
        tags: ["Auth"],
        summary: "Logout current user",
      },
    });

    this.router.post(
      "/forgot",
      (c: AppContext) => AuthController.forgotPassword(c),
      {
        body: t.Object({
          email: t.Optional(t.String({ format: "email" })),
          phone: t.Optional(t.String()),
        }),
        detail: {
          tags: ["Auth"],
          summary: "Request forgot password OTP",
        },
      },
    );

    this.router.post(
      "/verifyOtp",
      (c: AppContext) => AuthController.verifyOtp(c),
      {
        body: t.Object({
          email: t.String({ format: "email" }),
          otp: t.String(),
        }),
        detail: {
          tags: ["Auth"],
          summary: "Verify OTP code",
        },
      },
    );

    this.router.post(
      "/resend",
      (c: AppContext) => AuthController.resendOtp(c),
      {
        body: t.Object({
          email: t.String({ format: "email" }),
        }),
        detail: {
          tags: ["Auth"],
          summary: "Resend OTP code",
        },
      },
    );

    this.router.post(
      "/reset-password",
      (c: AppContext) => AuthController.resetPassword(c),
      {
        body: t.Object({
          email: t.Optional(t.String({ format: "email" })),
          phone: t.Optional(t.String()),
          password: t.String(),
        }),
        detail: {
          tags: ["Auth"],
          summary: "Reset user password",
        },
      },
    );
    // this.authRouter.post("/google-login", (c: AppContext) =>
    //   AuthController.LoginWithGoogle(c),
    // );
  }
}

export default new AuthRoute().router;
