// server/replitAuth.ts
// DEV-friendly replacement: disables Replit OIDC and provides a simple session + dev-login

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import createMemoryStore from "memorystore";

// Minimal storage import used by other routes (keep if used elsewhere)
import { storage } from "./storage";

export function getSessionMiddleware() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000;
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
 * setupAuth - replaced for local development.
 * It still wires session + passport so other code that depends on session works.
 * It does NOT perform any OpenID Connect discovery/calls.
 */
export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSessionMiddleware());
  app.use(passport.initialize());
  app.use(passport.session());

  // Minimal serialize/deserialize
  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  // Dev login route: POST /dev-login { id, email, name, role }
  // It sets req.session.passport.user to a simple user object other routes can read.
  app.post("/dev-login", (req, res) => {
    const { id = "dev-user", email = "dev@example.com", name = "Dev User", role = "admin" } =
      req.body || {};
    // match shape others expect: include expires_at far in the future
    const userObj: any = {
      id,
      email,
      name,
      role,
      expires_at: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365,
    };
    // ensure storage has user if your app expects it
    // storage.upsertUser?.({
    //   id: userObj.id,
    //   email: userObj.email,
    //   firstName: userObj.name,
    //   lastName: "",
    //   profileImageUrl: "",
    //   //role: userObj.role,
    // }).catch(() => {});
    // attach to session
    (req as any).session.passport = { user: userObj };
    res.json({ ok: true, user: userObj });
  });

  // Dev logout
  app.post("/dev-logout", (req, res) => {
    req.session.destroy?.(() => {});
    res.json({ ok: true });
  });

  console.log("✅ Replit Auth disabled — running in local dev auth mode");
}

/**
 * isAuthenticated middleware:
 * - In dev mode (USE_REPLIT_AUTH=false) we consider a session user as authenticated.
 * - Otherwise, if there is no session user the middleware responds 401.
 */
export const isAuthenticated: RequestHandler = (req: any, res, next) => {
  // If env explicitly forces real Replit auth, block here (but in this file we assume disabled)
  if (process.env.USE_REPLIT_AUTH === "true") {
    if (!req.isAuthenticated?.() || !req.user) return res.status(401).json({ message: "Unauthorized" });
    return next();
  }

  // Local dev: if session has a passport user, allow; otherwise respond 401.
  const sessionUser = req.session?.passport?.user;
  if (sessionUser) {
    // attach to req.user for compatibility
    req.user = sessionUser;
    return next();
  }

  // No session user — reject (so dev-login is required to access protected routes)
  return res.status(401).json({ message: "Unauthorized (no dev session). POST /dev-login to sign in)" });
};
