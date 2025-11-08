import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertOrderSchema, userLoginSchema, insertUserSchema } from "@shared/schema";
import { registerAdminRoutes } from "./adminRoutes";
import { registerPartnerRoutes } from "./partnerRoutes";
import { registerDeliveryRoutes } from "./deliveryRoutes";
import { setupWebSocket, broadcastNewOrder } from "./websocket";
import { hashPassword, verifyPassword, generateAccessToken, generateRefreshToken, requireUser, type AuthenticatedUserRequest } from "./userAuth";
import { verifyToken as verifyUserToken } from "./userAuth";

export async function registerRoutes(app: Express): Promise<Server> {
  registerAdminRoutes(app);
  registerPartnerRoutes(app);
  registerDeliveryRoutes(app);


  // User phone-based authentication routes
  app.post("/api/user/register", async (req, res) => {
    try {
      const result = insertUserSchema.safeParse(req.body);
      if (!result.success) {
        res.status(400).json({ message: "Invalid user data", errors: result.error });
        return;
      }

      const existingUser = await storage.getUserByPhone(result.data.phone);
      if (existingUser) {
        res.status(400).json({ message: "User with this phone number already exists" });
        return;
      }

      const passwordHash = await hashPassword(result.data.password);
      const user = await storage.createUser({
        name: result.data.name,
        phone: result.data.phone,
        email: result.data.email || null,
        address: result.data.address || null,
        passwordHash,
      });

      const accessToken = generateAccessToken(user);
      const refreshToken = generateRefreshToken(user);

      res.json({
        user: {
          id: user.id,
          name: user.name,
          phone: user.phone,
          email: user.email,
          address: user.address,
        },
        accessToken,
        refreshToken,
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Failed to register user" });
    }
  });

  app.post("/api/user/login", async (req, res) => {
    try {
      const result = userLoginSchema.safeParse(req.body);
      if (!result.success) {
        res.status(400).json({ message: "Invalid login data" });
        return;
      }

      const user = await storage.getUserByPhone(result.data.phone);
      if (!user) {
        res.status(401).json({ message: "Invalid phone number or password" });
        return;
      }

      const isValid = await verifyPassword(result.data.password, user.passwordHash);
      if (!isValid) {
        res.status(401).json({ message: "Invalid phone number or password" });
        return;
      }

      await storage.updateUserLastLogin(user.id);
      const accessToken = generateAccessToken(user);
      const refreshToken = generateRefreshToken(user);

      res.json({
        user: {
          id: user.id,
          name: user.name,
          phone: user.phone,
          email: user.email,
          address: user.address,
        },
        accessToken,
        refreshToken,
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Failed to login" });
    }
  });

  app.post("/api/user/auto-register", async (req, res) => {
    try {
      const { customerName, phone, email, address } = req.body;

      if (!customerName || !phone) {
        res.status(400).json({ message: "Name and phone are required" });
        return;
      }

      let user = await storage.getUserByPhone(phone);
      let isNewUser = false;
      let generatedPassword;

      if (!user) {
        isNewUser = true;
        generatedPassword = Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12);
        const passwordHash = await hashPassword(generatedPassword);
        user = await storage.createUser({
          name: customerName,
          phone,
          email: email || undefined,
          address: address || undefined,
          passwordHash,
        });
        console.log("New user created:", user.id);
      } else {
        await storage.updateUserLastLogin(user.id);
        console.log("Existing user logged in:", user.id);
      }

      const accessToken = generateAccessToken(user);
      const refreshToken = generateRefreshToken(user);

      res.json({
        user: {
          id: user.id,
          name: user.name,
          phone: user.phone,
          email: user.email,
          address: user.address,
        },
        accessToken,
        refreshToken,
        defaultPassword: isNewUser ? generatedPassword : undefined,
      });
    } catch (error) {
      console.error("Auto-register error:", error);
      res.status(500).json({ message: "Failed to auto-register" });
    }
  });

  app.get("/api/user/profile", requireUser(), async (req: AuthenticatedUserRequest, res) => {
    try {
      const user = await storage.getUser(req.authenticatedUser!.userId);
      if (!user) {
        res.status(404).json({ message: "User not found" });
        return;
      }

      res.json({
        id: user.id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        address: user.address,
      });
    } catch (error) {
      console.error("Error fetching profile:", error);
      res.status(500).json({ message: "Failed to fetch profile" });
    }
  });

  app.get("/api/user/orders", requireUser(), async (req: AuthenticatedUserRequest, res) => {
    try {
      console.log("GET /api/user/orders - User ID:", req.authenticatedUser!.userId);
      const orders = await storage.getOrdersByUserId(req.authenticatedUser!.userId);
      console.log("GET /api/user/orders - Found", orders.length, "orders");
      res.json(orders);
    } catch (error: any) {
      console.error("Error fetching user orders:", error);
      res.status(500).json({ message: error.message || "Failed to fetch orders" });
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

  // Create an order (no authentication required - supports guest checkout)
  app.post("/api/orders", async (req, res) => {
    try {
      const result = insertOrderSchema.safeParse(req.body);
      if (!result.success) {
        res.status(400).json({ message: "Invalid order data", errors: result.error });
        return;
      }

      const order = await storage.createOrder(result.data);

      // Log new order notification
      console.log(`
╔════════════════════════════════════════════════════════════════
║ 🔔 NEW ORDER - PAYMENT PENDING
╠════════════════════════════════════════════════════════════════
║ Order ID: ${order.id.slice(0, 8)}
║ Customer: ${order.customerName}
║ Phone: ${order.phone}
║ Amount: ₹${order.total}
║ Payment: ${order.paymentStatus} (QR shown to customer)
║ Time: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
╠════════════════════════════════════════════════════════════════
║ ⏳ Waiting for customer payment & admin verification
║ 📱 Notification sent to admin panel
╚════════════════════════════════════════════════════════════════
      `);

      broadcastNewOrder(order);
      res.status(201).json(order);
    } catch (error) {
      console.error("Create order error:", error);
      res.status(500).json({ message: "Failed to create order" });
    }
  });

  // Get user's orders (supports both authenticated users and phone-based lookup)
  app.get("/api/orders", async (req: any, res) => {
    try {
      console.log("GET /api/orders - Auth header:", req.headers.authorization ? "Present" : "Missing");
      console.log("GET /api/orders - Query params:", req.query);
      
      // Check if user is authenticated via Replit auth
      if (req.isAuthenticated && req.isAuthenticated() && req.user?.claims?.sub) {
        const userId = req.user.claims.sub;
        const user = await storage.getUser(userId);
        if (!user) {
          res.status(404).json({ message: "User not found" });
          return;
        }

        const allOrders = await storage.getAllOrders();
        const userOrders = allOrders.filter(order => 
          order.email === user.email || order.phone === user.email
        );
        res.json(userOrders);
      } 
      // Check if user is authenticated via phone auth (JWT)
      else if (req.headers.authorization?.startsWith("Bearer ")) {
        const token = req.headers.authorization.substring(7);
        const { verifyToken } = await import("./userAuth");
        const payload = verifyToken(token);

        if (payload) {
          console.log("GET /api/orders - Valid token for user:", payload.userId);
          const orders = await storage.getOrdersByUserId(payload.userId);
          res.json(orders);
        } else {
          console.log("GET /api/orders - Invalid token");
          res.status(401).json({ message: "Invalid token" });
        }
      }
      // Allow query by phone for guest users
      else if (req.query.phone) {
        const allOrders = await storage.getAllOrders();
        const userOrders = allOrders.filter(order => order.phone === req.query.phone);
        res.json(userOrders);
      }
      else {
        console.log("GET /api/orders - No valid authentication method found");
        res.status(401).json({ message: "Authentication required or provide phone number" });
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
      res.status(500).json({ message: "Failed to fetch orders" });
    }
  });

  // Get order by ID
  app.get("/api/orders/:id", async (req, res) => {
    try {
      const { id } = req.params;

      // Allow unauthenticated access for order tracking (users receive order ID after placing order)
      const order = await storage.getOrderById(id);

      if (!order) {
        res.status(404).json({ message: "Order not found" });
        return;
      }

      res.json(order);
    } catch (error: any) {
      console.error("Error fetching order:", error);
      res.status(500).json({ message: error.message });
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

  // Get all subscription plans (public access)
  app.get("/api/subscription-plans", async (_req, res) => {
    try {
      const plans = await storage.getSubscriptionPlans();
      res.json(plans);
    } catch (error) {
      console.error("Error fetching subscription plans:", error);
      res.status(500).json({ message: "Failed to fetch subscription plans" });
    }
  });

  // Get user's subscriptions
  app.get("/api/subscriptions", requireUser(), async (req: AuthenticatedUserRequest, res) => {
    try {
      const userId = req.authenticatedUser!.userId;
      const allSubscriptions = await storage.getSubscriptions();
      const userSubscriptions = allSubscriptions.filter(s => s.userId === userId);
      res.json(userSubscriptions);
    } catch (error) {
      console.error("Error fetching user subscriptions:", error);
      res.status(500).json({ message: "Failed to fetch subscriptions" });
    }
  });

  // Create a subscription
  app.post("/api/subscriptions", requireUser(), async (req: AuthenticatedUserRequest, res) => {
    try {
      const userId = req.authenticatedUser!.userId;
      const { planId } = req.body;

      if (!planId) {
        res.status(400).json({ message: "Plan ID is required" });
        return;
      }

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
        customerName: user.name || "",
        phone: user.phone || "",
        email: user.email || "",
        address: user.address || "",
        status: "active",
        startDate: now,
        endDate: null,
        nextDeliveryDate: nextDelivery,
        customItems: null,
      });

      res.status(201).json(subscription);
    } catch (error: any) {
      console.error("Error creating subscription:", error);
      res.status(500).json({ message: error.message || "Failed to create subscription" });
    }
  });

  // Pause a subscription
  app.post("/api/subscriptions/:id/pause", requireUser(), async (req: AuthenticatedUserRequest, res) => {
    try {
      const userId = req.authenticatedUser!.userId;
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
    } catch (error: any) {
      console.error("Error pausing subscription:", error);
      res.status(500).json({ message: error.message || "Failed to pause subscription" });
    }
  });

  // Resume a subscription
  app.post("/api/subscriptions/:id/resume", requireUser(), async (req: AuthenticatedUserRequest, res) => {
    try {
      const userId = req.authenticatedUser!.userId;
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
    } catch (error: any) {
      console.error("Error resuming subscription:", error);
      res.status(500).json({ message: error.message || "Failed to resume subscription" });
    }
  });

  // Cancel a subscription
  app.delete("/api/subscriptions/:id", requireUser(), async (req: AuthenticatedUserRequest, res) => {
    try {
      const userId = req.authenticatedUser!.userId;
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
    } catch (error: any) {
      console.error("Error cancelling subscription:", error);
      res.status(500).json({ message: error.message || "Failed to cancel subscription" });
    }
  });

  const httpServer = createServer(app);
  setupWebSocket(httpServer);

  return httpServer;
}