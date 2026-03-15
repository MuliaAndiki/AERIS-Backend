import Elysia from "elysia";
import authRoutes from "@/modules/auth/auth.route";
import locationRoutes from "@/modules/location/location.route";
import environmentRoutes from "@/modules/environment/environment.route";

export default new Elysia()
  .use(authRoutes)
  .use(locationRoutes)
  .use(environmentRoutes);
