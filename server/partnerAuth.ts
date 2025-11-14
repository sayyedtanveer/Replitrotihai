
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import type { Request, Response, NextFunction } from "express";
import type { PartnerUser } from "@shared/schema";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";
const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_TOKEN_EXPIRY = "30d";

export interface PartnerTokenPayload {
  partnerId: string;
  chefId: string;
  username: string;
}

export interface AuthenticatedPartnerRequest extends Request {
  partner?: PartnerTokenPayload;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateAccessToken(partner: PartnerUser): string {
  const payload: PartnerTokenPayload = {
    partnerId: partner.id,
    chefId: partner.chefId,
    username: partner.username,
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
}

export function generateRefreshToken(partner: PartnerUser): string {
  const payload: PartnerTokenPayload = {
    partnerId: partner.id,
    chefId: partner.chefId,
    username: partner.username,
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY });
}

export function verifyToken(token: string): PartnerTokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as PartnerTokenPayload;
  } catch {
    return null;
  }
}

export function requirePartner() {
  return (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const token = authHeader.substring(7);
    const payload = verifyToken(token);

    if (!payload) {
      res.status(401).json({ message: "Invalid or expired token" });
      return;
    }

    (req as AuthenticatedPartnerRequest).partner = payload;
    next();
  };
}
