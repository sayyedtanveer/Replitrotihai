import "./env";
import express, { type Request, Response, NextFunction } from "express";
import cookieParser from "cookie-parser";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { generateAccessToken, generateRefreshToken, verifyPassword } from "./partnerAuth";
import { storage } from "./storage";

const app = express();
console.log("🚀 Server is starting...");
debugger;
declare module 'http' {
  interface IncomingMessage {
    rawBody: unknown
  }
}
app.use(express.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Create default admin user on startup
  const { storage } = await import("./storage");
  const { hashPassword } = await import("./adminAuth");

  try {
    const existingAdmin = await storage.getAdminByUsername("admin");
    if (!existingAdmin) {
      const passwordHash = await hashPassword("admin123");
      await storage.createAdmin({
        username: "admin",
        email: "admin@rotihai.com",
        role: "super_admin",
        passwordHash,
      } as any);
      log("Default admin user created successfully");
    }
  } catch (error: any) {
    log("Failed to create default admin user:", error?.message || error);
  }

  const server = await registerRoutes(app);

  // Partner auth routes
  app.post("/api/partner/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      console.log("🔐 Partner login attempt:", { username });

      // Validate input
      if (!username || typeof username !== 'string' || username.trim().length === 0) {
        console.log("❌ Invalid username");
        res.status(400).json({ message: "Valid username is required" });
        return;
      }

      if (!password || typeof password !== 'string' || password.length === 0) {
        console.log("❌ Invalid password");
        res.status(400).json({ message: "Valid password is required" });
        return;
      }

      const trimmedUsername = username.trim().toLowerCase();

      const partner = await storage.getPartnerByUsername(trimmedUsername);
      if (!partner) {
        console.log("❌ Partner not found:", trimmedUsername);
        res.status(401).json({ message: "Invalid credentials" });
        return;
      }

      console.log("✅ Partner found:", { id: partner.id, username: partner.username });

      // Verify password hash exists
      if (!partner.passwordHash) {
        console.log("❌ No password hash found for partner:", trimmedUsername);
        res.status(500).json({ message: "Account configuration error. Please contact admin." });
        return;
      }

      const isValid = await verifyPassword(password, partner.passwordHash);
      console.log("🔑 Password verification:", isValid);
      
      if (!isValid) {
        console.log("❌ Invalid password for:", trimmedUsername);
        res.status(401).json({ message: "Invalid credentials" });
        return;
      }

      // Verify chef exists
      const chef = await storage.getChefById(partner.chefId);
      if (!chef) {
        console.log("❌ Chef not found for partner:", partner.chefId);
        res.status(500).json({ message: "Account configuration error. Please contact admin." });
        return;
      }

      await storage.updatePartnerLastLogin(partner.id);

      const accessToken = generateAccessToken(partner);
      const refreshToken = generateRefreshToken(partner);

      res.cookie("partnerRefreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      res.json({
        accessToken,
        partner: {
          id: partner.id,
          username: partner.username,
          email: partner.email,
          chefId: partner.chefId,
          chefName: chef.name,
        },
      });
    } catch (error) {
      console.error("Partner login error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();