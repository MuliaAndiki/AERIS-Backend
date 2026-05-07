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

  public async reverse(c: AppContext) {
    try {
      const query = (c.query ?? {}) as { latitude?: string; longitude?: string };
      const lat = parseFloat(query.latitude || "0");
      const lon = parseFloat(query.longitude || "0");
      const data = await locationService.reverseGeocode(lat, lon);
      return HttpResponse(c).ok(data, "Location reverse geocoded");
    } catch (error) {
      return ErrorHandling(c, error);
    }
  }
}

export default new LocationController();
