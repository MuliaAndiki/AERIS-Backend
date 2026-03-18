import { Elysia, t } from "elysia";
import { AppContext } from "@/contex/appContex";
import { verifyToken } from "@/middlewares/auth";
import snapshotController from "@/modules/snapshot/snapshot.controller";

class SnapshotRoute {
  public router;

  constructor() {
    this.router = new Elysia({ prefix: "/environment/snapshot" }).derive(
      () => ({
        json(data: unknown, status = 200) {
          return new Response(JSON.stringify(data), {
            status,
            headers: { "Content-Type": "application/json" },
          });
        },
      }),
    );

    this.routes();
  }

  private routes() {
    this.router.get(
      "/current",
      (c: AppContext) => snapshotController.getCurrent(c),
      {
        beforeHandle: [verifyToken().beforeHandle],
        query: t.Object({
          locationId: t.Optional(t.String()),
        }),
        detail: {
          tags: ["Snapshot"],
          summary: "Get current environmental snapshot",
        },
      },
    );

    this.router.get(
      "/history",
      (c: AppContext) => snapshotController.getHistory(c),
      {
        beforeHandle: [verifyToken().beforeHandle],
        query: t.Object({
          locationId: t.Optional(t.String()),
          limit: t.Optional(t.String()),
        }),
        detail: {
          tags: ["Snapshot"],
          summary: "Get snapshot history",
        },
      },
    );

    this.router.get(
      "/:snapshotId",
      (c: AppContext) => snapshotController.getById(c),
      {
        beforeHandle: [verifyToken().beforeHandle],
        params: t.Object({
          snapshotId: t.String(),
        }),
        detail: {
          tags: ["Snapshot"],
          summary: "Get snapshot detail by id",
        },
      },
    );

    this.router.post(
      "/generate",
      (c: AppContext) => snapshotController.generate(c),
      {
        beforeHandle: [verifyToken().beforeHandle],
        body: t.Object({
          locationId: t.Optional(t.String()),
        }),
        detail: {
          tags: ["Snapshot"],
          summary: "Generate new snapshot",
        },
      },
    );

    this.router.post(
      "/cache/refresh",
      (c: AppContext) => snapshotController.refreshCache(c),
      {
        beforeHandle: [verifyToken().beforeHandle],
        body: t.Object({}),
        detail: {
          tags: ["Snapshot"],
          summary: "Refresh snapshot cache",
        },
      },
    );
  }
}

export default new SnapshotRoute().router;
