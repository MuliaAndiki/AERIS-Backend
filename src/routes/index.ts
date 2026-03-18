import Elysia from "elysia";
import authRoutes from "@/modules/auth/auth.route";
import locationRoutes from "@/modules/location/location.route";
import environmentRoutes from "@/modules/environment/environment.route";
import snapshotRoute from "@/modules/snapshot/snapshot.route";
import scoreRoute from "@/modules/scoring/score.route";
import recommendationRoute from "@/modules/recommendation/recommendation.route";
import insightRoute from "@/modules/insight/insight.route";

export default new Elysia()
  .use(authRoutes)
  .use(locationRoutes)
  .use(environmentRoutes)
  .use(snapshotRoute)
  .use(scoreRoute)
  .use(recommendationRoute)
  .use(insightRoute);
