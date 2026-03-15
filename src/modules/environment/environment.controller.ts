import { AppContext } from "@/contex/appContex";
import { HttpResponse, ErrorHandling } from "@/contex/error";
import environmentService from "@/modules/environment/environment.service";
import { RawEnvironmentQuery } from "@/modules/environment/environment.types";

class EnvironmentController {
  public async getRawEnvironment(c: AppContext) {
    try {
      if (!c.user?.id) return HttpResponse(c).unauthorized("Unauthorized");

      const query = (c.query ?? {}) as RawEnvironmentQuery;
      const data = await environmentService.getRawEnvironment({
        ...query,
        userId: query.userId ?? c.user.id,
      });
      return HttpResponse(c).ok(data, "Raw environmental data fetched");
    } catch (error) {
      return ErrorHandling(c, error);
    }
  }

  public async getProviders(c: AppContext) {
    try {
      if (!c.user?.id) return HttpResponse(c).unauthorized("Unauthorized");

      const data = await environmentService.getProviders();
      return HttpResponse(c).ok(data, "Providers fetched");
    } catch (error) {
      return ErrorHandling(c, error);
    }
  }

  public async getProviderStatus(c: AppContext) {
    try {
      if (!c.user?.id) return HttpResponse(c).unauthorized("Unauthorized");

      const data = await environmentService.getProviderStatuses();
      return HttpResponse(c).ok(data, "Provider status fetched");
    } catch (error) {
      return ErrorHandling(c, error);
    }
  }
}

export default new EnvironmentController();
