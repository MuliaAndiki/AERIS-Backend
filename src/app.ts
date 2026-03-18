import Elysia from "elysia";
import cors from "@elysiajs/cors";
import swagger from "@elysiajs/swagger";
import apiRoutes from "@/routes";

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
    this.app.use(
      swagger({
        path: "/docs",
        documentation: {
          info: {
            title: "AERIS Backend API",
            version: "1.0.0",
            description: "API documentation for AERIS backend service",
          },
          tags: [
            { name: "Auth", description: "Authentication endpoints" },
            { name: "Snapshot", description: "Snapshot endpoints" },
            { name: "Scoring", description: "Scoring endpoints" },
            {
              name: "Recommendation",
              description: "Recommendation endpoints",
            },
            { name: "Insight", description: "Insight endpoints" },
            {
              name: "Environment",
              description: "Location and environmental data endpoints",
            },
          ],
        },
      }),
    );
    this.app.group("/api", (api) => api.use(apiRoutes));
  }
}

export default new App().app;
