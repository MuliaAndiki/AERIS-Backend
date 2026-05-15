import { Elysia, t } from "elysia";
import userController from "@/modules/user/user.controller";
import { AppContext } from "@/context/appContext";
import { verifyToken } from "@/middlewares/auth";

class UserRoutes {
  public router;

  constructor() {
    this.router = new Elysia({ prefix: "/user" }).derive(() => ({
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
      "/me",
      (c: AppContext) => userController.getMe(c),
      {
        beforeHandle: [verifyToken().beforeHandle],
        detail: {
          tags: ["User"],
          summary: "Get current user profile",
        },
      },
    );

    this.router.put(
      "/edit-profile",
      (c: AppContext) => userController.editProfile(c),
      {
        beforeHandle: [verifyToken().beforeHandle],
        body: t.Object({
          fullName: t.Optional(t.String()),
          email: t.Optional(t.String({ format: "email" })),
          phone: t.Optional(t.String()),
          avaUrl: t.Optional(t.String()),
        }),
        detail: {
          tags: ["User"],
          summary: "Update user profile",
        },
      },
    );
  }
}

export default new UserRoutes().router;
