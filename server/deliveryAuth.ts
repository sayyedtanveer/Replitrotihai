import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import type { Request, Response, NextFunction } from "express";
import type { DeliveryPersonnel } from "@shared/schema";

const JWT_SECRET = process.env.JWT_SECRET || "delivery-jwt-secret-change-in-production";
const JWT_EXPIRES_IN = "7d";

export interface DeliveryTokenPayload {
  deliveryId: string;
  name: string;
  phone: string;
}

export interface AuthenticatedDeliveryRequest extends Request {
  delivery?: DeliveryTokenPayload;
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

export function generateDeliveryToken(deliveryPerson: DeliveryPersonnel): string {
  const payload: DeliveryTokenPayload = {
    deliveryId: deliveryPerson.id,
    name: deliveryPerson.name,
    phone: deliveryPerson.phone,
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): DeliveryTokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as DeliveryTokenPayload;
  } catch (error) {
    return null;
  }
}

export function requireDeliveryAuth() {
  return (req: AuthenticatedDeliveryRequest, res: Response, next: NextFunction) => {
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

    req.delivery = payload;
    next();
  };
}
