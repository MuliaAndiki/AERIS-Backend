import { describe, expect, it } from "bun:test";

import { requireRole, verifyToken } from "@/middlewares/auth";

describe("auth middleware", () => {
  it("verifyToken returns 401 when Authorization header is missing", async () => {
    const middleware = verifyToken();

    const c = {
      request: {
        headers: {
          get: () => null,
        },
      },
      json: (data: unknown, status: number) => ({ data, status }),
    } as any;

    const response = await middleware.beforeHandle(c);

    expect(response.status).toBe(401);
    expect(response.data.message).toBe("Access denied. No token provided.");
  });

  it("requireRole returns 403 when role does not match", () => {
    const middleware = requireRole(["ADMIN"]);

    const c = {
      user: {
        role: "USER",
      },
      json: (data: unknown, status: number) => ({ data, status }),
    } as any;

    const response = middleware.beforeHandle(c);

    expect(response.status).toBe(403);
  });
});
