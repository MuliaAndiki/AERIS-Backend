import jwt from "jsonwebtoken";
import { JwtPayload } from "@/modules/auth/auth.types";
import { env } from "@/config/env";

// Simple LRU cache implementation for JWT tokens
class TokenCache {
  private cache = new Map<string, { payload: JwtPayload; expiresAt: number }>();
  private maxSize = 1000;
  private ttl = 5 * 60 * 1000; // 5 minutes

  get(token: string): JwtPayload | null {
    const entry = this.cache.get(token);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(token);
      return null;
    }

    // Move to end (LRU)
    this.cache.delete(token);
    this.cache.set(token, entry);
    return entry.payload;
  }

  set(token: string, payload: JwtPayload): void {
    // Enforce max size
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }

    this.cache.set(token, {
      payload,
      expiresAt: Date.now() + this.ttl,
    });
  }

  delete(token: string): void {
    this.cache.delete(token);
  }

  clear(): void {
    this.cache.clear();
  }
}

const tokenCache = new TokenCache();

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

      // Check cache first
      let decoded = tokenCache.get(token);

      if (!decoded) {
        // Verify and cache
        decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
        tokenCache.set(token, decoded);
      }

      c.user = decoded;
    } catch (error: any) {
      // Clear from cache on error
      const token = c.request.headers.get("authorization")?.split(" ")[1];
      if (token) tokenCache.delete(token);

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
