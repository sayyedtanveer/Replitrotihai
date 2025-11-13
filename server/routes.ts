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

  // Coupon verification route
  app.post("/api/coupons/verify", async (req, res) => {
    try {
      const { code, orderAmount } = req.body;

      if (!code || typeof code !== 'string') {
        res.status(400).json({ message: "Coupon code is required" });
        return;
      }

      if (!orderAmount || typeof orderAmount !== 'number' || orderAmount <= 0) {
        res.status(400).json({ message: "Valid order amount is required" });
        return;
      }

      const result = await storage.verifyCoupon(code, orderAmount);

      if (!result) {
        res.status(404).json({ message: "Invalid coupon code" });
        return;
      }

      res.json(result);
    } catch (error: any) {
      console.error("Coupon verification error:", error);
      res.status(400).json({ message: error.message || "Failed to verify coupon" });
    }
  });

  // Check if phone number exists
  app.post("/api/user/check-phone", async (req, res) => {
    try {
      const { phone } = req.body;
      
      if (!phone) {
        res.status(400).json({ message: "Phone number is required" });
        return;
      }

      const user = await storage.getUserByPhone(phone);
      res.json({ exists: !!user });
    } catch (error) {
      console.error("Phone check error:", error);
      res.status(500).json({ message: "Failed to check phone number" });
    }
  });

  // Reset password endpoint
  app.post("/api/user/reset-password", async (req, res) => {
    try {
      const { phone } = req.body;

      if (!phone) {
        res.status(400).json({ message: "Phone number is required" });
        return;
      }

      const user = await storage.getUserByPhone(phone);
      if (!user) {
        res.status(404).json({ message: "User not found" });
        return;
      }

      // Generate new password (last 6 digits of phone + first 2 letters of name)
      const newPassword = phone.slice(-6) + (user.name ? user.name.slice(0, 2).toLowerCase() : "00");
      const passwordHash = await hashPassword(newPassword);

      await storage.updateUser(user.id, { passwordHash });

      res.json({ 
        message: "Password reset successful",
        newPassword 
      });
    } catch (error) {
      console.error("Password reset error:", error);
      res.status(500).json({ message: "Failed to reset password" });
    }
  });

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
        referralCode: null,
        walletBalance: 0,
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

  // User logout (JWT-based)
