import { AppContext } from "@/context/appContext";
import { ErrorHandling, HttpResponse } from "@/context/error";
import locationService from "@/modules/location/location.service";
import {
  DetectLocationQuery,
  ResolveLocationBody,
} from "@/modules/location/location.types";

class LocationController {
  public detect(c: AppContext) {
    try {
      const query = (c.query ?? {}) as DetectLocationQuery;
      const data = locationService.detectLocation(c.request.headers, query);
      return HttpResponse(c).ok(data, "Location detected");
    } catch (error) {
      return ErrorHandling(c, error);
    }
  }

  public async search(c: AppContext) {
    try {
      const query = (c.query ?? {}) as { query?: string };
      const data = await locationService.searchLocations(query.query || "");
      return HttpResponse(c).ok(data, "Locations found");
    } catch (error) {
      return ErrorHandling(c, error);
    }
  }

  public async resolve(c: AppContext) {
    try {
      if (!c.user?.id) return HttpResponse(c).unauthorized("Unauthorized");

      const body = c.body as ResolveLocationBody;
      const data = await locationService.resolveLocation(body, c.user);
      return HttpResponse(c).created(data, "Location resolved");
    } catch (error) {
      return ErrorHandling(c, error);
    }
  }
}

export default new LocationController();
