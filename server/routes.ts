import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertOrderSchema } from "@shared/schema";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { registerAdminRoutes } from "./adminRoutes";
import { registerPartnerRoutes } from "./partnerRoutes";

export async function registerRoutes(app: Express): Promise<Server> {
  await setupAuth(app);
  registerAdminRoutes(app);
  registerPartnerRoutes(app);

  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Get all categories
  app.get("/api/categories", async (_req, res) => {
    try {
      const categories = await storage.getAllCategories();
      res.json(categories);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });

  // Get all products
  app.get("/api/products", async (req, res) => {
    try {
      const categoryId = req.query.categoryId as string | undefined;

      if (categoryId) {
        const products = await storage.getProductsByCategoryId(categoryId);
        res.json(products);
      } else {
        const products = await storage.getAllProducts();
        res.json(products);
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  // Get a single product by ID
  app.get("/api/products/:id", async (req, res) => {
    try {
      const product = await storage.getProductById(req.params.id);
      if (!product) {
        res.status(404).json({ message: "Product not found" });
        return;
      }
      res.json(product);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch product" });
    }
  });

  // Create an order
  app.post("/api/orders", async (req, res) => {
    try {
      const result = insertOrderSchema.safeParse(req.body);
      if (!result.success) {
        res.status(400).json({ message: "Invalid order data", errors: result.error });
        return;
      }

      const order = await storage.createOrder(result.data);
      res.status(201).json(order);
    } catch (error) {
      res.status(500).json({ message: "Failed to create order" });
    }
  });

  // Get user's orders
  app.get("/api/orders", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) {
        res.status(404).json({ message: "User not found" });
        return;
      }
      
      const allOrders = await storage.getAllOrders();
      // Filter orders by user's email or phone
      const userOrders = allOrders.filter(order => 
        order.email === user.email || order.phone === user.email
      );
      res.json(userOrders);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch orders" });
    }
  });

  // Get order by ID
  app.get("/api/orders/:id", async (req, res) => {
    try {
      const order = await storage.getOrderById(req.params.id);
      if (!order) {
        res.status(404).json({ message: "Order not found" });
        return;
      }
      res.json(order);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch order" });
    }
  });

  // Get all chefs
  app.get("/api/chefs", async (_req, res) => {
    try {
      const chefs = await storage.getChefs();
      res.json(chefs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch chefs" });
    }
  });

  // Get chefs by category ID
  app.get("/api/chefs/:categoryId", (req, res) => {
    const { categoryId } = req.params;
    const chefs = storage.getChefsByCategory(categoryId);
    res.json(chefs);
  });

  // Calculate delivery fee based on distance
  app.post("/api/calculate-delivery", async (req, res) => {
    try {
      const { latitude, longitude } = req.body;
      
      if (!latitude || !longitude) {
        res.status(400).json({ message: "Latitude and longitude are required" });
        return;
      }

      // Store location - Kurla West, Mumbai
      const STORE_LAT = 19.0728;
      const STORE_LON = 72.8826;

      // Calculate distance using Haversine formula
      const R = 6371; // Earth's radius in km
      const dLat = toRad(latitude - STORE_LAT);
      const dLon = toRad(longitude - STORE_LON);
      
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(STORE_LAT)) *
        Math.cos(toRad(latitude)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
      
      const c = 2 * Math.asin(Math.sqrt(a));
      const distance = parseFloat((R * c).toFixed(2));

      // Calculate delivery fee
      const baseFee = 20;
      let deliveryFee = baseFee;
      
      if (distance > 2) {
        deliveryFee = baseFee + Math.ceil(distance - 2) * 10;
      }

      res.json({
        distance,
        deliveryFee,
        estimatedTime: Math.ceil(distance * 2 + 15)
      });
    } catch (error) {
      console.error("Error calculating delivery:", error);
      res.status(500).json({ message: "Failed to calculate delivery" });
    }
  });

  function toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  // Get all subscription plans
  app.get("/api/subscription-plans", async (_req, res) => {
    try {
      const plans = await storage.getSubscriptionPlans();
      res.json(plans);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch subscription plans" });
    }
  });

  // Get user's subscriptions
  app.get("/api/subscriptions", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const allSubscriptions = await storage.getSubscriptions();
      const userSubscriptions = allSubscriptions.filter(s => s.userId === userId);
      res.json(userSubscriptions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch subscriptions" });
    }
  });

  // Create a subscription
  app.post("/api/subscriptions", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { planId } = req.body;

      const plan = await storage.getSubscriptionPlan(planId);
      if (!plan) {
        res.status(404).json({ message: "Subscription plan not found" });
        return;
      }

      const user = await storage.getUser(userId);
      if (!user) {
        res.status(404).json({ message: "User not found" });
        return;
      }

      const now = new Date();
      const nextDelivery = new Date(now);
      nextDelivery.setDate(nextDelivery.getDate() + 1);

      const subscription = await storage.createSubscription({
        userId,
        planId,
        customerName: `${user.firstName} ${user.lastName}`,
        phone: "",
        email: user.email || "",
        address: "",
        status: "active",
        startDate: now,
        nextDeliveryDate: nextDelivery,
        customItems: null,
      });

      res.status(201).json(subscription);
    } catch (error) {
      console.error("Error creating subscription:", error);
      res.status(500).json({ message: "Failed to create subscription" });
    }
  });

  // Pause a subscription
  app.post("/api/subscriptions/:id/pause", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const subscription = await storage.getSubscription(req.params.id);

      if (!subscription) {
        res.status(404).json({ message: "Subscription not found" });
        return;
      }

      if (subscription.userId !== userId) {
        res.status(403).json({ message: "Unauthorized" });
        return;
      }

      const updated = await storage.updateSubscription(req.params.id, { status: "paused" });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Failed to pause subscription" });
    }
  });

  // Resume a subscription
  app.post("/api/subscriptions/:id/resume", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const subscription = await storage.getSubscription(req.params.id);

      if (!subscription) {
        res.status(404).json({ message: "Subscription not found" });
        return;
      }

      if (subscription.userId !== userId) {
        res.status(403).json({ message: "Unauthorized" });
        return;
      }

      const updated = await storage.updateSubscription(req.params.id, { status: "active" });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Failed to resume subscription" });
    }
  });

  // Cancel a subscription
  app.delete("/api/subscriptions/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const subscription = await storage.getSubscription(req.params.id);

      if (!subscription) {
        res.status(404).json({ message: "Subscription not found" });
        return;
      }

      if (subscription.userId !== userId) {
        res.status(403).json({ message: "Unauthorized" });
        return;
      }

      await storage.deleteSubscription(req.params.id);
      res.json({ message: "Subscription cancelled" });
    } catch (error) {
      res.status(500).json({ message: "Failed to cancel subscription" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}