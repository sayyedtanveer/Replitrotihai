import type { Express } from "express";
import { storage } from "./storage";
import { hashPassword, verifyPassword, generateDeliveryToken, requireDeliveryAuth, type AuthenticatedDeliveryRequest } from "./deliveryAuth";
import { deliveryPersonnelLoginSchema, insertDeliveryPersonnelSchema } from "@shared/schema";
import { broadcastOrderUpdate, notifyDeliveryAssignment, cancelPreparedOrderTimeout } from "./websocket";
import { db, orders } from "@shared/db";
import { eq } from "drizzle-orm";

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

  // Claim an available order (auto-assignment) - claiming means auto-accepting
  app.post("/api/delivery/orders/:id/claim", requireDeliveryAuth(), async (req: AuthenticatedDeliveryRequest, res) => {
    try {
      const orderId = req.params.id;
      const deliveryPersonId = req.delivery!.deliveryId;

      console.log(`📦 Delivery person ${deliveryPersonId} attempting to claim order ${orderId}`);

      // Check if delivery person is available to claim
      const deliveryPerson = await storage.getDeliveryPersonnelById(deliveryPersonId);
      if (!deliveryPerson || !deliveryPerson.isActive) {
        res.status(403).json({ message: "You are not active to claim orders" });
        return;
      }

      const order = await storage.getOrderById(orderId);
      if (!order) {
        res.status(404).json({ message: "Order not found" });
        return;
      }

      // Check if order is accepted by chef or prepared and not yet assigned
      // Allow claiming as soon as chef accepts (gives delivery person time to reach)
      const validStatuses = ["accepted_by_chef", "preparing", "prepared"];
      if (!validStatuses.includes(order.status)) {
        res.status(400).json({ message: "Order is not available for pickup" });
        return;
      }

      if (order.assignedTo) {
        res.status(400).json({ message: "Order already claimed by another delivery person" });
        return;
      }

      const claimStage = order.status === "accepted_by_chef" ? "EARLY_CLAIM (chef just accepted)" : 
                         order.status === "prepared" ? "READY_CLAIM (food is ready)" : "CLAIM";
      console.log(`✅ Order ${orderId} is available for claiming [${claimStage}]`);

      // Assign to this delivery person (this will populate delivery person name and phone)
      const assignedOrder = await storage.assignOrderToDeliveryPerson(orderId, deliveryPersonId);
      
      if (!assignedOrder) {
        res.status(500).json({ message: "Failed to claim order" });
        return;
      }

      // Claiming automatically means accepting - update status to accepted_by_delivery
      const acceptedOrder = await storage.updateOrderStatus(orderId, "accepted_by_delivery");
      
      if (!acceptedOrder) {
        res.status(500).json({ message: "Failed to accept order" });
        return;
      }

      // Cancel the timeout since delivery person accepted the order
      cancelPreparedOrderTimeout(orderId);
      
      const assignmentMessage = acceptedOrder.status === "accepted_by_chef" 
        ? `Chef is preparing your order - you have time to reach the location`
        : acceptedOrder.status === "prepared"
        ? `Order is ready for pickup - please head to the location`
        : `Order assigned - please check status`;
      
      console.log(`✅ Order ${orderId} claimed and accepted by ${deliveryPerson.name} (${deliveryPerson.phone})`);
      console.log(`✅ Order details - deliveryPersonName: ${acceptedOrder.deliveryPersonName}, deliveryPersonPhone: ${acceptedOrder.deliveryPersonPhone}`);
      console.log(`📍 Assignment context: ${assignmentMessage}`);
      
      broadcastOrderUpdate(acceptedOrder);
      res.json({ 
        ...acceptedOrder, 
        assignmentMessage 
      });
    } catch (error) {
      console.error("Error claiming order:", error);
      res.status(500).json({ message: "Failed to claim order" });
    }
  });

  app.post("/api/delivery/orders/:id/accept", requireDeliveryAuth(), async (req: AuthenticatedDeliveryRequest, res) => {
    try {
      const orderId = req.params.id;
      const deliveryPersonId = req.delivery!.deliveryId;

      console.log(`📦 Delivery person ${deliveryPersonId} accepting order ${orderId}`);

      const order = await storage.getOrderById(orderId);
      if (!order) {
        res.status(404).json({ message: "Order not found" });
        return;
      }

      if (order.assignedTo !== deliveryPersonId) {
        res.status(403).json({ message: "Order not assigned to you" });
        return;
      }

      // If already accepted by this delivery person, return success (idempotent)
      if (order.status === "accepted_by_delivery") {
        console.log(`✅ Order ${orderId} already accepted`);
        res.json(order);
        return;
      }

      // Allow acceptance from any status where delivery is assigned but not yet out for delivery
      const validStatuses = ["assigned", "prepared", "accepted_by_chef", "preparing"];
      if (!validStatuses.includes(order.status)) {
        res.status(400).json({ message: "Order cannot be accepted in current status" });
        return;
      }

      // Ensure delivery person details are set (in case they weren't during assignment)
      const deliveryPerson = await storage.getDeliveryPersonnelById(deliveryPersonId);
      if (deliveryPerson && (!order.deliveryPersonName || !order.deliveryPersonPhone)) {
        await db.update(orders)
          .set({
            deliveryPersonName: deliveryPerson.name,
            deliveryPersonPhone: deliveryPerson.phone
          })
          .where(eq(orders.id, orderId));
      }

      // Change status to accepted_by_delivery when delivery person accepts
      const updatedOrder = await storage.updateOrderStatus(orderId, "accepted_by_delivery");
      
      if (updatedOrder) {
        // Cancel the timeout since delivery person accepted the order
        cancelPreparedOrderTimeout(orderId);
        console.log(`✅ Order ${orderId} accepted by ${deliveryPerson?.name || 'delivery person'}`);
        broadcastOrderUpdate(updatedOrder);
      }

      res.json(updatedOrder);
    } catch (error) {
      console.error("Error accepting order:", error);
      res.status(500).json({ message: "Failed to accept order" });
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

      // Allow pickup from any status where delivery has accepted or is preparing
      const validStatuses = ["accepted_by_delivery", "prepared", "accepted_by_chef", "preparing"];
      if (!validStatuses.includes(order.status)) {
        res.status(400).json({ message: "Order must be accepted before pickup" });
        return;
      }

      // Change status to out_for_delivery and record pickup time
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
}
