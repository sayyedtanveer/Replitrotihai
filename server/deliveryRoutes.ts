import type { Express } from "express";
import { storage } from "./storage";
import { hashPassword, verifyPassword, generateDeliveryToken, requireDeliveryAuth, type AuthenticatedDeliveryRequest, generateRefreshToken, verifyToken } from "./deliveryAuth";
import { deliveryPersonnelLoginSchema, insertDeliveryPersonnelSchema } from "@shared/schema";
import { broadcastOrderUpdate, notifyDeliveryAssignment } from "./websocket";

export function registerDeliveryRoutes(app: Express) {
  app.post("/api/delivery/login", async (req, res) => {
    try {
      const result = deliveryPersonnelLoginSchema.safeParse(req.body);
      if (!result.success) {
        res.status(400).json({ message: "Invalid credentials", errors: result.error });
        return;
      }

      const { phone, password } = result.data;
      const deliveryPerson = await storage.getDeliveryPersonnelByPhone(phone);

      if (!deliveryPerson || !deliveryPerson.isActive) {
        res.status(401).json({ message: "Invalid phone or password" });
        return;
      }

      const isValid = await verifyPassword(password, deliveryPerson.passwordHash);
      if (!isValid) {
        res.status(401).json({ message: "Invalid phone or password" });
        return;
      }

      await storage.updateDeliveryPersonnelLastLogin(deliveryPerson.id);

      const token = generateDeliveryToken(deliveryPerson);
      const refreshToken = generateRefreshToken(deliveryPerson);

      res.cookie("deliveryRefreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      });

      const { passwordHash, ...deliveryData } = deliveryPerson;

      res.json({
        token,
        deliveryPerson: deliveryData,
      });
    } catch (error) {
      console.error("Delivery login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.get("/api/delivery/profile", requireDeliveryAuth(), async (req: AuthenticatedDeliveryRequest, res) => {
    try {
      const deliveryPerson = await storage.getDeliveryPersonnelById(req.delivery!.deliveryId);
      if (!deliveryPerson) {
        res.status(404).json({ message: "Delivery person not found" });
        return;
      }

      const { passwordHash, ...deliveryData } = deliveryPerson;
      res.json(deliveryData);
    } catch (error) {
      console.error("Error fetching delivery profile:", error);
      res.status(500).json({ message: "Failed to fetch profile" });
    }
  });

  app.get("/api/delivery/orders", requireDeliveryAuth(), async (req: AuthenticatedDeliveryRequest, res) => {
    try {
      const deliveryPersonId = req.delivery!.deliveryId;
      const orders = await storage.getOrdersByDeliveryPerson(deliveryPersonId);
      res.json(orders);
    } catch (error) {
      console.error("Error fetching delivery orders:", error);
      res.status(500).json({ message: "Failed to fetch orders" });
    }
  });

  app.post("/api/delivery/orders/:id/accept", requireDeliveryAuth(), async (req: AuthenticatedDeliveryRequest, res) => {
    try {
      const orderId = req.params.id;
      const deliveryPersonId = req.delivery!.deliveryId;

      const order = await storage.getOrderById(orderId);
      if (!order) {
        res.status(404).json({ message: "Order not found" });
        return;
      }

      if (order.assignedTo !== deliveryPersonId) {
        res.status(403).json({ message: "Order not assigned to you" });
        return;
      }

      if (order.status !== "assigned" && order.status !== "prepared") {
        res.status(400).json({ message: "Order cannot be accepted in current status" });
        return;
      }

      // Update status to accepted_by_delivery when delivery person accepts
      const updatedOrder = await storage.updateOrderStatus(orderId, "accepted_by_delivery");

      if (updatedOrder) {
        console.log(`
╔════════════════════════════════════════════════════════════════
║ 🚚 ORDER ACCEPTED BY DELIVERY PERSON
╠════════════════════════════════════════════════════════════════
║ Order ID: ${updatedOrder.id.slice(0, 8)}
║ Delivery Person: ${updatedOrder.deliveryPersonName}
║ Customer: ${updatedOrder.customerName}
║ Status: ${updatedOrder.status}
║ Time: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
╚════════════════════════════════════════════════════════════════
        `);

        broadcastOrderUpdate(updatedOrder);
      }

      res.json(updatedOrder);
    } catch (error) {
      console.error("Error accepting order:", error);
      res.status(500).json({ message: "Failed to accept order" });
    }
  });

  app.post("/api/delivery/orders/:id/reject", requireDeliveryAuth(), async (req: AuthenticatedDeliveryRequest, res) => {
    try {
      const orderId = req.params.id;
      const deliveryPersonId = req.delivery!.deliveryId;
      const { reason } = req.body;

      const order = await storage.getOrderById(orderId);
      if (!order) {
        res.status(404).json({ message: "Order not found" });
        return;
      }

      if (order.assignedTo !== deliveryPersonId) {
        res.status(403).json({ message: "Order not assigned to you" });
        return;
      }

      // Unassign delivery person and move back to prepared/assigned status
      const updatedOrder = await storage.unassignDeliveryPerson(orderId, reason || "Rejected by delivery person");

      if (updatedOrder) {
        console.log(`
╔════════════════════════════════════════════════════════════════
║ ❌ ORDER REJECTED BY DELIVERY PERSON
╠════════════════════════════════════════════════════════════════
║ Order ID: ${updatedOrder.id.slice(0, 8)}
║ Delivery Person: ${order.deliveryPersonName}
║ Reason: ${reason || "No reason provided"}
║ Status: ${updatedOrder.status}
║ Time: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
╚════════════════════════════════════════════════════════════════
        `);

        broadcastOrderUpdate(updatedOrder);
      }

      res.json(updatedOrder);
    } catch (error) {
      console.error("Error rejecting order:", error);
      res.status(500).json({ message: "Failed to reject order" });
    }
  });

  app.post("/api/delivery/orders/:id/pickup", requireDeliveryAuth(), async (req: AuthenticatedDeliveryRequest, res) => {
    try {
      const orderId = req.params.id;
      const deliveryPersonId = req.delivery!.deliveryId;

      const order = await storage.getOrderById(orderId);
      if (!order) {
        res.status(404).json({ message: "Order not found" });
        return;
      }

      if (order.assignedTo !== deliveryPersonId) {
        res.status(403).json({ message: "Order not assigned to you" });
        return;
      }

      const updatedOrder = await storage.updateOrderPickup(orderId);

      if (updatedOrder) {
        broadcastOrderUpdate(updatedOrder);
      }

      res.json(updatedOrder);
    } catch (error) {
      console.error("Error marking pickup:", error);
      res.status(500).json({ message: "Failed to mark pickup" });
    }
  });

  app.post("/api/delivery/orders/:id/deliver", requireDeliveryAuth(), async (req: AuthenticatedDeliveryRequest, res) => {
    try {
      const orderId = req.params.id;
      const deliveryPersonId = req.delivery!.deliveryId;

      const order = await storage.getOrderById(orderId);
      if (!order) {
        res.status(404).json({ message: "Order not found" });
        return;
      }

      if (order.assignedTo !== deliveryPersonId) {
        res.status(403).json({ message: "Order not assigned to you" });
        return;
      }

      const updatedOrder = await storage.updateOrderDelivery(orderId);

      if (updatedOrder) {
        broadcastOrderUpdate(updatedOrder);
      }

      res.json(updatedOrder);
    } catch (error) {
      console.error("Error marking delivery:", error);
      res.status(500).json({ message: "Failed to mark delivery" });
    }
  });

  app.patch("/api/delivery/status", requireDeliveryAuth(), async (req: AuthenticatedDeliveryRequest, res) => {
    try {
      const deliveryPersonId = req.delivery!.deliveryId;
      const { status, currentLocation } = req.body;

      const updatedPerson = await storage.updateDeliveryPersonnel(deliveryPersonId, {
        status,
        currentLocation,
      });

      if (!updatedPerson) {
        res.status(404).json({ message: "Delivery person not found" });
        return;
      }

      const { passwordHash, ...deliveryData } = updatedPerson;
      res.json(deliveryData);
    } catch (error) {
      console.error("Error updating status:", error);
      res.status(500).json({ message: "Failed to update status" });
    }
  });

  // Get earnings report
  app.get("/api/delivery/earnings", requireDeliveryAuth(), async (req: AuthenticatedDeliveryRequest, res) => {
    try {
      const deliveryPersonId = req.delivery!.deliveryId;
      const orders = await storage.getOrdersByDeliveryPerson(deliveryPersonId);

      // Calculate delivery fees (assuming delivery fee goes to delivery person)
      const completedOrders = orders.filter(o => o.status === "delivered");
      const totalEarnings = completedOrders.reduce((sum, order) => sum + order.deliveryFee, 0);

      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startOfThisWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
      const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const todayOrders = completedOrders.filter(o => new Date(o.deliveredAt!) >= startOfToday);
      const weekOrders = completedOrders.filter(o => new Date(o.deliveredAt!) >= startOfThisWeek);
      const monthOrders = completedOrders.filter(o => new Date(o.deliveredAt!) >= startOfThisMonth);

      const todayEarnings = todayOrders.reduce((sum, order) => sum + order.deliveryFee, 0);
      const weekEarnings = weekOrders.reduce((sum, order) => sum + order.deliveryFee, 0);
      const monthEarnings = monthOrders.reduce((sum, order) => sum + order.deliveryFee, 0);

      res.json({
        totalEarnings,
        todayEarnings,
        weekEarnings,
        monthEarnings,
        totalDeliveries: completedOrders.length,
        todayDeliveries: todayOrders.length,
        weekDeliveries: weekOrders.length,
        monthDeliveries: monthOrders.length,
      });
    } catch (error) {
      console.error("Error fetching earnings:", error);
      res.status(500).json({ message: "Failed to fetch earnings" });
    }
  });

  // Get delivery statistics
  app.get("/api/delivery/stats", requireDeliveryAuth(), async (req: AuthenticatedDeliveryRequest, res) => {
    try {
      const deliveryPersonId = req.delivery!.deliveryId;
      const deliveryPerson = await storage.getDeliveryPersonnelById(deliveryPersonId);
      const orders = await storage.getOrdersByDeliveryPerson(deliveryPersonId);

      const pendingOrders = orders.filter(o => o.status === "assigned");
      const activeOrders = orders.filter(o => ["preparing", "out_for_delivery"].includes(o.status));
      const completedOrders = orders.filter(o => o.status === "delivered");

      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const todayCompletedOrders = completedOrders.filter(o =>
        new Date(o.deliveredAt!) >= startOfToday
      );

      res.json({
        pendingCount: pendingOrders.length,
        activeCount: activeOrders.length,
        completedToday: todayCompletedOrders.length,
        totalCompleted: completedOrders.length,
        rating: deliveryPerson?.rating || "5.0",
        status: deliveryPerson?.status || "offline",
      });
    } catch (error) {
      console.error("Error fetching delivery stats:", error);
      res.status(500).json({ message: "Failed to fetch statistics" });
    }
  });

  app.post("/api/delivery/auth/logout", requireDeliveryAuth(), async (req, res) => {
    res.clearCookie("deliveryRefreshToken");
    res.json({ message: "Logged out successfully" });
  });

  app.post("/api/delivery/auth/refresh", async (req, res) => {
    try {
      const refreshToken = req.cookies.deliveryRefreshToken;

      if (!refreshToken) {
        res.status(401).json({ message: "No refresh token provided" });
        return;
      }

      const payload = verifyToken(refreshToken);
      if (!payload) {
        res.status(401).json({ message: "Invalid refresh token" });
        return;
      }

      const delivery = await storage.getDeliveryPersonnel(payload.deliveryId);
      if (!delivery) {
        res.status(404).json({ message: "Delivery personnel not found" });
        return;
      }

      const newAccessToken = generateDeliveryToken(delivery);
      const newRefreshToken = generateRefreshToken(delivery);

      res.cookie("deliveryRefreshToken", newRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });

      res.json({ accessToken: newAccessToken });
    } catch (error) {
      console.error("Delivery token refresh error:", error);
      res.status(401).json({ message: "Token refresh failed" });
    }
  });
}