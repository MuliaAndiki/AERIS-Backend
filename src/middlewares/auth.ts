import jwt from "jsonwebtoken";
import { JwtPayload } from "../types/auth.types";
import { env } from "@/config/env.config";

export const verifyToken = () => ({
  beforeHandle: async (c: any) => {
    try {
      const authHeader = c.request.headers.get("authorization");
      const token = authHeader?.split(" ")[1];

      if (!token) {
        return c.json(
          { status: 401, message: "Access denied. No token provided." },
          401,
        );
      }

      if (!env.JWT_SECRET) {
        console.error("JWT_SECRET is not defined in environment variables");
        return c.json(
          { status: 500, message: "Server configuration error." },
          500,
        );
      }

      const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
      c.user = decoded;
    } catch (error: any) {
      if (error.name === "TokenExpiredError") {
        return c.json({ status: 401, message: "Token has expired." }, 401);
      } else if (error.name === "JsonWebTokenError") {
        return c.json({ status: 403, message: "Invalid token." }, 403);
      } else {
        console.error("JWT verification error:", error);
        return c.json(
          { status: 500, message: "Token verification failed." },
          500,
        );
      }
    }
  },
});

export const requireRole = (roles: string[]) => ({
  beforeHandle: (c: any) => {
    if (!c.user || !roles.includes(c.user.role)) {
      return c.json(
        { status: 403, message: "Akses ditolak. Role tidak sesuai." },
        403,
      );
    }
  },
});
