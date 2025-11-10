// server/auth.ts
// Unified authentication module — supports JWT for users and dev session for local testing.

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import createMemoryStore from "memorystore";
import jwt from "jsonwebtoken";
import { storage } from "./storage"; // Keep if used elsewhere

// ===============================================================
// 🧩 Session Setup (for development/testing mode)
// ===============================================================

export function getSessionMiddleware() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 7 days
  const MemoryStore = createMemoryStore(session);
  const sessionStore = new MemoryStore({ checkPeriod: sessionTtl });

  return session({
    secret: process.env.SESSION_SECRET ?? "dev-secret-change-in-production",
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: sessionTtl,
    },
  });
}

/**
 * setupAuth - initializes session + passport for dev mode.
 * ✅ Use POST /dev-login for local dev session
 * 🚫 Replit Auth removed (not needed for JWT flow)
 */
export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSessionMiddleware());
  app.use(passport.initialize());
  app.use(passport.session());

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  // -----------------------------------------------
  // 🧪 Dev login route (for testing only)
  // -----------------------------------------------
  app.post("/dev-login", (req, res) => {
    const {
      id = "dev-user",
      email = "dev@example.com",
      name = "Dev User",
      role = "admin",
    } = req.body || {};

    const userObj: any = {
      id,
      email,
      name,
      role,
      expires_at: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365, // 1 year
    };

    (req as any).session.passport = { user: userObj };
    res.json({ ok: true, user: userObj });
  });

  // Dev logout route
  app.post("/dev-logout", (req, res) => {
    req.session.destroy?.(() => {});
    res.json({ ok: true });
  });

  console.log("✅ Auth configured — running in local dev auth + JWT mode");
}

// ===============================================================
// 🧩 JWT Auth Middleware (used for all production/user routes)
// ===============================================================

export const jwtAuth: RequestHandler = async (req: any, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Missing or invalid Authorization header" });
    }

    const token = authHeader.split(" ")[1];
    const secret = process.env.JWT_SECRET ?? "dev_jwt_secret_change_me";

    const payload = jwt.verify(token, secret) as { userId: string };

    if (!payload?.userId) {
      return res.status(401).json({ message: "Invalid token payload" });
    }

    // Attach the user object to req for route handlers
    req.user = await storage.getUser(payload.userId);
    if (!req.user) {
      return res.status(404).json({ message: "User not found" });
    }

    next();
  } catch (err: any) {
    console.error("JWT verification failed:", err.message);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

// ===============================================================
// 🧩 Dev Session Auth Middleware (for local testing only)
// ===============================================================

export const isAuthenticated: RequestHandler = (req: any, res, next) => {
  const sessionUser = req.session?.passport?.user;
  if (sessionUser) {
    req.user = sessionUser;
    return next();
  }

  return res
    .status(401)
    .json({
      message: "Unauthorized. Use /dev-login to sign in for local testing or provide JWT token.",
    });
};
