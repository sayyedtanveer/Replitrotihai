import type { Express } from "express";
import { storage } from "./storage";
import {
  hashPassword,
  verifyPassword,
  generateAccessToken,
  generateRefreshToken,
  requirePartner,
  verifyToken,
  type AuthenticatedPartnerRequest,
} from "./partnerAuth";
import { partnerLoginSchema } from "@shared/schema";
import { fromZodError } from "zod-validation-error";
import { broadcastOrderUpdate } from "./websocket";

export function registerPartnerRoutes(app: Express) {
  app.post("/api/partner/auth/login", async (req, res) => {
    try {
      const validation = partnerLoginSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({ message: fromZodError(validation.error).toString() });
        return;
      }

      const { username, password } = validation.data;
      const partner = await storage.getPartnerByUsername(username);

      if (!partner) {
        res.status(401).json({ message: "Invalid credentials" });
        return;
      }

      const isPasswordValid = await verifyPassword(password, partner.passwordHash);
      if (!isPasswordValid) {
        res.status(401).json({ message: "Invalid credentials" });
        return;
      }

      await storage.updatePartnerLastLogin(partner.id);

      const accessToken = generateAccessToken(partner);
      const refreshToken = generateRefreshToken(partner);

      res.cookie("partnerRefreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      const chef = await storage.getChefById(partner.chefId);

      res.json({
        accessToken,
        partner: {
          id: partner.id,
          username: partner.username,
          email: partner.email,
          chefId: partner.chefId,
          chefName: chef?.name,
        },
      });
    } catch (error) {
      console.error("Partner login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.post("/api/partner/auth/logout", (req, res) => {
    res.clearCookie("partnerRefreshToken");
    res.json({ message: "Logged out successfully" });
  });

  app.post("/api/partner/auth/refresh", async (req, res) => {
    try {
      const refreshToken = req.cookies.partnerRefreshToken;

      if (!refreshToken) {
        res.status(401).json({ message: "No refresh token" });
        return;
      }

      const payload = verifyToken(refreshToken);
      if (!payload) {
        res.status(401).json({ message: "Invalid refresh token" });
        return;
      }

      const partner = await storage.getPartnerById(payload.partnerId);
      if (!partner) {
        res.status(401).json({ message: "Partner not found" });
        return;
      }

      const newAccessToken = generateAccessToken(partner);
      const newRefreshToken = generateRefreshToken(partner);

      res.cookie("partnerRefreshToken", newRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      const chef = await storage.getChefById(partner.chefId);

      res.json({
        accessToken: newAccessToken,
        partner: {
          id: partner.id,
          username: partner.username,
          email: partner.email,
          chefId: partner.chefId,
          chefName: chef?.name,
        },
      });
    } catch (error) {
      console.error("Token refresh error:", error);
      res.status(401).json({ message: "Token refresh failed" });
    }
  });

  app.get("/api/partner/dashboard/metrics", requirePartner(), async (req, res) => {
    try {
      const partnerReq = req as AuthenticatedPartnerRequest;
      const chefId = partnerReq.partner!.chefId;
      const metrics = await storage.getPartnerDashboardMetrics(chefId);
      res.json(metrics);
    } catch (error) {
      console.error("Partner dashboard metrics error:", error);
      res.status(500).json({ message: "Failed to fetch metrics" });
    }
  });

  app.get("/api/partner/orders", requirePartner(), async (req, res) => {
    try {
      const partnerReq = req as AuthenticatedPartnerRequest;
      const chefId = partnerReq.partner!.chefId;
      const orders = await storage.getOrdersByChefId(chefId);
      res.json(orders);
    } catch (error) {
      console.error("Get partner orders error:", error);
      res.status(500).json({ message: "Failed to fetch orders" });
    }
  });

  app.get("/api/partner/chef", requirePartner(), async (req, res) => {
    try {
      const partnerReq = req as AuthenticatedPartnerRequest;
      const chefId = partnerReq.partner!.chefId;
      const chef = await storage.getChefById(chefId);

      if (!chef) {
        res.status(404).json({ message: "Chef not found" });
        return;
      }

      res.json(chef);
    } catch (error) {
      console.error("Get partner chef error:", error);
      res.status(500).json({ message: "Failed to fetch chef details" });
    }
  });

  app.patch("/api/partner/orders/:id/status", requirePartner, async (req: any, res) => {
    try {
      const { status } = req.body;
      const chefId = req.partner.chefId;
      const order = await storage.getOrderById(req.params.id);

      if (!order || order.chefId !== chefId) {
        res.status(404).json({ message: "Order not found" });
        return;
      }

      const updatedOrder = await storage.updateOrder(req.params.id, { status });

      // Log chef status update
      if (status === "preparing") {
        console.log(`
╔════════════════════════════════════════════════════════════════
║ 👨‍🍳 CHEF ACCEPTED ORDER
╠════════════════════════════════════════════════════════════════
║ Order ID: ${updatedOrder.id.slice(0, 8)}
║ Chef: ${req.partner.chefId}
║ Status: Preparing
║ Time: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
╠════════════════════════════════════════════════════════════════
║ 📱 Notification sent to admin & delivery partners
╚════════════════════════════════════════════════════════════════
        `);
      } else if (status === "out_for_delivery") {
        console.log(`
╔════════════════════════════════════════════════════════════════
║ 🚚 ORDER READY FOR DELIVERY
╠════════════════════════════════════════════════════════════════
║ Order ID: ${updatedOrder.id.slice(0, 8)}
║ Status: Ready for pickup
║ Time: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
╠════════════════════════════════════════════════════════════════
║ 📱 Notification sent to delivery partners
╚════════════════════════════════════════════════════════════════
        `);
      }

      broadcastOrderUpdate(updatedOrder);

      res.json(updatedOrder);
    } catch (error) {
      console.error("Error updating order status:", error);
      res.status(500).json({ message: "Failed to update order status" });
    }
  });
}