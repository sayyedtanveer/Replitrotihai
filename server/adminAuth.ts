import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import type { Request, Response, NextFunction } from "express";
import type { AdminUser } from "@shared/schema";

const JWT_SECRET = process.env.JWT_SECRET || "admin-jwt-secret-change-in-production";
const JWT_EXPIRES_IN = "15m";
const REFRESH_TOKEN_EXPIRES_IN = "7d";

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
      res.status(401).json({ message: "No token provided" });
      return;
    }

    const token = authHeader.substring(7);
    const payload = verifyToken(token);

    if (!payload) {
      res.status(401).json({ message: "Invalid or expired token" });
      return;
    }

    if (allowedRoles && !allowedRoles.includes(payload.role)) {
      res.status(403).json({ message: "Insufficient permissions" });
      return;
    }

    req.admin = payload;
    next();
  };
}

export function requireSuperAdmin() {
  return requireAdmin(["super_admin"]);
}

export function requireAdminOrManager() {
  return requireAdmin(["super_admin", "manager"]);
}
