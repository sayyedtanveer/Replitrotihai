
import type { Express } from "express";
import { requirePartner, type AuthenticatedPartnerRequest } from "./partnerAuth";
import { storage } from "./storage";

export function registerPartnerRoutes(app: Express): void {
  // Accept order
  app.post("/api/partner/orders/:orderId/accept", requirePartner(), async (req: AuthenticatedPartnerRequest, res) => {
    try {
      const { orderId } = req.params;
      const order = await storage.getOrderById(orderId);

      if (!order) {
        res.status(404).json({ message: "Order not found" });
        return;
      }

      if (order.chefId !== req.partner?.chefId) {
        res.status(403).json({ message: "Unauthorized" });
        return;
      }

      const updatedOrder = await storage.updateOrderStatus(orderId, "confirmed");
      res.json(updatedOrder);
    } catch (error) {
      console.error("Error accepting order:", error);
      res.status(500).json({ message: "Failed to accept order" });
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