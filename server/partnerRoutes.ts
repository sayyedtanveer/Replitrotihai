import type { Express } from "express";
import { requirePartner, type AuthenticatedPartnerRequest, verifyToken } from "./partnerAuth";
import { storage } from "./storage";
import { broadcastOrderUpdate, broadcastPreparedOrderToAvailableDelivery, broadcastProductAvailabilityUpdate, broadcastChefStatusUpdate } from "./websocket";
import { db, orders } from "@shared/db";
import { eq } from "drizzle-orm";

export function registerPartnerRoutes(app: Express): void {
  // Get orders assigned to this chef
  app.get("/api/partner/orders", requirePartner(), async (req: AuthenticatedPartnerRequest, res) => {
    try {
      const chefId = req.partner?.chefId;
      if (!chefId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }

      const orders = await storage.getOrdersByChefId(chefId);
      
      // Remove sensitive customer information
      const sanitizedOrders = orders.map(order => {
        const { phone, address, email, ...safeOrder } = order;
        return safeOrder;
      });
      
      res.json(sanitizedOrders);
    } catch (error) {
      console.error("Error fetching partner orders:", error);
      res.status(500).json({ message: "Failed to fetch orders" });
    }
  });

  // Get subscriptions for this chef/partner
  app.get("/api/partner/subscriptions", requirePartner(), async (req: AuthenticatedPartnerRequest, res) => {
    try {
      const chefId = req.partner?.chefId;
      if (!chefId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }

      const allSubscriptions = await storage.getSubscriptions();
      const chefSubscriptions = allSubscriptions.filter(s => s.chefId === chefId && s.isPaid);

      const enrichedSubscriptions = await Promise.all(
        chefSubscriptions.map(async (sub) => {
          const plan = await storage.getSubscriptionPlan(sub.planId);
          // Remove sensitive customer information
          const { phone, address, email, ...safeSub } = sub;
          return {
            ...safeSub,
            planName: plan?.name,
            planItems: plan?.items,
            planFrequency: plan?.frequency,
          };
        })
      );

      res.json(enrichedSubscriptions);
    } catch (error) {
      console.error("Error fetching partner subscriptions:", error);
      res.status(500).json({ message: "Failed to fetch subscriptions" });
    }
  });

  // Get subscription delivery logs for chef
  app.get("/api/partner/subscriptions/:id/logs", requirePartner(), async (req: AuthenticatedPartnerRequest, res) => {
    try {
      const { id } = req.params;
      const chefId = req.partner?.chefId;
      if (!chefId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }

      const subscription = await storage.getSubscription(id);
      if (!subscription) {
        res.status(404).json({ message: "Subscription not found" });
        return;
      }

      if (subscription.chefId !== chefId) {
        res.status(403).json({ message: "Unauthorized access to subscription" });
        return;
      }

      const logs = await storage.getSubscriptionDeliveryLogs(id);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching subscription logs:", error);
      res.status(500).json({ message: "Failed to fetch logs" });
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

      // --- Roti Category + Delivery Time Slot Flow ---
      if (status === "prepared") {
        // Get the first product to determine category
        const items = order.items as any[];
        if (items && items.length > 0) {
          const firstProduct = await storage.getProductById(items[0].id);
          if (firstProduct) {
            const category = await storage.getCategoryById(firstProduct.categoryId);
            const isRotiCategory = category?.name?.toLowerCase() === 'roti' || 
                                   category?.name?.toLowerCase().includes('roti');

            if (isRotiCategory && !order.deliverySlotId) {
              res.status(400).json({ message: "Delivery time slot is required for Roti category" });
              return;
            }
          }
        }
        // If it's roti category and time slot is provided, it's already saved in the order.
        // If it's not roti category, no time slot validation needed.
      }
      // --- End Roti Category + Delivery Time Slot Flow ---


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

      // Broadcast product availability update
      if (updatedProduct) {
        broadcastProductAvailabilityUpdate(updatedProduct);
      }

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

  // Get chef details (for partner to view their own status)
  app.get("/api/partner/chef", requirePartner(), async (req: AuthenticatedPartnerRequest, res) => {
    try {
      const chefId = req.partner?.chefId;
      if (!chefId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }

      const chef = await storage.getChefById(chefId);
      if (!chef) {
        res.status(404).json({ message: "Chef not found" });
        return;
      }

      res.json(chef);
    } catch (error) {
      console.error("Error fetching chef details:", error);
      res.status(500).json({ message: "Failed to fetch chef details" });
    }
  });

  // Toggle chef active/inactive status
  app.patch("/api/partner/chef/status", requirePartner(), async (req: AuthenticatedPartnerRequest, res) => {
    try {
      const chefId = req.partner?.chefId;
      if (!chefId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { isActive } = req.body;
      if (typeof isActive !== "boolean") {
        return res.status(400).json({ message: "isActive must be a boolean" });
      }

      const updatedChef = await storage.updateChef(chefId, { isActive });
      if (!updatedChef) {
        return res.status(404).json({ message: "Chef not found" });
      }

      console.log(`🏪 Chef ${updatedChef.name} is now ${isActive ? "ACTIVE" : "INACTIVE"}`);

      // If chef is closing (marking unavailable), check for active subscriptions
      if (!isActive) {
        const activeSubscriptions = await storage.getActiveSubscriptionsByChef(chefId);

        if (activeSubscriptions.length > 0) {
          // Notify admin that this chef has active subscriptions and needs reassignment
          const { broadcastChefUnavailableNotification } = await import("./websocket");
          broadcastChefUnavailableNotification({
            chef: updatedChef,
            subscriptionCount: activeSubscriptions.length,
            subscriptions: activeSubscriptions,
          });

          console.log(`⚠️ Chef ${updatedChef.name} marked unavailable with ${activeSubscriptions.length} active subscriptions - Admin notified for reassignment`);
        }
      }

      // Broadcast chef status update to all connected clients
      broadcastChefStatusUpdate(updatedChef);

      return res.status(200).json(updatedChef);
    } catch (error) {
      console.error("Error updating chef status:", error);
      return res.status(500).json({ message: "Failed to update chef status" });
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

  // Get subscription deliveries for this partner (chef)
  app.get("/api/partner/subscription-deliveries", requirePartner(), async (req: AuthenticatedPartnerRequest, res) => {
    try {
      const chefId = req.partner?.chefId;
      if (!chefId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }

      // Get all subscriptions assigned to this chef and filter for active ones
      const allSubscriptions = await storage.getSubscriptions();
      const subscriptions = allSubscriptions.filter(s => 
        s.chefId === chefId && s.isPaid && s.status !== "cancelled"
      );

      // Filter subscriptions that have delivery scheduled for today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString().split('T')[0];

      // Get all delivery logs for today
      const todaysLogs = await storage.getSubscriptionDeliveryLogsByDate(today);

      const todaysDeliveries: any[] = [];
      let preparing = 0;
      let outForDelivery = 0;
      let delivered = 0;

      for (const sub of subscriptions) {
        // Check if subscription has delivery today based on next delivery date
        const nextDelivery = new Date(sub.nextDeliveryDate);
        nextDelivery.setHours(0, 0, 0, 0);
        const nextDeliveryStr = nextDelivery.toISOString().split('T')[0];

        if (nextDeliveryStr === todayStr && sub.status !== "paused" && sub.status !== "cancelled") {
          // Get the plan name
          const plan = await storage.getSubscriptionPlan(sub.planId);

          // Get chef name if assigned
          let chefName: string | undefined;
          if (sub.chefId) {
            const chef = await storage.getChefById(sub.chefId);
            chefName = chef?.name;
          }

          // Find today's delivery log for this subscription
          const deliveryLog = todaysLogs.find(log => log.subscriptionId === sub.id);

          const currentStatus = deliveryLog?.status || "scheduled";

          if (currentStatus === "preparing") preparing++;
          else if (currentStatus === "out_for_delivery") outForDelivery++;
          else if (currentStatus === "delivered") delivered++;

          todaysDeliveries.push({
            id: deliveryLog?.id || sub.id,
            subscriptionId: sub.id,
            customerName: sub.customerName,
            phone: sub.phone,
            address: sub.address,
            planName: plan?.name || "Unknown Plan",
            time: sub.nextDeliveryTime || "09:00",
            status: currentStatus,
            chefName,
          });
        }
      }

      res.json({
        todayCount: todaysDeliveries.length,
        preparing,
        outForDelivery,
        delivered,
        deliveries: todaysDeliveries,
      });
    } catch (error) {
      console.error("Error fetching subscription deliveries:", error);
      res.status(500).json({ message: "Failed to fetch subscription deliveries" });
    }
  });

  // Update subscription delivery status (partner updates)
  app.patch("/api/partner/subscription-deliveries/:subscriptionId/status", requirePartner(), async (req: AuthenticatedPartnerRequest, res) => {
    try {
      const { subscriptionId } = req.params;
      const { status } = req.body;
      const chefId = req.partner?.chefId;

      if (!chefId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }

      if (!status || !["preparing", "accepted_by_delivery", "out_for_delivery", "delivered", "missed"].includes(status)) {
        res.status(400).json({ message: "Invalid status" });
        return;
      }

      // Verify that this subscription belongs to the chef
      const subscription = await storage.getSubscription(subscriptionId);
      if (!subscription || subscription.chefId !== chefId) {
        res.status(403).json({ message: "You are not authorized to update this subscription" });
        return;
      }

      // Get or create today's delivery log for this subscription
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const time = new Date().toTimeString().slice(0, 5);

      // Get today's logs and find one for this subscription
      const todaysLogs = await storage.getSubscriptionDeliveryLogsByDate(today);
      let deliveryLog = todaysLogs.find(log => log.subscriptionId === subscriptionId);

      if (!deliveryLog) {
        // Create a new delivery log
        deliveryLog = await storage.createSubscriptionDeliveryLog({
          subscriptionId,
          date: today,
          time,
          status: status as any,
          deliveryPersonId: null,
          notes: `Status set to ${status} by chef`,
        });
      } else {
        // Update existing delivery log
        deliveryLog = await storage.updateSubscriptionDeliveryLog(deliveryLog.id, {
          status: status as any,
          notes: `Status updated to ${status} by chef`,
        });
      }

      // Broadcast to available delivery boys when chef starts preparing
      if (status === "preparing") {
        console.log(`📢 Chef started preparing subscription ${subscriptionId} - notifying delivery personnel`);

        const { broadcastSubscriptionDeliveryToAvailableDelivery } = await import("./websocket");
        await broadcastSubscriptionDeliveryToAvailableDelivery({
          ...deliveryLog,
          subscription: {
            customerName: subscription.customerName,
            phone: subscription.phone,
            address: subscription.address,
          }
        });
      }

      // If delivered, update subscription's next delivery date and remaining deliveries
      if (status === "delivered" && subscription.remainingDeliveries > 0) {
        // Calculate next delivery date (simplified - move to next day for now)
        const nextDate = new Date(subscription.nextDeliveryDate);
        nextDate.setDate(nextDate.getDate() + 1);

        await storage.updateSubscription(subscriptionId, {
          remainingDeliveries: subscription.remainingDeliveries - 1,
          nextDeliveryDate: nextDate,
        });
      }

      res.json(deliveryLog);
    } catch (error) {
      console.error("Error updating subscription delivery status:", error);
      res.status(500).json({ message: "Failed to update delivery status" });
    }
  });
}