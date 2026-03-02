import Elysia from "elysia";
import cors from "@elysiajs/cors";
import autnRoutes from "./routes/autnRoutes";

class App {
  public app: Elysia;

  constructor() {
    this.app = new Elysia();
    this.middlewares();
    this.routes();
  }
  private routes(): void {
    this.app.get("/", () => "Hello Elysia! Bun js");
  }
  private middlewares() {
    this.app.use(cors({ origin: "*" }));
    this.app.use(autnRoutes);
  }
}

export default new App().app;
