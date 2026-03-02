import Elysia, { t } from "elysia";
import jwt from "jsonwebtoken";
import { JwtPayload } from "../types/auth.types";

export const verifyToken = () => ({
  onRequest: (c: any) => {
    try {
      const authHeader = c.req.headers.get("authorization");
      const token = authHeader?.split(" ")[1];

      if (!token) {
        return c.text("Access denied. No token provided.", 401);
      }

      if (!process.env.JWT_SECRET) {
        console.error("JWT_SECRET is not defined in environment variables");
        return c.text("Server configuration error.", 500);
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET) as JwtPayload;

      c.user = decoded;
    } catch (error: any) {
      if (error.name === "TokenExpiredError") {
        return c.text("Token has expired.", 401);
      } else if (error.name === "JsonWebTokenError") {
        return c.text("Invalid token.", 403);
      } else {
        console.error("JWT verification error:", error);
        return c.text("Token verification failed.", 500);
      }
    }
  },
});

export const requireRole = (roles: string[]) => ({
  onRequest: (c: any) => {
    if (!c.user || !roles.includes(c.user.role)) {
      return c.text("Akses ditolak. Role tidak sesuai.", 403);
    }
  },
});