app.post("/api/user/logout", async (req, res) => {
  try {
    // For JWT, logout simply means the client deletes the token.
    // (Tokens are stateless — there’s nothing to invalidate on the server)
    // However, we could later add refresh token blacklisting here if needed.

    console.log("User logout requested");

    res.json({ message: "Logged out successfully" });
  } catch (error: any) {
    console.error("Logout error:", error);
    res.status(500).json({ message: error.message || "Failed to logout" });
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
          email: email || null,
          address: address || null,
          passwordHash,
          referralCode: null,
          walletBalance: 0,
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
        referralCode: user.referralCode,
        walletBalance: user.walletBalance || 0,
      });
    } catch (error) {
      console.error("Error fetching profile:", error);
      res.status(500).json({ message: "Failed to fetch profile" });
    }
  });

  // Generate referral code for user
  app.post("/api/user/generate-referral", requireUser(), async (req: AuthenticatedUserRequest, res) => {
    try {
      const userId = req.authenticatedUser!.userId;
      const user = await storage.getUser(userId);
      
      if (!user) {
        res.status(404).json({ message: "User not found" });
        return;
      }

      if (user.referralCode) {
        res.json({ referralCode: user.referralCode });
        return;
      }

      const referralCode = await storage.generateReferralCode(userId);
      res.json({ referralCode });
    } catch (error: any) {
      console.error("Error generating referral code:", error);
      res.status(500).json({ message: error.message || "Failed to generate referral code" });
    }
  });

  // Apply referral code during registration
  app.post("/api/user/apply-referral", requireUser(), async (req: AuthenticatedUserRequest, res) => {
    try {
      const userId = req.authenticatedUser!.userId;
      const { referralCode } = req.body;

      if (!referralCode) {
        res.status(400).json({ message: "Referral code is required" });
        return;
      }

      await storage.applyReferralBonus(referralCode, userId);
      res.json({ message: "Referral bonus applied successfully", bonus: 50 });
    } catch (error: any) {
      console.error("Error applying referral:", error);
      res.status(400).json({ message: error.message || "Failed to apply referral" });
    }
  });

  // Get user's referrals
  app.get("/api/user/referrals", requireUser(), async (req: AuthenticatedUserRequest, res) => {
    try {
      const userId = req.authenticatedUser!.userId;
      const referrals = await storage.getReferralsByUser(userId);
      res.json(referrals);
    } catch (error: any) {
      console.error("Error fetching referrals:", error);
      res.status(500).json({ message: error.message || "Failed to fetch referrals" });
    }
  });

  // Get user's referral code
  app.get("/api/user/referral-code", requireUser(), async (req: AuthenticatedUserRequest, res) => {
    try {
      const userId = req.authenticatedUser!.userId;
      const referralCode = await storage.getUserReferralCode(userId);
      
      if (!referralCode) {
        res.status(404).json({ message: "No referral code found. Generate one first." });
        return;
      }
      
      res.json({ referralCode });
    } catch (error: any) {
      console.error("Error fetching referral code:", error);
      res.status(500).json({ message: error.message || "Failed to fetch referral code" });
    }
  });

  // Get user's wallet balance
  app.get("/api/user/wallet", requireUser(), async (req: AuthenticatedUserRequest, res) => {
    try {
      const userId = req.authenticatedUser!.userId;
      const balance = await storage.getUserWalletBalance(userId);
      res.json({ balance });
    } catch (error: any) {
      console.error("Error fetching wallet balance:", error);
      res.status(500).json({ message: error.message || "Failed to fetch wallet balance" });
    }
  });

  // Get wallet transactions
  app.get("/api/user/wallet/transactions", requireUser(), async (req: AuthenticatedUserRequest, res) => {
    try {
      const userId = req.authenticatedUser!.userId;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const transactions = await storage.getWalletTransactions(userId, limit);
      res.json(transactions);
    } catch (error: any) {
      console.error("Error fetching wallet transactions:", error);
      res.status(500).json({ message: error.message || "Failed to fetch wallet transactions" });
    }
  });

  // Get referral stats
  app.get("/api/user/referral-stats", requireUser(), async (req: AuthenticatedUserRequest, res) => {
    try {
      const userId = req.authenticatedUser!.userId;
      const stats = await storage.getReferralStats(userId);
      res.json(stats);
    } catch (error: any) {
      console.error("Error fetching referral stats:", error);
      res.status(500).json({ message: error.message || "Failed to fetch referral stats" });
    }
  });

  app.get("/api/user/orders", requireUser(), async (req: AuthenticatedUserRequest, res) => {
    try {
      const userId = req.authenticatedUser!.userId;
      console.log("GET /api/user/orders - User ID:", userId);

      // Get user to find their phone number
      const user = await storage.getUser(userId);
      if (!user) {
        res.status(404).json({ message: "User not found" });
        return;
      }

      console.log("GET /api/user/orders - User phone:", user.phone);

      // Get all orders and filter by user's phone number
      const allOrders = await storage.getAllOrders();
      const userOrders = allOrders.filter(order => 
        order.phone === user.phone || order.userId === userId
      );

      console.log("GET /api/user/orders - Found", userOrders.length, "orders");
      res.json(userOrders);
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
  // Create an order (no authentication required - supports guest checkout)
app.post("/api/orders", async (req: any, res) => {
  try {
    console.log(" Incoming order body:", JSON.stringify(req.body, null, 2));

    // 🔹 Sanitize request before validation
    const body = req.body;

    const sanitizeNumber = (val: any) =>
      typeof val === "string" ? parseFloat(val) : val;

    const sanitized = {
      customerName: body.customerName?.trim(),
      phone: body.phone?.trim(),
      email: body.email || "",
      address: body.address?.trim(),
      items: Array.isArray(body.items)
  ? body.items.map((i: any) => ({
      id: i.id,
      name: i.name,
      price: sanitizeNumber(i.price),
      quantity: sanitizeNumber(i.quantity),
    }))
  : [],
      subtotal: sanitizeNumber(body.subtotal),
      deliveryFee: sanitizeNumber(body.deliveryFee),
      total: sanitizeNumber(body.total),
      chefId: body.chefId || body.items?.[0]?.chefId || "",
      paymentStatus: body.paymentStatus || "pending",
      userId: body.userId || undefined,
      couponCode: body.couponCode || undefined, // Added for coupon code
      discount: body.discount || 0, // Added for discount amount
    };

    const result = insertOrderSchema.safeParse(sanitized);
    if (!result.success) {
      console.error("❌ Order validation failed:", result.error.flatten());
      return res.status(400).json({
        message: "Invalid order data",
        errors: result.error.flatten(),
        received: sanitized,
      });
    }

    // Extract authenticated userId (JWT)
    let userId: string | undefined;
    if (req.headers.authorization?.startsWith("Bearer ")) {
      const token = req.headers.authorization.substring(7);
      const payload = verifyUserToken(token);
      if (payload?.userId) userId = payload.userId;
    }

    // Build payload to create order
    const orderPayload: any = {
      ...result.data,
      paymentStatus: "pending",
      userId,
    };

    // Determine chefId if missing
    if (!orderPayload.chefId && orderPayload.items.length > 0) {
      const firstProduct = await storage.getProductById(orderPayload.items[0].id);
      orderPayload.chefId = firstProduct?.chefId ?? undefined;
    }

    if (!orderPayload.chefId) {
      return res
        .status(400)
        .json({ message: "Unable to determine chefId for the order" });
    }

    const order = await storage.createOrder(orderPayload);

      // Increment coupon usage if coupon was applied
      if (orderPayload.couponCode) {
        await storage.incrementCouponUsage(orderPayload.couponCode);
      }

      // Complete referral bonus if this is user's first order
      if (userId) {
        const { db: database } = await import("@shared/db");
        const { referrals: referralsTable } = await import("@shared/db");
        const { eq, and } = await import("drizzle-orm");
        
        const pendingReferral = await database.query.referrals.findFirst({
          where: (r, { eq, and }) => and(
            eq(r.referredId, userId),
            eq(r.status, "pending")
          ),
        });

        if (pendingReferral) {
          // Mark referral as completed and give bonus to referrer
          await database.update(referralsTable)
            .set({ 
              status: "completed", 
              referredOrderCompleted: true,
              completedAt: new Date()
            })
            .where(eq(referralsTable.id, pendingReferral.id));

          // Add bonus to referrer's wallet
          await storage.updateWalletBalance(pendingReferral.referrerId, pendingReferral.referrerBonus);
        }
      }

    broadcastNewOrder(order);

    console.log("✅ Order created successfully:", order.id);
    res.status(201).json(order);
  } catch (error: any) {
    console.error("❌ Create order error:", error);
    res.status(500).json({ message: error.message || "Failed to create order" });
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
      const { latitude, longitude, chefId } = req.body;

      if (!latitude || !longitude) {
        res.status(400).json({ message: "Latitude and longitude are required" });
        return;
      }

      // Get chef location or default to Kurla West, Mumbai
      let chefLat: number = 19.0728;
      let chefLon: number = 72.8826;

      if (chefId) {
        const chef = await storage.getChefById(chefId);
        if (chef && chef.latitude !== null && chef.longitude !== null && 
            chef.latitude !== undefined && chef.longitude !== undefined) {
          chefLat = chef.latitude;
          chefLon = chef.longitude;
        }
      }

      // Calculate distance using Haversine formula
      const R = 6371; // Earth's radius in km
      const dLat = toRad(latitude - chefLat);
      const dLon = toRad(longitude - chefLon);

      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(chefLat)) *
        Math.cos(toRad(latitude)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

      const c = 2 * Math.asin(Math.sqrt(a));
      const distance = parseFloat((R * c).toFixed(2));

      // Calculate delivery fee - ₹20 base + ₹10 per km after 2km
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