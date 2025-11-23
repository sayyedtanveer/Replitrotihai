import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import type { Request, Response, NextFunction } from "express";
import type { AdminUser } from "@shared/schema";

const JWT_SECRET = process.env.JWT_SECRET || "admin-jwt-secret-change-in-production";
const JWT_EXPIRES_IN = "24h";
const REFRESH_TOKEN_EXPIRES_IN = "30d";

export interface AdminTokenPayload {
  adminId: string;
  username: string;
  email: string;
  role: string;
}

export interface AuthenticatedAdminRequest extends Request {
  admin?: AdminTokenPayload;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateAccessToken(admin: AdminUser): string {
  const payload: AdminTokenPayload = {
    adminId: admin.id,
    username: admin.username,
    email: admin.email,
    role: admin.role,
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function generateRefreshToken(admin: AdminUser): string {
  const payload: AdminTokenPayload = {
    adminId: admin.id,
    username: admin.username,
    email: admin.email,
    role: admin.role,
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRES_IN });
}

export function verifyToken(token: string): AdminTokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AdminTokenPayload;
  } catch (error) {
    return null;
  }
}

export function requireAdmin(allowedRoles?: string[]) {
  return (req: AuthenticatedAdminRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Session expired. Please log in again.",
        reason: "no_token",
      });
    }

    const token = authHeader.substring(7);

    try {
      const payload = jwt.verify(token, JWT_SECRET) as AdminTokenPayload;

      // ✅ Role-based access control
      if (allowedRoles && !allowedRoles.includes(payload.role)) {
        return res.status(403).json({
          message: "You do not have permission to perform this action.",
          reason: "forbidden",
        });
      }

      req.admin = payload;
      next();
    } catch (error: any) {
      console.error("❌ Admin auth error:", error.message);

      // 🧠 Handle specific token errors
      if (error.name === "TokenExpiredError") {
        return res.status(401).json({
          message: "Session expired. Please log in again.",
          reason: "token_expired",
        });
      }

      if (error.name === "JsonWebTokenError") {
        return res.status(401).json({
          message: "Invalid authentication token. Please log in again.",
          reason: "token_invalid",
        });
      }

      // Generic fallback
      return res.status(401).json({
        message: "Authentication failed. Please log in again.",
        reason: "auth_failed",
      });
    }
  };
}

export function requireSuperAdmin() {
  return requireAdmin(["super_admin"]);
}

export function requireAdminOrManager() {
  return requireAdmin(["super_admin", "manager"]);
}
