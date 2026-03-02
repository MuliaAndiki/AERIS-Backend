import Elysia from "elysia";
import AuthController from "@/controllers/AuthController";

class AuthRouter {
  public authRouter;

  constructor() {
    this.authRouter = new Elysia({ prefix: "/auth" });
    this.routes();
  }

  private routes() {
    this.authRouter.post("/login", (c) => AuthController.login(c));
    this.authRouter.post("/register", (c) => AuthController.register(c));
  }
}

export default new AuthRouter().authRouter;
