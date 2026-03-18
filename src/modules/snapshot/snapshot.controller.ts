import { AppContext } from "@/contex/appContex";
import { ErrorHandling, HttpResponse } from "@/contex/error";
import snapshotService from "@/modules/snapshot/snapshot.service";
import {
  GenerateSnapshotBody,
  SnapshotQuery,
} from "@/modules/snapshot/snapshot.types";

class SnapshotController {
  public async getCurrent(c: AppContext) {
    try {
      if (!c.user?.id) return HttpResponse(c).unauthorized();

      const query = (c.query ?? {}) as SnapshotQuery;
      const data = await snapshotService.getCurrent(
        c.user.id,
        query.locationId,
      );
      return HttpResponse(c).ok(data, "Current snapshot fetched");
    } catch (error) {
      return ErrorHandling(c, error);
    }
  }

  public async getHistory(c: AppContext) {
    try {
      if (!c.user?.id) return HttpResponse(c).unauthorized();

      const query = (c.query ?? {}) as SnapshotQuery;
      const data = await snapshotService.getHistory(
        c.user.id,
        query.locationId,
        query.limit,
      );
      return HttpResponse(c).ok(data, "Snapshot history fetched");
    } catch (error) {
      return ErrorHandling(c, error);
    }
  }

  public async getById(c: AppContext) {
    try {
      if (!c.user?.id) return HttpResponse(c).unauthorized();

      const snapshotId = c.params?.snapshotId as string;
      if (!snapshotId)
        return HttpResponse(c).badRequest("snapshotId is required");

      const data = await snapshotService.getById(c.user.id, snapshotId);
      return HttpResponse(c).ok(data, "Snapshot detail fetched");
    } catch (error) {
      return ErrorHandling(c, error);
    }
  }

  public async generate(c: AppContext) {
    try {
      if (!c.user?.id) return HttpResponse(c).unauthorized();

      const body = (c.body ?? {}) as GenerateSnapshotBody;
      const data = await snapshotService.generate(c.user.id, body.locationId);
      return HttpResponse(c).created(data, "Snapshot generated");
    } catch (error) {
      return ErrorHandling(c, error);
    }
  }

  public refreshCache(c: AppContext) {
    try {
      if (!c.user?.id) return HttpResponse(c).unauthorized();

      const removed = snapshotService.refreshCache(c.user.id);
      return HttpResponse(c).accepted({ removed }, "Snapshot cache refreshed");
    } catch (error) {
      return ErrorHandling(c, error);
    }
  }
}

export default new SnapshotController();
