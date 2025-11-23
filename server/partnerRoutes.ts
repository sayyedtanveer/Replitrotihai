import type { Express } from "express";
import { requirePartner, type AuthenticatedPartnerRequest } from "./partnerAuth";
import { storage } from "./storage";
import { broadcastOrderUpdate, broadcastPreparedOrderToAvailableDelivery } from "./websocket";
import { db, orders } from "@shared/db";
import { eq } from "drizzle-orm";

export function registerPartnerRoutes(app: Express): void {
  // Get all orders for this partner
  app.get("/api/partner/orders", requirePartner(), async (req: AuthenticatedPartnerRequest, res) => {
    try {
      const chefId = req.partner?.chefId;
      if (!chefId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }

      const orders = await storage.getOrdersByChefId(chefId);
      res.json(orders);
    } catch (error) {
      console.error("Error fetching partner orders:", error);
      res.status(500).json({ message: "Failed to fetch orders" });
    }
  });

  // Get dashboard metrics
  app.get("/api/partner/dashboard/metrics", requirePartner(), async (req: AuthenticatedPartnerRequest, res) => {
    try {
      const chefId = req.partner?.chefId;
      if (!chefId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }

      const allOrders = await storage.getOrdersByChefId(chefId);
      const totalOrders = allOrders.length;
      const pendingOrders = allOrders.filter(o => o.status === "pending" && o.paymentStatus === "paid").length;
      const completedOrders = allOrders.filter(o => o.status === "delivered" || o.status === "completed").length;
      const totalRevenue = allOrders
        .filter(o => o.paymentStatus === "confirmed")
        .reduce((sum, order) => sum + order.total, 0);

      res.json({
        totalOrders,
        pendingOrders,
        completedOrders,
        totalRevenue,
      });
    } catch (error) {
      console.error("Error fetching dashboard metrics:", error);
      res.status(500).json({ message: "Failed to fetch metrics" });
    }
  });

  // Accept order (chef accepts after admin confirms payment)
  app.post("/api/partner/orders/:orderId/accept", requirePartner(), async (req: AuthenticatedPartnerRequest, res) => {
    try {
      const { orderId } = req.params;
      const partnerId = req.partner?.partnerId;
      const order = await storage.getOrderById(orderId);

      if (!order) {
        res.status(404).json({ message: "Order not found" });
        return;
      }

      if (order.chefId !== req.partner?.chefId) {
        res.status(403).json({ message: "Not authorized to accept this order" });
        return;
      }

      if (order.paymentStatus !== "confirmed") {
        res.status(400).json({ message: "Payment not confirmed yet" });
        return;
      }

      if (order.status !== "confirmed") {
        res.status(400).json({ message: "Order cannot be accepted in current status" });
        return;
      }

      console.log(`🔄 Chef ${req.partner?.chefId} accepting order ${orderId}`);

      // Accept order and automatically start preparing
      const [updatedOrder] = await db
        .update(orders)
        .set({
          status: "preparing",
          approvedBy: partnerId!,
          approvedAt: new Date()
        })
        .where(eq(orders.id, orderId))
        .returning();

      if (updatedOrder) {
        console.log(`✅ Chef accepted order ${orderId}, status: ${updatedOrder.status} (auto-preparing)`);

        // Broadcast order update to customer and admin
        broadcastOrderUpdate(updatedOrder);
        console.log(`📡 Broadcasted chef acceptance to customer and admin`);

        // STAGE 1: Notify delivery personnel that chef is preparing - they can start preparing to head out
        console.log(`📢 STAGE 1: Broadcasting to delivery personnel - Chef is preparing order ${orderId}`);
        await broadcastPreparedOrderToAvailableDelivery(updatedOrder);
      }

      res.json(updatedOrder);
    } catch (error) {
      console.error("Error accepting order:", error);
      res.status(500).json({ message: "Failed to accept order" });
    }
  });

  // Reject order
  app.post("/api/partner/orders/:orderId/reject", requirePartner(), async (req: AuthenticatedPartnerRequest, res) => {
    try {
      const { orderId } = req.params;
      const { reason } = req.body;
      const partnerId = req.partner?.partnerId;
      const order = await storage.getOrderById(orderId);

      if (!order) {
        res.status(404).json({ message: "Order not found" });
        return;
      }

      if (order.chefId !== req.partner?.chefId) {
        res.status(403).json({ message: "Unauthorized" });
        return;
      }

      const updatedOrder = await storage.rejectOrder(orderId, partnerId!, reason || "Order rejected by partner");

      if (updatedOrder) {
        broadcastOrderUpdate(updatedOrder);
      }

      res.json(updatedOrder);
    } catch (error) {
      console.error("Error rejecting order:", error);
      res.status(500).json({ message: "Failed to reject order" });
    }
  });

  // Update order status (for preparing, prepared, etc.)
  app.patch("/api/partner/orders/:orderId/status", requirePartner(), async (req: AuthenticatedPartnerRequest, res) => {
    try {
      const { orderId } = req.params;
      const { status } = req.body;
      const order = await storage.getOrderById(orderId);

      if (!order) {
        res.status(404).json({ message: "Order not found" });
        return;
      }

      if (order.chefId !== req.partner?.chefId) {
        res.status(403).json({ message: "Not authorized to update this order" });
        return;
      }

      console.log(`🔄 Chef updating order ${orderId} status from ${order.status} to ${status}`);

      const updatedOrder = await storage.updateOrderStatus(orderId, status);

      if (updatedOrder) {
        console.log(`✅ Order ${orderId} status updated to ${status}`);

        // Broadcast to customer and admin
        broadcastOrderUpdate(updatedOrder);
        console.log(`📡 Broadcasted status update to customer and admin`);

        // STAGE 2: When order is marked as prepared, notify the assigned delivery person to pickup
        if (status === "prepared") {
          console.log(`📢 STAGE 2: Notifying assigned delivery person - Food is ready for pickup for order ${orderId}`);
          
          // If delivery person is already assigned, just broadcast the update to them
          if (updatedOrder.assignedTo) {
            console.log(`✅ Order ${orderId} already assigned to ${updatedOrder.deliveryPersonName}, notifying them food is ready`);
            // broadcastOrderUpdate already sent above, which notifies the assigned delivery person
          } else {
            // If no one claimed yet, broadcast to all available delivery personnel
            console.log(`📢 No delivery person assigned yet, broadcasting to all available delivery personnel`);
            await broadcastPreparedOrderToAvailableDelivery(updatedOrder);
          }
        }
      }

      res.json(updatedOrder);
    } catch (error) {
      console.error("Error updating order status:", error);
      res.status(500).json({ message: "Failed to update order status" });
    }
  });

  // Update product availability
  app.patch("/api/partner/products/:productId/availability", requirePartner(), async (req: AuthenticatedPartnerRequest, res) => {
    try {
      const { productId } = req.params;
      const { isAvailable } = req.body;
      const chefId = req.partner?.chefId;

      if (!chefId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }

      if (typeof isAvailable !== "boolean") {
        res.status(400).json({ message: "isAvailable must be a boolean" });
        return;
      }

      const product = await storage.getProductById(productId);
      if (!product) {
        res.status(404).json({ message: "Product not found" });
        return;
      }

      if (product.chefId !== chefId) {
        res.status(403).json({ message: "Unauthorized - Product does not belong to your kitchen" });
        return;
      }

      const updatedProduct = await storage.updateProduct(productId, { isAvailable });
      res.json(updatedProduct);
    } catch (error) {
      console.error("Error updating product availability:", error);
      res.status(500).json({ message: "Failed to update product availability" });
    }
  });

  // Get partner's products
  app.get("/api/partner/products", requirePartner(), async (req: AuthenticatedPartnerRequest, res) => {
    try {
      const chefId = req.partner?.chefId;
      if (!chefId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }

      const allProducts = await storage.getAllProducts();
      const chefProducts = allProducts.filter(p => p.chefId === chefId);
      res.json(chefProducts);
    } catch (error) {
      console.error("Error fetching partner products:", error);
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  // Get income report
  app.get("/api/partner/income-report", requirePartner(), async (req: AuthenticatedPartnerRequest, res) => {
    try {
      const chefId = req.partner?.chefId;
      if (!chefId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }

      const allOrders = await storage.getOrdersByChefId(chefId);
      const completedOrders = allOrders.filter(o => o.paymentStatus === "confirmed");

      const totalIncome = completedOrders.reduce((sum, order) => sum + order.total, 0);

      const now = new Date();
      const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

      const thisMonthOrders = completedOrders.filter(o => new Date(o.createdAt) >= startOfThisMonth);
      const lastMonthOrders = completedOrders.filter(o => 
        new Date(o.createdAt) >= startOfLastMonth && new Date(o.createdAt) <= endOfLastMonth
      );

      const thisMonth = thisMonthOrders.reduce((sum, order) => sum + order.total, 0);
      const lastMonth = lastMonthOrders.reduce((sum, order) => sum + order.total, 0);

      // Monthly breakdown for last 6 months
      const monthlyBreakdown = [];
      for (let i = 5; i >= 0; i--) {
        const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);

        const monthOrders = completedOrders.filter(o => {
          const orderDate = new Date(o.createdAt);
          return orderDate >= monthStart && orderDate <= monthEnd;
        });

        const monthRevenue = monthOrders.reduce((sum, order) => sum + order.total, 0);
        const avgOrderValue = monthOrders.length > 0 ? Math.round(monthRevenue / monthOrders.length) : 0;

        monthlyBreakdown.push({
          month: monthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          orders: monthOrders.length,
          revenue: monthRevenue,
          avgOrderValue,
        });
      }

      res.json({
        totalIncome,
        thisMonth,
        lastMonth,
        monthlyBreakdown,
      });
    } catch (error) {
      console.error("Error fetching income report:", error);
      res.status(500).json({ message: "Failed to fetch income report" });
    }
  });
}