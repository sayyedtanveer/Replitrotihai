
import type { Express } from "express";
import { requirePartner, type AuthenticatedPartnerRequest } from "./partnerAuth";
import { storage } from "./storage";
import { broadcastOrderUpdate, broadcastPreparedOrderToAvailableDelivery } from "./websocket";

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

  // Accept order
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
        res.status(403).json({ message: "Unauthorized" });
        return;
      }

      // Accept order - set status to accepted_by_chef
      let updatedOrder = await storage.acceptOrder(orderId, partnerId!);
      
      if (updatedOrder) {
        // Chef acceptance sets status to 'accepted_by_chef', not 'preparing'
        // Partner must explicitly click "Start Preparing" to change to 'preparing'
        broadcastOrderUpdate(updatedOrder);
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

  // Update order status
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
        res.status(403).json({ message: "Unauthorized" });
        return;
      }

      const updatedOrder = await storage.updateOrderStatus(orderId, status);
      
      if (updatedOrder) {
        broadcastOrderUpdate(updatedOrder);
        
        // Broadcast to all available delivery personnel when order is prepared
        if (status === "prepared" && !updatedOrder.assignedTo) {
          broadcastPreparedOrderToAvailableDelivery(updatedOrder);
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