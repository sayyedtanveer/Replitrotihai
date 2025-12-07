import type { Express } from "express";
import { storage } from "./storage";
import {
  hashPassword,
  verifyPassword,
  generateAccessToken,
  generateRefreshToken,
  requireAdmin,
  requireSuperAdmin,
  requireAdminOrManager,
  verifyToken,
  type AuthenticatedAdminRequest,
} from "./adminAuth";
import { db, walletSettings } from "@shared/db";
import { adminLoginSchema, insertAdminUserSchema, insertCategorySchema, insertProductSchema, insertDeliveryPersonnelSchema, insertDeliveryTimeSlotsSchema, insertReferralRewardSchema, insertCouponSchema } from "@shared/schema";
import { fromZodError } from "zod-validation-error";
import { broadcastOrderUpdate, broadcastNewOrder, notifyDeliveryAssignment, cancelPreparedOrderTimeout, broadcastProductAvailabilityUpdate, broadcastChefStatusUpdate, broadcastSubscriptionAssignmentToPartner, broadcastSubscriptionUpdate } from "./websocket";
import { hashPassword as hashDeliveryPassword } from "./deliveryAuth";
import { eq } from "drizzle-orm";
import { subscriptions } from "@shared/schema";

export function registerAdminRoutes(app: Express) {
  // Admin Delivery Time Slots Management
  app.get("/api/admin/delivery-slots", requireAdmin(), async (req: AuthenticatedAdminRequest, res) => {
    try {
      const slots = await storage.getAllDeliveryTimeSlots();
      res.json(slots);
    } catch (error) {
      console.error("Error fetching delivery slots:", error);
      res.status(500).json({ message: "Failed to fetch delivery slots" });
    }
  });

  app.post("/api/admin/delivery-slots", requireAdmin(), async (req: AuthenticatedAdminRequest, res) => {
    try {
      const validation = insertDeliveryTimeSlotsSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({ message: fromZodError(validation.error).toString() });
        return;
      }
      const slot = await storage.createDeliveryTimeSlot(validation.data);
      res.status(201).json(slot);
    } catch (error) {
      console.error("Error creating delivery slot:", error);
      res.status(500).json({ message: "Failed to create delivery slot" });
    }
  });

  app.patch("/api/admin/delivery-slots/:id", requireAdmin(), async (req: AuthenticatedAdminRequest, res) => {
    try {
      const validation = insertDeliveryTimeSlotsSchema.partial().safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({ message: fromZodError(validation.error).toString() });
        return;
      }
      const slot = await storage.updateDeliveryTimeSlot(req.params.id, validation.data);
      if (!slot) {
        res.status(404).json({ message: "Delivery slot not found" });
        return;
      }
      res.json(slot);
    } catch (error) {
      console.error("Error updating delivery slot:", error);
      res.status(500).json({ message: "Failed to update delivery slot" });
    }
  });

  app.delete("/api/admin/delivery-slots/:id", requireAdmin(), async (req: AuthenticatedAdminRequest, res) => {
    try {
      const deleted = await storage.deleteDeliveryTimeSlot(req.params.id);
      if (!deleted) {
        res.status(404).json({ message: "Delivery slot not found" });
        return;
      }
      res.json({ message: "Delivery slot deleted" });
    } catch (error) {
      console.error("Error deleting delivery slot:", error);
      res.status(500).json({ message: "Failed to delete delivery slot" });
    }
  });

  // TEMPORARY TEST ENDPOINT - REMOVE IN PRODUCTION
  app.post("/api/admin/auth/test-login", async (req, res) => {
    try {
      const admin = await storage.getAdminByUsername("admin");

      if (!admin) {
        res.status(404).json({ message: "Default admin not found. Run create-admin script first." });
        return;
      }

      await storage.updateAdminLastLogin(admin.id);

      const accessToken = generateAccessToken(admin);
      const refreshToken = generateRefreshToken(admin);

      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.json({
        accessToken,
        admin: {
          id: admin.id,
          username: admin.username,
          email: admin.email,
          role: admin.role,
        },
      });
    } catch (error) {
      console.error("Test login error:", error);
      res.status(500).json({ message: "Test login failed" });
    }
  });

  app.post("/api/admin/auth/login", async (req, res) => {
    const loginAttempt = {
      timestamp: new Date().toISOString(),
      username: req.body.username,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
      success: false,
    };

    try {
      const validation = adminLoginSchema.safeParse(req.body);
      if (!validation.success) {
        console.log('[Admin Login Failed]', { ...loginAttempt, reason: 'Invalid credentials format' });
        res.status(400).json({ message: fromZodError(validation.error).toString() });
        return;
      }

      const { username, password } = validation.data;

      let admin;
      try {
        admin = await storage.getAdminByUsername(username);
      } catch (dbError) {
        console.error("Database error while fetching admin:", dbError);
        res.status(500).json({ message: "Database error. Please ensure admin user exists." });
        return;
      }

      if (!admin) {
        console.log('[Admin Login Failed]', { ...loginAttempt, reason: 'User not found' });
        res.status(401).json({ message: "Invalid credentials" });
        return;
      }

      const isPasswordValid = await verifyPassword(password, admin.passwordHash);
      if (!isPasswordValid) {
        console.log('[Admin Login Failed]', { ...loginAttempt, reason: 'Invalid password' });
        res.status(401).json({ message: "Invalid credentials" });
        return;
      }

      await storage.updateAdminLastLogin(admin.id);

      const accessToken = generateAccessToken(admin);
      const refreshToken = generateRefreshToken(admin);

      console.log('[Admin Login Success]', {
        ...loginAttempt,
        success: true,
        adminId: admin.id,
        role: admin.role
      });

      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.json({
        accessToken,
        admin: {
          id: admin.id,
          username: admin.username,
          email: admin.email,
          role: admin.role,
        },
      });
    } catch (error) {
      console.error('[Admin Login Error]', { ...loginAttempt, error: error instanceof Error ? error.message : 'Unknown error' });
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.post("/api/admin/auth/logout", requireAdmin(), (req, res) => {
    res.clearCookie("refreshToken");
    res.json({ message: "Logged out successfully" });
  });

  // Admin token refresh
  app.post("/api/admin/auth/refresh", async (req, res) => {
    try {
      const refreshToken = req.cookies.refreshToken;

      if (!refreshToken) {
        res.status(401).json({ message: "No refresh token provided" });
        return;
      }

      const payload = verifyToken(refreshToken);
      if (!payload) {
        res.status(401).json({ message: "Invalid refresh token" });
        return;
      }

      const admin = await storage.getAdminById(payload.adminId);
      if (!admin) {
        res.status(404).json({ message: "Admin not found" });
        return;
      }

      const newAccessToken = generateAccessToken(admin);
      const newRefreshToken = generateRefreshToken(admin);

      res.cookie("refreshToken", newRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      res.json({ accessToken: newAccessToken });
    } catch (error) {
      console.error("Admin token refresh error:", error);
      res.status(500).json({ message: "Failed to refresh token" });
    }
  });

  app.get("/api/admin/dashboard/metrics", requireAdmin(), async (req, res) => {
    try {
      const metrics = await storage.getDashboardMetrics();
      res.json(metrics);
    } catch (error) {
      console.error("Dashboard metrics error:", error);
      res.status(500).json({ message: "Failed to fetch metrics" });
    }
  });

  app.get("/api/admin/orders", requireAdmin(), async (req, res) => {
    try {
      const orders = await storage.getAllOrders();
      res.json(orders);
    } catch (error) {
      console.error("Get orders error:", error);
      res.status(500).json({ message: "Failed to fetch orders" });
    }
  });

  app.patch("/api/admin/orders/:id/status", requireAdminOrManager(), async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!status) {
        res.status(400).json({ message: "Status is required" });
        return;
      }

      const order = await storage.updateOrderStatus(id, status);
      if (!order) {
        res.status(404).json({ message: "Order not found" });
        return;
      }

      broadcastOrderUpdate(order);

      // Notify assigned delivery person when order is confirmed
      if (status === "confirmed" && order.assignedTo) {
        notifyDeliveryAssignment(order, order.assignedTo);
      }

      res.json(order);
    } catch (error) {
      console.error("Update order status error:", error);
      res.status(500).json({ message: "Failed to update order status" });
    }
  });

  // Confirm payment
  app.patch("/api/admin/orders/:orderId/payment", requireAdmin(), async (req: AuthenticatedAdminRequest, res) => {
    try {
      const { orderId } = req.params;
      const { paymentStatus } = req.body;

      if (!paymentStatus || !["pending", "paid", "confirmed"].includes(paymentStatus)) {
        res.status(400).json({ message: "Invalid payment status" });
        return;
      }

      const order = await storage.getOrderById(orderId);
      if (!order) {
        res.status(404).json({ message: "Order not found" });
        return;
      }

      // Update payment status to confirmed and order status to confirmed
      const updatedOrder = await storage.updateOrderPaymentStatus(orderId, paymentStatus as "pending" | "paid" | "confirmed");

      if (paymentStatus === "confirmed") {
        // Also update order status to confirmed
        const confirmedOrder = await storage.updateOrderStatus(orderId, "confirmed");

        if (confirmedOrder) {
          console.log(`✅ Admin confirmed payment for order ${orderId} - Broadcasting to chef ${confirmedOrder.chefId}`);
          
          // For scheduled delivery orders (roti category with deliveryTime), log the scheduled delivery
          if (confirmedOrder.deliveryTime && confirmedOrder.deliverySlotId && confirmedOrder.chefId) {
            console.log(`📋 Scheduled delivery order detected for ${orderId} - Delivery Time: ${confirmedOrder.deliveryTime}`);
          }
          
          // Broadcast to chef and admin
          broadcastOrderUpdate(confirmedOrder);
        }
      }

      res.json(updatedOrder);
    } catch (error: any) {
      console.error("Error updating payment status:", error);
      res.status(500).json({ message: error.message || "Failed to update payment status" });
    }
  });

  app.post("/api/admin/orders/:id/approve", requireAdminOrManager(), async (req: AuthenticatedAdminRequest, res) => {
    try {
      const { id } = req.params;
      const adminId = req.admin?.adminId || "system";

      const order = await storage.approveOrder(id, adminId);
      if (!order) {
        res.status(404).json({ message: "Order not found" });
        return;
      }

      broadcastOrderUpdate(order);

      // Notify assigned delivery person if order is confirmed
      if (order.status === "confirmed" && order.assignedTo) {
        notifyDeliveryAssignment(order, order.assignedTo);
      }

      res.json(order);
    } catch (error) {
      console.error("Approve order error:", error);
      res.status(500).json({ message: "Failed to approve order" });
    }
  });

  app.post("/api/admin/orders/:id/reject", requireAdminOrManager(), async (req: AuthenticatedAdminRequest, res) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const adminId = req.admin?.adminId || "system";

      if (!reason) {
        res.status(400).json({ message: "Rejection reason is required" });
        return;
      }

      const order = await storage.rejectOrder(id, adminId, reason);
      if (!order) {
        res.status(404).json({ message: "Order not found" });
        return;
      }

      broadcastOrderUpdate(order);
      res.json(order);
    } catch (error) {
      console.error("Reject order error:", error);
      res.status(500).json({ message: "Failed to reject order" });
    }
  });

  app.post("/api/admin/orders/:id/assign", requireAdminOrManager(), async (req, res) => {
    try {
      const { id } = req.params;
      const { deliveryPersonId } = req.body;

      console.log(`👨‍💼 Admin assigning order ${id} to delivery person ${deliveryPersonId}`);

      if (!deliveryPersonId) {
        res.status(400).json({ message: "Delivery person ID is required" });
        return;
      }

      const deliveryPerson = await storage.getDeliveryPersonnelById(deliveryPersonId);
      if (!deliveryPerson) {
        res.status(404).json({ message: "Delivery person not found" });
        return;
      }

      if (!deliveryPerson.isActive) {
        res.status(400).json({ message: "Delivery person is not active" });
        return;
      }

      // First assign the delivery person (this will populate name and phone)
      let order = await storage.assignOrderToDeliveryPerson(id, deliveryPersonId);
      if (!order) {
        res.status(404).json({ message: "Order not found" });
        return;
      }

      // Cancel the timeout since admin manually assigned the order
      cancelPreparedOrderTimeout(id);

      console.log(`✅ Admin assigned order ${id} to ${deliveryPerson.name} (${deliveryPerson.phone})`);

      broadcastOrderUpdate(order);
      notifyDeliveryAssignment(order, deliveryPersonId);
      res.json(order);
    } catch (error) {
      console.error("Assign order error:", error);
      res.status(500).json({ message: "Failed to assign order" });
    }
  });

  app.get("/api/admin/delivery-personnel", requireAdmin(), async (req, res) => {
    try {
      const personnel = await storage.getAllDeliveryPersonnel();
      const sanitized = personnel.map(({ passwordHash, ...rest }) => rest);
      res.json(sanitized);
    } catch (error) {
      console.error("Get delivery personnel error:", error);
      res.status(500).json({ message: "Failed to fetch delivery personnel" });
    }
  });

  app.get("/api/admin/delivery-personnel/available", requireAdmin(), async (req, res) => {
    try {
      const personnel = await storage.getAvailableDeliveryPersonnel();
      const sanitized = personnel.map(({ passwordHash, ...rest }) => rest);
      res.json(sanitized);
    } catch (error) {
      console.error("Get available delivery personnel error:", error);
      res.status(500).json({ message: "Failed to fetch available delivery personnel" });
    }
  });

  app.post("/api/admin/delivery-personnel", requireAdminOrManager(), async (req, res) => {
    try {
      const validation = insertDeliveryPersonnelSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({ message: fromZodError(validation.error).toString() });
        return;
      }

      const { password, ...dataWithoutPassword } = validation.data;
      const passwordHash = await hashDeliveryPassword(password);

      const deliveryPerson = await storage.createDeliveryPersonnel({
        ...dataWithoutPassword,
        passwordHash,
      } as any);

      const { passwordHash: _, ...sanitized } = deliveryPerson;
      res.status(201).json(sanitized);
    } catch (error: any) {
      console.error("Create delivery personnel error:", error);
      if (error.message?.includes("unique")) {
        res.status(409).json({ message: "Phone number already exists" });
        return;
      }
      res.status(500).json({ message: "Failed to create delivery personnel" });
    }
  });

  app.patch("/api/admin/delivery-personnel/:id", requireAdminOrManager(), async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      const deliveryPerson = await storage.updateDeliveryPersonnel(id, updates);
      if (!deliveryPerson) {
        res.status(404).json({ message: "Delivery person not found" });
        return;
      }

      const { passwordHash, ...sanitized } = deliveryPerson;
      res.json(sanitized);
    } catch (error) {
      console.error("Update delivery personnel error:", error);
      res.status(500).json({ message: "Failed to update delivery personnel" });
    }
  });

  app.delete("/api/admin/delivery-personnel/:id", requireSuperAdmin(), async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteDeliveryPersonnel(id);
      res.json({ message: "Delivery person deleted successfully" });
    } catch (error) {
      console.error("Delete delivery personnel error:", error);
      res.status(500).json({ message: "Failed to delete delivery personnel" });
    }
  });

  app.get("/api/admin/categories", requireAdmin(), async (req, res) => {
    try {
      const categories = await storage.getAllCategories();
      res.json(categories);
    } catch (error) {
      console.error("Get categories error:", error);
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });

  app.post("/api/admin/categories", requireAdminOrManager(), async (req, res) => {
    try {
      const validation = insertCategorySchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({ message: fromZodError(validation.error).toString() });
        return;
      }

      const category = await storage.createCategory(validation.data);
      res.status(201).json(category);
    } catch (error) {
      console.error("Create category error:", error);
      res.status(500).json({ message: "Failed to create category" });
    }
  });

  app.patch("/api/admin/categories/:id", requireAdminOrManager(), async (req, res) => {
    try {
      const { id } = req.params;
      const category = await storage.updateCategory(id, req.body);

      if (!category) {
        res.status(404).json({ message: "Category not found" });
        return;
      }

      res.json(category);
    } catch (error) {
      console.error("Update category error:", error);
      res.status(500).json({ message: "Failed to update category" });
    }
  });

  app.delete("/api/admin/categories/:id", requireSuperAdmin(), async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteCategory(id);

      if (!deleted) {
        res.status(404).json({ message: "Category not found" });
        return;
      }

      res.json({ message: "Category deleted successfully" });
    } catch (error) {
      console.error("Delete category error:", error);
      res.status(500).json({ message: "Failed to delete category" });
    }
  });

  app.get("/api/admin/products", requireAdmin(), async (req, res) => {
    try {
      const products = await storage.getAllProducts();
      res.json(products);
    } catch (error) {
      console.error("Get products error:", error);
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  app.post("/api/admin/products", requireAdminOrManager(), async (req, res) => {
    try {
      const validation = insertProductSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({ message: fromZodError(validation.error).toString() });
        return;
      }

      const product = await storage.createProduct(validation.data);
      res.status(201).json(product);
    } catch (error) {
      console.error("Create product error:", error);
      res.status(500).json({ message: "Failed to create product" });
    }
  });

  app.patch("/api/admin/products/:id", requireAdminOrManager(), async (req, res) => {
    try {
      const { id } = req.params;
      const product = await storage.updateProduct(id, req.body);

      if (!product) {
        res.status(404).json({ message: "Product not found" });
        return;
      }

      // Broadcast product availability update if isAvailable or stockQuantity changed
      if (req.body.isAvailable !== undefined || req.body.stockQuantity !== undefined) {
        broadcastProductAvailabilityUpdate(product);
      }

      res.json(product);
    } catch (error) {
      console.error("Update product error:", error);
      res.status(500).json({ message: "Failed to update product" });
    }
  });

  app.delete("/api/admin/products/:id", requireSuperAdmin(), async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteProduct(id);

      if (!deleted) {
        res.status(404).json({ message: "Product not found" });
        return;
      }

      res.json({ message: "Product deleted successfully" });
    } catch (error) {
      console.error("Delete product error:", error);
      res.status(500).json({ message: "Failed to delete product" });
    }
  });

  app.get("/api/admin/users", requireAdmin(), async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Get users error:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.patch("/api/admin/users/:id", requireAdminOrManager(), async (req, res) => {
    try {
      const { id } = req.params;
      const user = await storage.updateUser(id, req.body);

      if (!user) {
        res.status(404).json({ message: "User not found" });
        return;
      }

      res.json(user);
    } catch (error) {
      console.error("Update user error:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  app.delete("/api/admin/users/:id", requireSuperAdmin(), async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteUser(id);

      if (!deleted) {
        res.status(404).json({ message: "User not found" });
        return;
      }

      res.json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Delete user error:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  app.get("/api/admin/admins", requireSuperAdmin(), async (req, res) => {
    try {
      const admins = await storage.getAllAdmins();
      const sanitized = admins.map((admin) => ({
        id: admin.id,
        username: admin.username,
        email: admin.email,
        role: admin.role,
        lastLoginAt: admin.lastLoginAt,
        createdAt: admin.createdAt,
      }));
      res.json(sanitized);
    } catch (error) {
      console.error("Get admins error:", error);
      res.status(500).json({ message: "Failed to fetch admins" });
    }
  });

  app.post("/api/admin/admins", requireSuperAdmin(), async (req, res) => {
    try {
      const validation = insertAdminUserSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({ message: fromZodError(validation.error).toString() });
        return;
      }

      const existingAdmin = await storage.getAdminByUsername(validation.data.username);
      if (existingAdmin) {
        res.status(409).json({ message: "Username already exists" });
        return;
      }

      const passwordHash = await hashPassword(validation.data.password);
      const admin = await storage.createAdmin({
        ...validation.data,
        passwordHash,
      });

      res.status(201).json({
        id: admin.id,
        username: admin.username,
        email: admin.email,
        role: admin.role,
        password: validation.data.password,
        createdAt: admin.createdAt,
      });
    } catch (error) {
      console.error("Create admin error:", error);
      res.status(500).json({ message: "Failed to create admin" });
    }
  });

  app.get("/api/admin/chefs", requireAdmin(), async (req, res) => {
    try {
      const chefs = await storage.getChefs();
      // Ensure isActive is properly serialized as boolean
      const serializedChefs = chefs.map(chef => ({
        ...chef,
        isActive: Boolean(chef.isActive)
      }));
      res.json(serializedChefs);
    } catch (error) {
      console.error("Get chefs error:", error);
      res.status(500).json({ message: "Failed to fetch chefs" });
    }
  });

  app.post("/api/admin/chefs", requireAdminOrManager(), async (req, res) => {
    try {
      const chef = await storage.createChef(req.body);
      res.status(201).json(chef);
    } catch (error) {
      console.error("Create chef error:", error);
      res.status(500).json({ message: "Failed to create chef" });
    }
  });

  app.patch("/api/admin/chefs/:id", requireAdminOrManager(), async (req, res) => {
    try {
      const { id } = req.params;
      const chef = await storage.updateChef(id, req.body);
      if (!chef) {
        res.status(404).json({ message: "Chef not found" });
        return;
      }

      // If isActive status was changed, broadcast the update
      if (req.body.isActive !== undefined) {
        const { broadcastChefStatusUpdate } = await import("./websocket");
        broadcastChefStatusUpdate(chef);
      }

      res.json(chef);
    } catch (error) {
      console.error("Error updating chef:", error);
      res.status(500).json({ message: "Failed to update chef" });
    }
  });

  app.delete("/api/admin/chefs/:id", requireSuperAdmin(), async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteChef(id);

      if (!deleted) {
        res.status(404).json({ message: "Chef not found" });
        return;
      }

      res.json({ message: "Chef deleted successfully" });
    } catch (error) {
      console.error("Delete chef error:", error);
      res.status(500).json({ message: "Failed to delete chef" });
    }
  });

  app.get("/api/admin/partners", requireAdmin(), async (req, res) => {
    try {
      const partners = await storage.getAllPartners();
      const sanitized = partners.map((partner) => ({
        id: partner.id,
        username: partner.username,
        email: partner.email,
        chefId: partner.chefId,
        lastLoginAt: partner.lastLoginAt,
        createdAt: partner.createdAt,
      }));
      res.json(sanitized);
    } catch (error) {
      console.error("Get partners error:", error);
      res.status(500).json({ message: "Failed to fetch partners" });
    }
  });

  // Create partner
  app.post("/api/admin/partners", requireAdmin(), async (req: AuthenticatedAdminRequest, res) => {
    try {
      const { chefId, username, email, password } = req.body;

      if (!chefId || !username || !email || !password) {
        res.status(400).json({ message: "All fields are required" });
        return;
      }

      if (password.length < 8) {
        res.status(400).json({ message: "Password must be at least 8 characters" });
        return;
      }

      const normalizedUsername = username.trim().toLowerCase();

      if (normalizedUsername.length < 3) {
        res.status(400).json({ message: "Username must be at least 3 characters" });
        return;
      }

      const existingPartner = await storage.getPartnerByUsername(normalizedUsername);
      if (existingPartner) {
        res.status(400).json({ message: "Username already exists" });
        return;
      }

      const chef = await storage.getChefById(chefId);
      if (!chef) {
        res.status(400).json({ message: "Chef not found" });
        return;
      }

      // Prevent creating a partner for a chef that already has a partner
      const allPartners = await storage.getAllPartners();
      const partnerForChef = allPartners.find(p => p.chefId === chefId);
      if (partnerForChef) {
        res.status(400).json({ message: "A partner account for this chef already exists" });
        return;
      }

      // Prevent duplicate partner email
      const normalizedEmail = (email || "").trim().toLowerCase();
      const emailConflict = allPartners.find(p => p.email === normalizedEmail);
      if (emailConflict) {
        res.status(400).json({ message: "Email already in use by another partner" });
        return;
      }

      const passwordHash = await hashPassword(password);
      const partner = await storage.createPartner({
        chefId,
        username: normalizedUsername,
        email: normalizedEmail,
        passwordHash,
      } as any);

      res.json(partner);
    } catch (error) {
      console.error("Error creating partner:", error);
      res.status(500).json({ message: "Failed to create partner" });
    }
  });

  app.delete("/api/admin/partners/:id", requireSuperAdmin(), async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deletePartner(id);

      if (!deleted) {
        res.status(404).json({ message: "Partner not found" });
        return;
      }

      res.json({ message: "Partner deleted successfully" });
    } catch (error) {
      console.error("Delete partner error:", error);
      res.status(500).json({ message: "Failed to delete partner" });
    }
  });

  app.patch("/api/admin/admins/:id", requireSuperAdmin(), async (req, res) => {
    try {
      const { id } = req.params;
      const { role } = req.body;

      if (!role) {
        res.status(400).json({ message: "Role is required" });
        return;
      }

      const admin = await storage.updateAdminRole(id, role);

      if (!admin) {
        res.status(404).json({ message: "Admin not found" });
        return;
      }

      res.json({
        id: admin.id,
        username: admin.username,
        email: admin.email,
        role: admin.role,
        lastLoginAt: admin.lastLoginAt,
        createdAt: admin.createdAt,
      });
    } catch (error) {
      console.error("Update admin role error:", error);
      res.status(500).json({ message: "Failed to update admin role" });
    }
  });

  app.delete("/api/admin/admins/:id", requireSuperAdmin(), async (req, res) => {
    try {
      const { id } = req.params;
      const adminReq = req as AuthenticatedAdminRequest;

      if (adminReq.admin?.adminId === id) {
        res.status(400).json({ message: "Cannot delete your own admin account" });
        return;
      }

      const deleted = await storage.deleteAdmin(id);

      if (!deleted) {
        res.status(404).json({ message: "Admin not found" });
        return;
      }

      res.json({ message: "Admin deleted successfully" });
    } catch (error) {
      console.error("Delete admin error:", error);
      res.status(500).json({ message: "Failed to delete admin" });
    }
  });

  // Subscription Plans
  // Promotional Banners Management
  app.get("/api/admin/promotional-banners", requireAdmin(), async (req, res) => {
    try {
      const banners = await storage.getAllPromotionalBanners();
      res.json(banners);
    } catch (error) {
      console.error("Error fetching promotional banners:", error);
      res.status(500).json({ message: "Failed to fetch promotional banners" });
    }
  });

  app.post("/api/admin/promotional-banners", requireAdmin(), async (req, res) => {
    try {
      const banner = await storage.createPromotionalBanner(req.body);
      res.status(201).json(banner);
    } catch (error) {
      console.error("Error creating promotional banner:", error);
      res.status(500).json({ message: "Failed to create promotional banner" });
    }
  });

  app.patch("/api/admin/promotional-banners/:id", requireAdmin(), async (req, res) => {
    try {
      const { id } = req.params;
      const banner = await storage.updatePromotionalBanner(id, req.body);
      if (!banner) {
        res.status(404).json({ message: "Banner not found" });
        return;
      }
      res.json(banner);
    } catch (error) {
      console.error("Error updating promotional banner:", error);
      res.status(500).json({ message: "Failed to update promotional banner" });
    }
  });

  app.delete("/api/admin/promotional-banners/:id", requireAdmin(), async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deletePromotionalBanner(id);
      if (!deleted) {
        res.status(404).json({ message: "Banner not found" });
        return;
      }
      res.json({ message: "Banner deleted successfully" });
    } catch (error) {
      console.error("Error deleting promotional banner:", error);
      res.status(500).json({ message: "Failed to delete promotional banner" });
    }
  });

  app.get("/api/admin/subscription-plans", requireAdmin(), async (req, res) => {
    try {
      const plans = await storage.getSubscriptionPlans();
      res.json(plans);
    } catch (error) {
      console.error("Get subscription plans error:", error);
      res.status(500).json({ message: "Failed to fetch subscription plans" });
    }
  });

  app.post("/api/admin/subscription-plans", requireAdminOrManager(), async (req, res) => {
    try {
      const plan = await storage.createSubscriptionPlan(req.body);
      res.status(201).json(plan);
    } catch (error) {
      console.error("Create subscription plan error:", error);
      res.status(500).json({ message: "Failed to create subscription plan" });
    }
  });

  app.patch("/api/admin/subscription-plans/:id", requireAdminOrManager(), async (req, res) => {
    try {
      const { id } = req.params;
      const plan = await storage.updateSubscriptionPlan(id, req.body);

      if (!plan) {
        res.status(404).json({ message: "Subscription plan not found" });
        return;
      }

      res.json(plan);
    } catch (error) {
      console.error("Update subscription plan error:", error);
      res.status(500).json({ message: "Failed to update subscription plan" });
    }
  });

  app.delete("/api/admin/subscription-plans/:id", requireAdminOrManager(), async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteSubscriptionPlan(id);
      res.json({ message: "Subscription plan deleted successfully" });
    } catch (error) {
      console.error("Delete subscription plan error:", error);
      res.status(500).json({ message: "Failed to delete subscription plan" });
    }
  });

  // Get all subscriptions
  app.get("/api/admin/subscriptions", requireAdmin(), async (req, res) => {
    try {
      const subscriptions = await storage.getSubscriptions();
      res.json(subscriptions);
    } catch (error: any) {
      console.error("Error fetching subscriptions:", error);
      res.status(500).json({ message: error.message || "Failed to fetch subscriptions" });
    }
  });

  // Confirm subscription payment
  app.post("/api/admin/subscriptions/:id/confirm-payment", requireAdmin(), async (req: AuthenticatedAdminRequest, res) => {
    try {
      const subscriptionId = req.params.id?.trim();

      if (!subscriptionId) {
        res.status(400).json({ message: "Subscription ID is required" });
        return;
      }

      const subscription = await storage.getSubscription(subscriptionId);

      if (!subscription) {
        res.status(404).json({ message: "Subscription not found" });
        return;
      }

      if (subscription.isPaid) {
        res.status(400).json({ 
          message: "Subscription already confirmed and active",
          subscription 
        });
        return;
      }

      if (!subscription.paymentTransactionId) {
        res.status(400).json({ 
          message: "No payment transaction ID found. User must submit payment first." 
        });
        return;
      }

      // Auto-assign chef if not already assigned
      let chefId = subscription.chefId;
      let chefAssignedAt = subscription.chefAssignedAt;

      if (!chefId) {
        const plan = await storage.getSubscriptionPlan(subscription.planId);
        if (!plan) {
          res.status(404).json({ message: "Subscription plan not found" });
          return;
        }

        const bestChef = await storage.findBestChefForCategory(plan.categoryId);
        if (bestChef) {
          chefId = bestChef.id;
          chefAssignedAt = new Date();
          console.log(`👨‍🍳 Auto-assigned chef ${bestChef.name} (${bestChef.id}) to subscription ${subscriptionId}`);
        } else {
          console.warn(`⚠️ No available chef found for category ${plan.categoryId}`);
        }
      }

      // Update subscription - mark as paid, activate, and assign chef
      const updated = await storage.updateSubscription(subscriptionId, {
        isPaid: true,
        status: "active",
        chefId,
        chefAssignedAt,
      });

      if (!updated) {
        res.status(500).json({ message: "Failed to update subscription" });
        return;
      }

      console.log(`✅ Admin confirmed payment for subscription ${subscriptionId} (TxnID: ${subscription.paymentTransactionId}) - Subscription activated`);

      // Broadcast the subscription update to customer, admin, and chef
      const { broadcastSubscriptionUpdate, broadcastSubscriptionAssignmentToPartner } = await import("./websocket");
      if (updated) {
        // Get plan name and chef name for notifications
        const plan = await storage.getSubscriptionPlan(updated.planId);

        // First broadcast general update
        broadcastSubscriptionUpdate(updated);
        console.log(`📣 Broadcasted subscription activation to all connected clients`);

        // Then send specific assignment notification to partner
        if (chefId) {
          const chef = await storage.getChefById(chefId);
          broadcastSubscriptionAssignmentToPartner(updated, chef?.name, plan?.name);
          console.log(`📣 Broadcasted assignment notification to partner (Chef: ${chef?.name})`);
        }
      }

      // Create today's delivery log if the subscription starts today and notify chef
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const nextDelivery = new Date(updated.nextDeliveryDate);
      nextDelivery.setHours(0, 0, 0, 0);

      if (nextDelivery.getTime() === today.getTime() && chefId) {
        const existingLog = await storage.getDeliveryLogBySubscriptionAndDate(subscriptionId, today);
        if (!existingLog) {
          await storage.createSubscriptionDeliveryLog({
            subscriptionId,
            date: today,
            time: updated.nextDeliveryTime || "09:00",
            status: "scheduled",
            deliveryPersonId: null,
            notes: "Auto-created on payment confirmation",
          });
          console.log(`📋 Created today's delivery log for subscription ${subscriptionId}`);
        }
      }

      res.json({ 
        message: "Payment verified and subscription activated", 
        subscription: updated 
      });
    } catch (error: any) {
      console.error("Error confirming subscription payment:", error);
      res.status(500).json({ 
        message: error.message || "Failed to confirm payment" 
      });
    }
  });

  // Verify subscription payment (admin action) - added error handling and logging
  app.post("/api/admin/subscriptions/:id/verify-payment", requireAdmin(), async (req: AuthenticatedAdminRequest, res) => {
    try {
      const { id } = req.params;

      console.log("Admin verifying subscription payment:", id);

      const subscription = await db.query.subscriptions.findFirst({
        where: eq(subscriptions.id, id),
      });

      if (!subscription) {
        console.error("Subscription not found for verification:", id);
        return res.status(404).json({ message: "Subscription not found" });
      }

      if (subscription.isPaid) {
        return res.status(400).json({ message: "Payment already verified" });
      }

      if (!subscription.paymentTransactionId) {
        return res.status(400).json({ message: "No payment transaction ID found" });
      }

      // Auto-assign chef if not already assigned
      let chefId = subscription.chefId;
      let chefAssignedAt = subscription.chefAssignedAt;

      if (!chefId) {
        const plan = await storage.getSubscriptionPlan(subscription.planId);
        if (plan) {
          const bestChef = await storage.findBestChefForCategory(plan.categoryId);
          if (bestChef) {
            chefId = bestChef.id;
            chefAssignedAt = new Date();
            console.log(`👨‍🍳 Auto-assigned chef ${bestChef.name} (${bestChef.id}) to subscription ${id}`);
          }
        }
      }

      // Mark as paid, activate, and assign chef
      await db.update(subscriptions)
        .set({
          isPaid: true,
          status: "active",
          chefId,
          chefAssignedAt,
          updatedAt: new Date(),
        })
        .where(eq(subscriptions.id, id));

      console.log("Subscription payment verified successfully:", id);

      res.json({
        message: "Payment verified and subscription activated",
      });
    } catch (error) {
      console.error("Error verifying subscription payment:", error);
      res.status(500).json({
        message: "Failed to verify payment",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Admin manually reassign chef to subscription
  app.put("/api/admin/subscriptions/:id/assign-chef", requireAdmin(), async (req: AuthenticatedAdminRequest, res) => {
    try {
      const { id } = req.params;
      const { chefId } = req.body;

      if (!chefId) {
        res.status(400).json({ message: "Chef ID is required" });
        return;
      }

      const subscription = await storage.getSubscription(id);
      if (!subscription) {
        res.status(404).json({ message: "Subscription not found" });
        return;
      }

      // Verify the chef exists and is active
      const chef = await storage.getChefById(chefId);
      if (!chef) {
        res.status(404).json({ message: "Chef not found" });
        return;
      }

      if (!chef.isActive) {
        res.status(400).json({ message: "Chef is not active" });
        return;
      }

      // Optionally validate chef's category matches plan's category
      const plan = await storage.getSubscriptionPlan(subscription.planId);
      if (plan && chef.categoryId !== plan.categoryId) {
        res.status(400).json({ 
          message: `Chef ${chef.name} belongs to a different category. Expected category: ${plan.categoryId}, Chef category: ${chef.categoryId}` 
        });
        return;
      }

      const updated = await storage.assignChefToSubscription(id, chefId);

      console.log(`👨‍🍳 Admin reassigned chef ${chef.name} (${chefId}) to subscription ${id}`);

      // Broadcast the subscription update to chef and admin
      if (updated) {
        const { broadcastSubscriptionUpdate } = await import("./websocket");
        broadcastSubscriptionUpdate(updated);

        // Notify the newly assigned partner about the subscription
        broadcastSubscriptionAssignmentToPartner(updated, chef.name, plan?.name);
      }

      res.json({ 
        message: `Chef ${chef.name} assigned to subscription successfully`,
        subscription: updated 
      });
    } catch (error: any) {
      console.error("Error assigning chef to subscription:", error);
      res.status(500).json({ message: error.message || "Failed to assign chef" });
    }
  });

  // ================= SUBSCRIPTION PAYMENT ADJUSTMENT ENDPOINTS =================

  // Adjust subscription payment with wallet, coupon, and/or discount
  app.post("/api/admin/subscriptions/:id/adjust-payment", requireAdminOrManager(), async (req: AuthenticatedAdminRequest, res) => {
    try {
      const { id } = req.params;
      const { 
        walletAmount, 
        couponCode, 
        discountAmount, 
        notes,
        transactionId 
      } = req.body;

      const subscription = await storage.getSubscription(id);
      if (!subscription) {
        res.status(404).json({ message: "Subscription not found" });
        return;
      }

      const plan = await storage.getSubscriptionPlan(subscription.planId);
      if (!plan) {
        res.status(404).json({ message: "Subscription plan not found" });
        return;
      }

      let originalPrice = plan.price;
      let walletUsed = 0;
      let couponDiscount = 0;
      let adminDiscount = discountAmount || 0;

      // Validate and apply wallet amount
      if (walletAmount && walletAmount > 0) {
        const user = await storage.getUser(subscription.userId);
        if (!user) {
          res.status(404).json({ message: "User not found" });
          return;
        }

        if (walletAmount > user.walletBalance) {
          res.status(400).json({ message: `Insufficient wallet balance. Available: ${user.walletBalance}` });
          return;
        }

        walletUsed = walletAmount;
      }

      // Validate and apply coupon
      if (couponCode) {
        const coupon = await storage.getCouponByCode(couponCode);
        if (!coupon) {
          res.status(404).json({ message: "Coupon not found" });
          return;
        }

        if (!coupon.isActive) {
          res.status(400).json({ message: "Coupon is not active" });
          return;
        }

        if (coupon.expiryDate && new Date(coupon.expiryDate) < new Date()) {
          res.status(400).json({ message: "Coupon has expired" });
          return;
        }

        if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
          res.status(400).json({ message: "Coupon usage limit reached" });
          return;
        }

        // Calculate coupon discount
        if (coupon.discountType === "percentage") {
          couponDiscount = Math.round(originalPrice * (coupon.discountValue / 100));
          // Apply max discount cap if set
          if (coupon.maxDiscountAmount && couponDiscount > coupon.maxDiscountAmount) {
            couponDiscount = coupon.maxDiscountAmount;
          }
        } else {
          couponDiscount = coupon.discountValue;
        }
      }

      // Calculate final amount
      const finalAmount = Math.max(0, originalPrice - walletUsed - couponDiscount - adminDiscount);

      // Deduct wallet if used
      if (walletUsed > 0) {
        await storage.updateUser(subscription.userId, {
          walletBalance: (await storage.getUser(subscription.userId))!.walletBalance - walletUsed,
        });

        // Create wallet transaction record
        await storage.createWalletTransaction({
          userId: subscription.userId,
          amount: -walletUsed,
          type: "debit",
          description: `Subscription payment for ${plan.name}`,
          referenceId: subscription.id,
          referenceType: "subscription",
        });
      }

      // Increment coupon usage if used
      if (couponCode) {
        const coupon = await storage.getCouponByCode(couponCode);
        if (coupon) {
          await storage.updateCoupon(coupon.id, {
            usedCount: coupon.usedCount + 1,
          });
        }
      }

      // Update subscription with payment details
      const updated = await storage.updateSubscription(id, {
        originalPrice,
        discountAmount: adminDiscount,
        walletAmountUsed: walletUsed,
        couponCode: couponCode || null,
        couponDiscount,
        finalAmount,
        paymentNotes: notes || null,
        paymentTransactionId: transactionId || subscription.paymentTransactionId,
      });

      console.log(`💰 Admin adjusted payment for subscription ${id}: Original ₹${originalPrice}, Wallet ₹${walletUsed}, Coupon ₹${couponDiscount}, Discount ₹${adminDiscount}, Final ₹${finalAmount}`);

      res.json({
        message: "Payment adjusted successfully",
        subscription: updated,
        paymentBreakdown: {
          originalPrice,
          walletUsed,
          couponDiscount,
          adminDiscount,
          finalAmount,
        },
      });
    } catch (error: any) {
      console.error("Error adjusting subscription payment:", error);
      res.status(500).json({ message: error.message || "Failed to adjust payment" });
    }
  });

  // Quick confirm payment without adjustments (for already paid subscriptions)
  app.post("/api/admin/subscriptions/:id/quick-confirm", requireAdminOrManager(), async (req: AuthenticatedAdminRequest, res) => {
    try {
      const { id } = req.params;
      const { transactionId, notes } = req.body;

      const subscription = await storage.getSubscription(id);
      if (!subscription) {
        res.status(404).json({ message: "Subscription not found" });
        return;
      }

      if (subscription.isPaid) {
        res.status(400).json({ message: "Subscription is already paid" });
        return;
      }

      const plan = await storage.getSubscriptionPlan(subscription.planId);
      if (!plan) {
        res.status(404).json({ message: "Subscription plan not found" });
        return;
      }

      // Auto-assign chef if not already assigned
      let chefId = subscription.chefId;
      let chefAssignedAt = subscription.chefAssignedAt;

      if (!chefId) {
        const bestChef = await storage.findBestChefForCategory(plan.categoryId);
        if (bestChef) {
          chefId = bestChef.id;
          chefAssignedAt = new Date();
          console.log(`👨‍🍳 Auto-assigned chef ${bestChef.name} (${bestChef.id}) to subscription ${id}`);
        }
      }

      // Mark as paid and active
      const updated = await storage.updateSubscription(id, {
        isPaid: true,
        status: "active",
        chefId,
        chefAssignedAt,
        paymentTransactionId: transactionId || null,
        originalPrice: plan.price,
        finalAmount: plan.price,
        paymentNotes: notes || null,
      });

      console.log(`✅ Admin quick-confirmed payment for subscription ${id} (TxnID: ${transactionId || 'N/A'})`);

      res.json({
        message: "Payment confirmed and subscription activated",
        subscription: updated,
      });
    } catch (error: any) {
      console.error("Error quick confirming payment:", error);
      res.status(500).json({ message: error.message || "Failed to confirm payment" });
    }
  });

  // Get payment history/breakdown for a subscription
  app.get("/api/admin/subscriptions/:id/payment-details", requireAdmin(), async (req: AuthenticatedAdminRequest, res) => {
    try {
      const { id } = req.params;

      const subscription = await storage.getSubscription(id);
      if (!subscription) {
        res.status(404).json({ message: "Subscription not found" });
        return;
      }

      const plan = await storage.getSubscriptionPlan(subscription.planId);

      res.json({
        subscriptionId: id,
        planName: plan?.name || "Unknown",
        planPrice: plan?.price || 0,
        isPaid: subscription.isPaid,
        paymentTransactionId: subscription.paymentTransactionId,
        originalPrice: subscription.originalPrice || plan?.price || 0,
        walletAmountUsed: subscription.walletAmountUsed || 0,
        couponCode: subscription.couponCode,
        couponDiscount: subscription.couponDiscount || 0,
        discountAmount: subscription.discountAmount || 0,
        finalAmount: subscription.finalAmount || plan?.price || 0,
        paymentNotes: subscription.paymentNotes,
      });
    } catch (error: any) {
      console.error("Error fetching payment details:", error);
      res.status(500).json({ message: error.message || "Failed to fetch payment details" });
    }
  });

  // Get today's subscription deliveries (used by admin dashboard) - MUST be before :id route
  app.get("/api/admin/subscriptions/today-deliveries", requireAdmin(), async (req: AuthenticatedAdminRequest, res) => {
    try {
      const allSubscriptions = await storage.getSubscriptions();
      const subscriptions = allSubscriptions.filter(s => s.isPaid && s.status !== "cancelled");

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString().split('T')[0];

      const todaysLogs = await storage.getSubscriptionDeliveryLogsByDate(today);

      const deliveries: any[] = [];
      let preparing = 0;
      let outForDelivery = 0;
      let delivered = 0;
      let scheduled = 0;

      for (const sub of subscriptions) {
        const nextDelivery = new Date(sub.nextDeliveryDate);
        nextDelivery.setHours(0, 0, 0, 0);
        const nextDeliveryStr = nextDelivery.toISOString().split('T')[0];

        if (nextDeliveryStr === todayStr && sub.status !== "paused" && sub.status !== "cancelled") {
          const plan = await storage.getSubscriptionPlan(sub.planId);
          const deliveryLog = todaysLogs.find(log => log.subscriptionId === sub.id);

          const currentStatus = deliveryLog?.status || "scheduled";

          if (currentStatus === "preparing") preparing++;
          else if (currentStatus === "out_for_delivery") outForDelivery++;
          else if (currentStatus === "delivered") delivered++;
          else scheduled++;

          deliveries.push({
            id: deliveryLog?.id || sub.id,
            subscriptionId: sub.id,
            customerName: sub.customerName,
            phone: sub.phone,
            address: sub.address,
            planName: plan?.name || "Unknown Plan",
            time: sub.nextDeliveryTime || "09:00",
            status: currentStatus,
          });
        }
      }

      res.json({
        totalToday: deliveries.length,
        scheduled,
        preparing,
        outForDelivery,
        delivered,
        deliveries,
      });
    } catch (error) {
      console.error("Error fetching today's deliveries:", error);
      res.status(500).json({ message: "Failed to fetch today's deliveries" });
    }
  });

  // Get subscription by ID
  app.get("/api/admin/subscriptions/:id", requireAdmin(), async (req: AuthenticatedAdminRequest, res) => {
    try {
      const subscription = await storage.getSubscription(req.params.id);
      if (!subscription) {
        res.status(404).json({ message: "Subscription not found" });
        return;
      }
      res.json(subscription);
    } catch (error) {
      console.error("Error fetching subscription:", error);
      res.status(500).json({ message: "Failed to fetch subscription" });
    }
  });

  // Get delivery logs for a subscription
  app.get("/api/admin/subscriptions/:id/delivery-logs", requireAdmin(), async (req: AuthenticatedAdminRequest, res) => {
    try {
      const subscription = await storage.getSubscription(req.params.id);
      if (!subscription) {
        res.status(404).json({ message: "Subscription not found" });
        return;
      }
      const logs = await storage.getSubscriptionDeliveryLogs(req.params.id);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching delivery logs:", error);
      res.status(500).json({ message: "Failed to fetch delivery logs" });
    }
  });

  // Create a delivery log for a subscription
  app.post("/api/admin/subscriptions/:id/delivery-logs", requireAdmin(), async (req: AuthenticatedAdminRequest, res) => {
    try {
      const subscription = await storage.getSubscription(req.params.id);
      if (!subscription) {
        res.status(404).json({ message: "Subscription not found" });
        return;
      }

      const { date, status, notes, deliveryPersonId, deliveryTime } = req.body;

      const log = await storage.createSubscriptionDeliveryLog({
        subscriptionId: req.params.id,
        date: new Date(date),
        status: status || "scheduled",
        notes: notes || null,
        deliveryPersonId: deliveryPersonId || null,
        time: deliveryTime || subscription.nextDeliveryTime || "09:00",
      });

      console.log(`📝 Admin created delivery log for subscription ${req.params.id}: ${status}`);
      res.status(201).json(log);
    } catch (error) {
      console.error("Error creating delivery log:", error);
      res.status(500).json({ message: "Failed to create delivery log" });
    }
  });

  // Update delivery status
  app.patch("/api/admin/subscriptions/:subscriptionId/delivery-logs/:logId", requireAdmin(), async (req: AuthenticatedAdminRequest, res) => {
    try {
      const { subscriptionId, logId } = req.params;
      const { status, notes, deliveryPersonId, deliveryTime } = req.body;

      // Validate IDs
      if (!subscriptionId?.trim() || !logId?.trim()) {
        res.status(400).json({ message: "Valid subscription ID and log ID are required" });
        return;
      }

      // Validate status if provided
      const validStatuses = ["scheduled", "preparing", "out_for_delivery", "delivered", "missed"];
      if (status && !validStatuses.includes(status)) {
        res.status(400).json({ 
          message: "Invalid status",
          validStatuses 
        });
        return;
      }

      // Validate delivery time format if provided
      if (deliveryTime && !/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(deliveryTime)) {
        res.status(400).json({ 
          message: "Invalid delivery time format. Use HH:mm" 
        });
        return;
      }

      const subscription = await storage.getSubscription(subscriptionId.trim());
      if (!subscription) {
        res.status(404).json({ message: "Subscription not found" });
        return;
      }

      const existingLog = await storage.getSubscriptionDeliveryLog(logId.trim());
      if (!existingLog || existingLog.subscriptionId !== subscriptionId.trim()) {
        res.status(404).json({ message: "Delivery log not found" });
        return;
      }

      // Build update data
      const updateData: any = {};
      if (status) updateData.status = status;
      if (notes !== undefined) updateData.notes = notes;
      if (deliveryPersonId !== undefined) updateData.deliveryPersonId = deliveryPersonId;
      if (deliveryTime !== undefined) updateData.time = deliveryTime;

      const updatedLog = await storage.updateSubscriptionDeliveryLog(logId.trim(), updateData);

      if (!updatedLog) {
        res.status(500).json({ message: "Failed to update delivery log" });
        return;
      }

      // If delivery is marked as delivered, update subscription
      if (status === "delivered" && existingLog.date && subscription.remainingDeliveries > 0) {
        await storage.updateSubscription(subscriptionId.trim(), {
          lastDeliveryDate: new Date(existingLog.date),
          remainingDeliveries: Math.max(0, subscription.remainingDeliveries - 1),
        });
      }

      console.log(`✏️ Admin updated delivery log ${logId} status to: ${status}`);
      res.json(updatedLog);
    } catch (error: any) {
      console.error("Error updating delivery log:", error);
      res.status(500).json({ 
        message: error.message || "Failed to update delivery log" 
      });
    }
  });

  // Bulk update delivery status for today's deliveries
  app.post("/api/admin/subscriptions/delivery-logs/today", requireAdmin(), async (req: AuthenticatedAdminRequest, res) => {
    try {
      const today = new Date();
      const logs = await storage.getSubscriptionDeliveryLogsByDate(today);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching today's delivery logs:", error);
      res.status(500).json({ message: "Failed to fetch today's delivery logs" });
    }
  });

  // Update delivery status for a specific subscription (admin dashboard)
  app.patch("/api/admin/subscriptions/:subscriptionId/delivery-status", requireAdmin(), async (req: AuthenticatedAdminRequest, res) => {
    try {
      const { subscriptionId } = req.params;
      const { status } = req.body;
      const adminId = req.admin?.adminId || "system";

      if (!status || !["scheduled", "preparing", "out_for_delivery", "delivered", "missed"].includes(status)) {
        res.status(400).json({ message: "Invalid status" });
        return;
      }

      const subscription = await storage.getSubscription(subscriptionId);
      if (!subscription) {
        res.status(404).json({ message: "Subscription not found" });
        return;
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const time = new Date().toTimeString().slice(0, 5);

      const todaysLogs = await storage.getSubscriptionDeliveryLogsByDate(today);
      let deliveryLog = todaysLogs.find(log => log.subscriptionId === subscriptionId);

      if (!deliveryLog) {
        deliveryLog = await storage.createSubscriptionDeliveryLog({
          subscriptionId,
          date: today,
          time,
          status: status as any,
          deliveryPersonId: null,
          notes: `Status set to ${status} by admin`,
        });
      } else {
        deliveryLog = await storage.updateSubscriptionDeliveryLog(deliveryLog.id, {
          status: status as any,
          notes: `Status updated to ${status} by admin`,
        });
      }

      if (status === "delivered" && subscription.remainingDeliveries > 0) {
        const nextDate = new Date(subscription.nextDeliveryDate);
        nextDate.setDate(nextDate.getDate() + 1);

        await storage.updateSubscription(subscriptionId, {
          remainingDeliveries: subscription.remainingDeliveries - 1,
          nextDeliveryDate: nextDate,
          lastDeliveryDate: today,
        });
      }

      console.log(`✅ Admin updated subscription ${subscriptionId} delivery status to: ${status}`);
      res.json(deliveryLog);
    } catch (error) {
      console.error("Error updating delivery status:", error);
      res.status(500).json({ message: "Failed to update delivery status" });
    }
  });

  // Change subscription status (active/paused/cancelled)
  app.patch("/api/admin/subscriptions/:subscriptionId/status", requireAdmin(), async (req: AuthenticatedAdminRequest, res) => {
    try {
      const { subscriptionId } = req.params;
      const { status } = req.body;

      if (!status || !["active", "paused", "cancelled"].includes(status)) {
        res.status(400).json({ message: "Invalid status" });
        return;
      }

      const subscription = await storage.getSubscription(subscriptionId);
      if (!subscription) {
        res.status(404).json({ message: "Subscription not found" });
        return;
      }

      const updateData: any = { status };

      if (status === "paused") {
        updateData.pauseStartDate = new Date();
      } else if (status === "active") {
        updateData.pauseStartDate = null;
        updateData.pauseResumeDate = null;
      }

      const updated = await storage.updateSubscription(subscriptionId, updateData);
      console.log(`📋 Admin changed subscription ${subscriptionId} status to: ${status}`);
      res.json(updated);
    } catch (error) {
      console.error("Error changing subscription status:", error);
      res.status(500).json({ message: "Failed to change subscription status" });
    }
  });



  // Manual subscription adjustment (add/remove deliveries)
  app.post("/api/admin/subscriptions/:id/adjust", requireAdmin(), async (req: AuthenticatedAdminRequest, res) => {
    try {
      const { adjustment, deliveryAdjustment, reason, extendDays, status, nextDeliveryDate } = req.body;
      const subscription = await storage.getSubscription(req.params.id);

      if (!subscription) {
        res.status(404).json({ message: "Subscription not found" });
        return;
      }

      const updateData: any = {};

      // Adjust remaining deliveries (support both parameter names)
      const deliveryChange = adjustment ?? deliveryAdjustment;
      if (typeof deliveryChange === 'number' && deliveryChange !== 0) {
        const newRemaining = Math.max(0, subscription.remainingDeliveries + deliveryChange);
        updateData.remainingDeliveries = newRemaining;
        updateData.totalDeliveries = Math.max(0, subscription.totalDeliveries + deliveryChange);
      }

      // Extend subscription end date
      if (typeof extendDays === 'number' && extendDays > 0 && subscription.endDate) {
        const currentEndDate = new Date(subscription.endDate);
        currentEndDate.setDate(currentEndDate.getDate() + extendDays);
        updateData.endDate = currentEndDate;
      }

      // Update status
      if (status && ["active", "paused", "cancelled"].includes(status)) {
        updateData.status = status;
        if (status === "active") {
          updateData.pauseStartDate = null;
          updateData.pauseResumeDate = null;
        }
      }

      // Update next delivery date
      if (nextDeliveryDate) {
        updateData.nextDeliveryDate = new Date(nextDeliveryDate);
      }

      const updated = await storage.updateSubscription(req.params.id, updateData);

      console.log(`⚙️ Admin adjusted subscription ${req.params.id}: deliveryChange=${deliveryChange}, status=${status}, extendDays=${extendDays}, reason=${reason}`);

      // Broadcast the subscription update
      if (updated) {
        const { broadcastSubscriptionUpdate } = await import("./websocket");
        broadcastSubscriptionUpdate(updated);
      }

      res.json({ message: "Subscription adjusted successfully", subscription: updated });
    } catch (error) {
      console.error("Error adjusting subscription:", error);
      res.status(500).json({ message: "Failed to adjust subscription" });
    }
  });

  // Admin pause/resume subscription
  app.post("/api/admin/subscriptions/:id/status", requireAdmin(), async (req: AuthenticatedAdminRequest, res) => {
    try {
      const { status, pauseStartDate, pauseResumeDate } = req.body;
      const subscription = await storage.getSubscription(req.params.id);

      if (!subscription) {
        res.status(404).json({ message: "Subscription not found" });
        return;
      }

      const updateData: any = { status };

      if (status === "paused") {
        updateData.pauseStartDate = pauseStartDate ? new Date(pauseStartDate) : new Date();
        if (pauseResumeDate) {
          updateData.pauseResumeDate = new Date(pauseResumeDate);
        }
      } else if (status === "active") {
        updateData.pauseStartDate = null;
        updateData.pauseResumeDate = null;
      }

      const updated = await storage.updateSubscription(req.params.id, updateData);
      console.log(`🔄 Admin updated subscription ${req.params.id} status to: ${status}`);

      // Broadcast the subscription update
      if (updated) {
        const { broadcastSubscriptionUpdate } = await import("./websocket");
        broadcastSubscriptionUpdate(updated);
      }

      res.json(updated);
    } catch (error) {
      console.error("Error updating subscription status:", error);
      res.status(500).json({ message: "Failed to update subscription status" });
    }
  });

  // Cancel subscription with optional refund
  app.post("/api/admin/subscriptions/:id/cancel", requireAdmin(), async (req: AuthenticatedAdminRequest, res) => {
    try {
      const { reason, refundAmount, refundReason } = req.body;
      const subscription = await storage.getSubscription(req.params.id);

      if (!subscription) {
        res.status(404).json({ message: "Subscription not found" });
        return;
      }

      // Update subscription status to cancelled
      const updated = await storage.updateSubscription(req.params.id, { 
        status: "cancelled",
        pauseStartDate: null,
        pauseResumeDate: null,
      });

      // Process refund if applicable
      if (refundAmount && refundAmount > 0) {
        // Add to user's wallet
        await storage.createWalletTransaction({
          userId: subscription.userId,
          amount: refundAmount,
          type: "credit",
          description: refundReason || `Subscription cancellation refund - ${reason || 'No reason provided'}`,
          referenceId: subscription.id,
          referenceType: "subscription_refund",
        });

        console.log(`💰 Refund of ${refundAmount} processed for subscription ${req.params.id}`);
      }

      console.log(`❌ Admin cancelled subscription ${req.params.id}: ${reason || 'No reason provided'}`);
      res.json({ message: "Subscription cancelled successfully", subscription: updated, refundProcessed: !!refundAmount });
    } catch (error) {
      console.error("Error cancelling subscription:", error);
      res.status(500).json({ message: "Failed to cancel subscription" });
    }
  });

  // Update remaining delivery count
  app.put("/api/admin/subscriptions/:id/update-count", requireAdmin(), async (req: AuthenticatedAdminRequest, res) => {
    try {
      const { deliveriesRemaining, reason } = req.body;

      // Strict validation: must be non-negative integer with reasonable upper bound
      if (typeof deliveriesRemaining !== 'number' || !Number.isInteger(deliveriesRemaining) || deliveriesRemaining < 0) {
        res.status(400).json({ message: "Deliveries remaining must be a non-negative integer" });
        return;
      }

      if (deliveriesRemaining > 1000) {
        res.status(400).json({ message: "Deliveries remaining cannot exceed 1000" });
        return;
      }

      const subscription = await storage.getSubscription(req.params.id);
      if (!subscription) {
        res.status(404).json({ message: "Subscription not found" });
        return;
      }

      const previousCount = subscription.remainingDeliveries;
      const updated = await storage.updateSubscription(req.params.id, { 
        remainingDeliveries: deliveriesRemaining,
      });

      console.log(`📊 Admin updated subscription ${req.params.id} delivery count: ${previousCount} -> ${deliveriesRemaining} (${reason || 'No reason'})`);
      res.json({ 
        message: "Delivery count updated successfully", 
        subscription: updated,
        previousCount,
        newCount: deliveriesRemaining
      });
    } catch (error) {
      console.error("Error updating delivery count:", error);
      res.status(500).json({ message: "Failed to update delivery count" });
    }
  });

  // Change delivery time slot
  app.put("/api/admin/subscriptions/:id/change-slot", requireAdmin(), async (req: AuthenticatedAdminRequest, res) => {
    try {
      const { deliverySlotId, deliveryTime, reason } = req.body;

      // Require at least one of deliverySlotId or deliveryTime
      if (!deliverySlotId && !deliveryTime) {
        res.status(400).json({ message: "Either deliverySlotId or deliveryTime is required" });
        return;
      }

      const subscription = await storage.getSubscription(req.params.id);
      if (!subscription) {
        res.status(404).json({ message: "Subscription not found" });
        return;
      }

      // Validate the delivery slot exists and is active if provided
      let validatedSlotTime = deliveryTime;
      if (deliverySlotId) {
        const slot = await storage.getDeliveryTimeSlotById(deliverySlotId);
        if (!slot) {
          res.status(400).json({ message: "Invalid delivery slot ID" });
          return;
        }
        if (!slot.isActive) {
          res.status(400).json({ message: "Selected delivery slot is not active" });
          return;
        }
        // Use the slot's start time if deliveryTime wasn't provided
        validatedSlotTime = deliveryTime || slot.startTime;
      }

      // Validate time format if provided (HH:mm)
      if (validatedSlotTime && !/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(validatedSlotTime)) {
        res.status(400).json({ message: "Invalid delivery time format (use HH:mm)" });
        return;
      }

      const previousSlot = subscription.deliverySlotId;
      const previousTime = subscription.nextDeliveryTime;

      const updated = await storage.updateSubscription(req.params.id, { 
        deliverySlotId: deliverySlotId || subscription.deliverySlotId,
        nextDeliveryTime: validatedSlotTime || subscription.nextDeliveryTime,
      });

      console.log(`🕐 Admin changed subscription ${req.params.id} delivery slot: ${previousSlot} -> ${deliverySlotId || 'unchanged'} (${reason || 'No reason'})`);
      res.json({ 
        message: "Delivery slot changed successfully", 
        subscription: updated,
        previousSlot,
        newSlot: deliverySlotId || previousSlot
      });
    } catch (error) {
      console.error("Error changing delivery slot:", error);
      res.status(500).json({ message: "Failed to change delivery slot" });
    }
  });

  // Mark subscription as expired
  app.put("/api/admin/subscriptions/:id/expire", requireAdmin(), async (req: AuthenticatedAdminRequest, res) => {
    try {
      const { reason } = req.body;

      const subscription = await storage.getSubscription(req.params.id);
      if (!subscription) {
        res.status(404).json({ message: "Subscription not found" });
        return;
      }

      const updated = await storage.updateSubscription(req.params.id, { 
        status: "expired",
        remainingDeliveries: 0,
        pauseStartDate: null,
        pauseResumeDate: null,
      });

      console.log(`⏰ Admin expired subscription ${req.params.id}: ${reason || 'No reason provided'}`);
      res.json({ message: "Subscription marked as expired", subscription: updated });
    } catch (error) {
      console.error("Error expiring subscription:", error);
      res.status(500).json({ message: "Failed to expire subscription" });
    }
  });

  // Extend subscription (add more days/deliveries)
  app.put("/api/admin/subscriptions/:id/extend", requireAdmin(), async (req: AuthenticatedAdminRequest, res) => {
    try {
      const { additionalDays, additionalDeliveries, reason } = req.body;

      if (!additionalDays && !additionalDeliveries) {
        res.status(400).json({ message: "Either additionalDays or additionalDeliveries is required" });
        return;
      }

      // Validate additionalDays if provided
      if (additionalDays !== undefined && additionalDays !== null) {
        if (typeof additionalDays !== 'number' || !Number.isInteger(additionalDays) || additionalDays < 1) {
          res.status(400).json({ message: "additionalDays must be a positive integer" });
          return;
        }
        if (additionalDays > 365) {
          res.status(400).json({ message: "additionalDays cannot exceed 365" });
          return;
        }
      }

      // Validate additionalDeliveries if provided
      if (additionalDeliveries !== undefined && additionalDeliveries !== null) {
        if (typeof additionalDeliveries !== 'number' || !Number.isInteger(additionalDeliveries) || additionalDeliveries < 1) {
          res.status(400).json({ message: "additionalDeliveries must be a positive integer" });
          return;
        }
        if (additionalDeliveries > 500) {
          res.status(400).json({ message: "additionalDeliveries cannot exceed 500" });
          return;
        }
      }

      const subscription = await storage.getSubscription(req.params.id);
      if (!subscription) {
        res.status(404).json({ message: "Subscription not found" });
        return;
      }

      const updateData: any = {};

      if (additionalDays && typeof additionalDays === 'number' && additionalDays > 0) {
        const currentEndDate = subscription.endDate ? new Date(subscription.endDate) : new Date();
        currentEndDate.setDate(currentEndDate.getDate() + additionalDays);
        updateData.endDate = currentEndDate;
      }

      if (additionalDeliveries && typeof additionalDeliveries === 'number' && additionalDeliveries > 0) {
        updateData.remainingDeliveries = (subscription.remainingDeliveries || 0) + additionalDeliveries;
        updateData.totalDeliveries = (subscription.totalDeliveries || 0) + additionalDeliveries;
      }

      // If subscription was expired or cancelled, reactivate it
      if (subscription.status === "expired" || subscription.status === "cancelled") {
        updateData.status = "active";
      }

      const updated = await storage.updateSubscription(req.params.id, updateData);

      console.log(`📈 Admin extended subscription ${req.params.id}: +${additionalDays || 0} days, +${additionalDeliveries || 0} deliveries (${reason || 'No reason'})`);
      res.json({ 
        message: "Subscription extended successfully", 
        subscription: updated,
        extended: {
          additionalDays: additionalDays || 0,
          additionalDeliveries: additionalDeliveries || 0
        }
      });
    } catch (error) {
      console.error("Error extending subscription:", error);
      res.status(500).json({ message: "Failed to extend subscription" });
    }
  });

  // Delete subscription
  app.delete("/api/admin/subscriptions/:id", requireSuperAdmin(), async (req: AuthenticatedAdminRequest, res) => {
    try {
      const { id } = req.params;

      const subscription = await storage.getSubscription(id);
      if (!subscription) {
        res.status(404).json({ message: "Subscription not found" });
        return;
      }

      // Delete all delivery logs for this subscription first
      const logs = await storage.getSubscriptionDeliveryLogs(id);
      for (const log of logs) {
        await storage.deleteSubscriptionDeliveryLog(log.id);
      }

      // Delete the subscription
      await storage.deleteSubscription(id);

      console.log(`🗑️ Admin deleted subscription ${id} for ${subscription.customerName}`);
      res.json({ message: "Subscription deleted successfully" });
    } catch (error) {
      console.error("Error deleting subscription:", error);
      res.status(500).json({ message: "Failed to delete subscription" });
    }
  });

  // Renew subscription (create new subscription based on existing one)
  app.post("/api/admin/subscriptions/:id/renew", requireAdmin(), async (req: AuthenticatedAdminRequest, res) => {
    try {
      const { startDate, customPrice, paymentStatus } = req.body;

      // Validate customPrice if provided
      if (customPrice !== undefined && customPrice !== null) {
        if (typeof customPrice !== 'number' || customPrice < 0) {
          res.status(400).json({ message: "customPrice must be a non-negative number" });
          return;
        }
        if (customPrice > 100000) {
          res.status(400).json({ message: "customPrice cannot exceed 100000" });
          return;
        }
      }

      // Validate startDate if provided
      if (startDate) {
        const parsedDate = new Date(startDate);
        if (isNaN(parsedDate.getTime())) {
          res.status(400).json({ message: "Invalid startDate format" });
          return;
        }
      }

      // Validate paymentStatus if provided
      const validStatuses = ["pending", "confirmed", "paid"];
      if (paymentStatus && !validStatuses.includes(paymentStatus)) {
        res.status(400).json({ message: `paymentStatus must be one of: ${validStatuses.join(", ")}` });
        return;
      }

      const subscription = await storage.getSubscription(req.params.id);
      if (!subscription) {
        res.status(404).json({ message: "Subscription not found" });
        return;
      }

      // Get the plan to determine duration and deliveries
      const plan = await storage.getSubscriptionPlan(subscription.planId);
      if (!plan) {
        res.status(404).json({ message: "Subscription plan not found" });
        return;
      }

      const newStartDate = startDate ? new Date(startDate) : new Date();

      // Calculate duration based on frequency and original subscription settings
      const deliveryDays = plan.deliveryDays as string[] || [];
      const deliveriesPerWeek = deliveryDays.length || 1;

      // Use original subscription's total deliveries (nullish coalescing to preserve 0), fallback to 30 only if null/undefined
      const totalDeliveries = subscription.totalDeliveries ?? 30;

      // Calculate duration based on deliveries and frequency
      let durationDays = 30; // default
      if (plan.frequency === "daily") {
        durationDays = totalDeliveries;
      } else if (plan.frequency === "weekly") {
        durationDays = Math.ceil(totalDeliveries / deliveriesPerWeek) * 7;
      } else if (plan.frequency === "monthly") {
        durationDays = totalDeliveries * 30;
      }

      const newEndDate = new Date(newStartDate);
      newEndDate.setDate(newEndDate.getDate() + durationDays);

      // Create a new subscription based on the existing one
      const newSubscription = await storage.createSubscription({
        userId: subscription.userId,
        planId: subscription.planId,
        customerName: subscription.customerName,
        phone: subscription.phone,
        email: subscription.email,
        status: paymentStatus === "confirmed" ? "active" : "pending",
        startDate: newStartDate,
        endDate: newEndDate,
        nextDeliveryDate: newStartDate,
        nextDeliveryTime: subscription.nextDeliveryTime || "09:00",
        totalDeliveries: totalDeliveries,
        remainingDeliveries: totalDeliveries,
        deliverySlotId: subscription.deliverySlotId,
        address: subscription.address,
        chefId: subscription.chefId,
        chefAssignedAt: subscription.chefAssignedAt,
        originalPrice: customPrice || plan.price,
        finalAmount: customPrice || plan.price,
        isPaid: false,
        couponCode: null,
        walletAmountUsed: 0,
        discountAmount: 0,
        couponDiscount: 0,
        paymentNotes: null,
        paymentTransactionId: null,
        customItems: null,
        lastDeliveryDate: null,
        deliveryHistory: [],
        pauseStartDate: null,
        pauseResumeDate: null,
      });

      console.log(`🔄 Admin renewed subscription ${req.params.id} -> ${newSubscription.id}`);
      res.json({ 
        message: "Subscription renewed successfully", 
        newSubscription,
        previousSubscriptionId: req.params.id
      });
    } catch (error) {
      console.error("Error renewing subscription:", error);
      res.status(500).json({ message: "Failed to renew subscription" });
    }
  });

  // Reports
  app.get("/api/admin/reports/sales", requireAdmin(), async (req, res) => {
    try {
      const { from, to } = req.query;
      const report = await storage.getSalesReport(
        from ? new Date(from as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        to ? new Date(to as string) : new Date()
      );
      res.json(report);
    } catch (error) {
      console.error("Get sales report error:", error);
      res.status(500).json({ message: "Failed to fetch sales report" });
    }
  });

  app.get("/api/admin/reports/users", requireAdmin(), async (req, res) => {
    try {
      const { from, to } = req.query;
      const report = await storage.getUserReport(
        from ? new Date(from as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        to ? new Date(to as string) : new Date()
      );
      res.json(report);
    } catch (error) {
      console.error("Get user report error:", error);
      res.status(500).json({ message: "Failed to fetch user report" });
    }
  });

  app.get("/api/admin/reports/inventory", requireAdmin(), async (req, res) => {
    try {
      const report = await storage.getInventoryReport();
      res.json(report);
    } catch (error) {
      console.error("Get inventory report error:", error);
      res.status(500).json({ message: "Failed to fetch inventory report" });
    }
  });

  app.get("/api/admin/reports/subscriptions", requireAdmin(), async (req, res) => {
    try {
      const { from, to } = req.query;
      const report = await storage.getSubscriptionReport(
        from ? new Date(from as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        to ? new Date(to as string) : new Date()
      );
      res.json(report);
    } catch (error) {
      console.error("Get subscription report error:", error);
      res.status(500).json({ message: "Failed to fetch subscription report" });
    }
  });

  // Delivery Settings
  app.get("/api/admin/delivery-settings", requireAdmin(), async (req, res) => {
    try {
      const settings = await storage.getDeliverySettings();
      res.json(settings);
    } catch (error) {
      console.error("Get delivery settings error:", error);
      res.status(500).json({ message: "Failed to fetch delivery settings" });
    }
  });

  app.post("/api/admin/delivery-settings", requireAdminOrManager(), async (req, res) => {
    try {
      const setting = await storage.createDeliverySetting(req.body);
      res.status(201).json(setting);
    } catch (error) {
      console.error("Create delivery setting error:", error);
      res.status(500).json({ message: "Failed to create delivery setting" });
    }
  });

  app.patch("/api/admin/delivery-settings/:id", requireAdminOrManager(), async (req, res) => {
    try {
      const { id } = req.params;
      const setting = await storage.updateDeliverySetting(id, req.body);

      if (!setting) {
        res.status(404).json({ message: "Delivery setting not found" });
        return;
      }

      res.json(setting);
    } catch (error) {
      console.error("Update delivery setting error:", error);
      res.status(500).json({ message: "Failed to update delivery setting" });
    }
  });

  app.delete("/api/admin/delivery-settings/:id", requireSuperAdmin(), async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteDeliverySetting(id);
      res.json({ message: "Delivery setting deleted successfully" });
    } catch (error) {
      console.error("Delete delivery setting error:", error);
      res.status(500).json({ message: "Failed to delete delivery setting" });
    }
  });

  // Wallet Settings
  app.get("/api/admin/wallet-settings", requireAdmin(), async (req, res) => {
    try {
      const settings = await db.query.walletSettings.findFirst({
        where: (ws, { eq }) => eq(ws.isActive, true)
      });
      res.json(settings || { maxUsagePerOrder: 10, referrerBonus: 100, referredBonus: 50 });
    } catch (error) {
      console.error("Get wallet settings error:", error);
      res.status(500).json({ message: "Failed to fetch wallet settings" });
    }
  });

  app.post("/api/admin/wallet-settings", requireAdminOrManager(), async (req, res) => {
    try {
      const { maxUsagePerOrder, referrerBonus, referredBonus } = req.body;

      // Deactivate old settings
      await db.update(walletSettings).set({ isActive: false });

      // Create new settings
      const [newSettings] = await db.insert(walletSettings).values({
        maxUsagePerOrder,
        referrerBonus,
        referredBonus,
        isActive: true,
      }).returning();

      res.json(newSettings);
    } catch (error) {
      console.error("Update wallet settings error:", error);
      res.status(500).json({ message: "Failed to update wallet settings" });
    }
  });

  // Admin Cart Settings Management
  app.get("/api/admin/cart-settings", requireAdmin(), async (req, res) => {
    try {
      const settings = await storage.getCartSettings();
      res.json(settings);
    } catch (error: any) {
      console.error("Error fetching cart settings:", error);
      res.status(500).json({ message: error.message || "Failed to fetch cart settings" });
    }
  });

  app.post("/api/admin/cart-settings", requireAdminOrManager(), async (req, res) => {
    try {
      const { categoryId, minOrderAmount } = req.body;

      if (!categoryId || minOrderAmount === undefined) {
        res.status(400).json({ message: "Category ID and minimum order amount are required" });
        return;
      }

      const setting = await storage.createCartSetting({
        categoryId,
        minOrderAmount,
        categoryName: '', // Will be fetched in storage.createCartSetting
        isActive: true
      });
      res.status(201).json(setting);
    } catch (error: any) {
      console.error("Error creating cart setting:", error);
      res.status(500).json({ message: error.message || "Failed to create cart setting" });
    }
  });

  app.patch("/api/admin/cart-settings/:id", requireAdminOrManager(), async (req, res) => {
    try {
      const { id } = req.params;
      const setting = await storage.updateCartSetting(id, req.body);

      if (!setting) {
        res.status(404).json({ message: "Cart setting not found" });
        return;
      }

      res.json(setting);
    } catch (error: any) {
      console.error("Error updating cart setting:", error);
      res.status(500).json({ message: error.message || "Failed to update cart setting" });
    }
  });

  app.delete("/api/admin/cart-settings/:id", requireAdminOrManager(), async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteCartSetting(id);
      res.json({ message: "Cart setting deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting cart setting:", error);
      res.status(500).json({ message: error.message || "Failed to delete cart setting" });
    }
  });

  // ================= SUBSCRIPTION DELIVERY LOGS MANAGEMENT =================

  // Get all delivery logs with optional date filter
  app.get("/api/admin/delivery-logs", requireAdmin(), async (req: AuthenticatedAdminRequest, res) => {
    try {
      const { date, subscriptionId } = req.query;

      if (date) {
        const logs = await storage.getSubscriptionDeliveryLogsByDate(new Date(date as string));
        res.json(logs);
      } else if (subscriptionId) {
        const logs = await storage.getSubscriptionDeliveryLogs(subscriptionId as string);
        res.json(logs);
      } else {
        // Get today's logs by default
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const logs = await storage.getSubscriptionDeliveryLogsByDate(today);
        res.json(logs);
      }
    } catch (error) {
      console.error("Get delivery logs error:", error);
      res.status(500).json({ message: "Failed to fetch delivery logs" });
    }
  });

  // Get a specific delivery log
  app.get("/api/admin/delivery-logs/:id", requireAdmin(), async (req: AuthenticatedAdminRequest, res) => {
    try {
      const { id } = req.params;
      const log = await storage.getSubscriptionDeliveryLog(id);

      if (!log) {
        res.status(404).json({ message: "Delivery log not found" });
        return;
      }

      res.json(log);
    } catch (error) {
      console.error("Get delivery log error:", error);
      res.status(500).json({ message: "Failed to fetch delivery log" });
    }
  });

  // Update delivery log status
  app.put("/api/admin/delivery-logs/:id/status", requireAdminOrManager(), async (req: AuthenticatedAdminRequest, res) => {
    try {
      const { id } = req.params;
      const { status, notes } = req.body;

      const validStatuses = ["scheduled", "preparing", "out_for_delivery", "delivered", "missed"];
      if (!status || !validStatuses.includes(status)) {
        res.status(400).json({ message: "Valid status is required (scheduled, preparing, out_for_delivery, delivered, missed)" });
        return;
      }

      const existingLog = await storage.getSubscriptionDeliveryLog(id);
      if (!existingLog) {
        res.status(404).json({ message: "Delivery log not found" });
        return;
      }

      const updatedLog = await storage.updateSubscriptionDeliveryLog(id, { 
        status,
        notes: notes || existingLog.notes
      });

      res.json(updatedLog);
    } catch (error) {
      console.error("Update delivery log status error:", error);
      res.status(500).json({ message: "Failed to update delivery log status" });
    }
  });

  // Assign delivery partner to a delivery log
  app.put("/api/admin/delivery-logs/:id/assign-delivery-partner", requireAdminOrManager(), async (req: AuthenticatedAdminRequest, res) => {
    try {
      const { id } = req.params;
      const { deliveryPersonId } = req.body;

      const existingLog = await storage.getSubscriptionDeliveryLog(id);
      if (!existingLog) {
        res.status(404).json({ message: "Delivery log not found" });
        return;
      }

      // Verify delivery person exists if provided
      if (deliveryPersonId) {
        const deliveryPerson = await storage.getDeliveryPersonnel(deliveryPersonId);
        if (!deliveryPerson) {
          res.status(404).json({ message: "Delivery person not found" });
          return;
        }
      }

      const updatedLog = await storage.updateSubscriptionDeliveryLog(id, { 
        deliveryPersonId: deliveryPersonId || null
      });

      res.json(updatedLog);
    } catch (error) {
      console.error("Assign delivery partner error:", error);
      res.status(500).json({ message: "Failed to assign delivery partner" });
    }
  });

  // Mark delivery as delivered (shortcut endpoint)
  app.post("/api/admin/delivery-logs/:id/mark-delivered", requireAdminOrManager(), async (req: AuthenticatedAdminRequest, res) => {
    try {
      const { id } = req.params;
      const { notes } = req.body;

      const existingLog = await storage.getSubscriptionDeliveryLog(id);
      if (!existingLog) {
        res.status(404).json({ message: "Delivery log not found" });
        return;
      }

      const updatedLog = await storage.updateSubscriptionDeliveryLog(id, { 
        status: "delivered",
        notes: notes || existingLog.notes
      });

      res.json(updatedLog);
    } catch (error) {
      console.error("Mark delivered error:", error);
      res.status(500).json({ message: "Failed to mark as delivered" });
    }
  });

  // Mark delivery as missed (shortcut endpoint)
  app.post("/api/admin/delivery-logs/:id/mark-missed", requireAdminOrManager(), async (req: AuthenticatedAdminRequest, res) => {
    try {
      const { id } = req.params;
      const { notes } = req.body;

      const existingLog = await storage.getSubscriptionDeliveryLog(id);
      if (!existingLog) {
        res.status(404).json({ message: "Delivery log not found" });
        return;
      }

      const updatedLog = await storage.updateSubscriptionDeliveryLog(id, { 
        status: "missed",
        notes: notes || existingLog.notes
      });

      res.json(updatedLog);
    } catch (error) {
      console.error("Mark missed error:", error);
      res.status(500).json({ message: "Failed to mark as missed" });
    }
  });

  // Delete a delivery log
  app.delete("/api/admin/delivery-logs/:id", requireSuperAdmin(), async (req: AuthenticatedAdminRequest, res) => {
    try {
      const { id } = req.params;

      const existingLog = await storage.getSubscriptionDeliveryLog(id);
      if (!existingLog) {
        res.status(404).json({ message: "Delivery log not found" });
        return;
      }

      await storage.deleteSubscriptionDeliveryLog(id);
      res.json({ message: "Delivery log deleted successfully" });
    } catch (error) {
      console.error("Delete delivery log error:", error);
      res.status(500).json({ message: "Failed to delete delivery log" });
    }
  });

  // ================= REFERRAL REWARDS SETTINGS =================

  // Get all referral reward settings
  app.get("/api/admin/referral-rewards", requireAdmin(), async (req: AuthenticatedAdminRequest, res) => {
    try {
      const rewards = await storage.getAllReferralRewards();
      res.json(rewards);
    } catch (error) {
      console.error("Error fetching referral rewards:", error);
      res.status(500).json({ message: "Failed to fetch referral rewards" });
    }
  });

  // Create referral reward setting
  app.post("/api/admin/referral-rewards", requireAdmin(), async (req: AuthenticatedAdminRequest, res) => {
    try {
      const validation = insertReferralRewardSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({ message: fromZodError(validation.error).toString() });
        return;
      }
      const reward = await storage.createReferralReward(validation.data);
      res.status(201).json(reward);
    } catch (error) {
      console.error("Error creating referral reward:", error);
      res.status(500).json({ message: "Failed to create referral reward" });
    }
  });

  // Update referral reward setting
  app.patch("/api/admin/referral-rewards/:id", requireAdmin(), async (req: AuthenticatedAdminRequest, res) => {
    try {
      const { id } = req.params;
      const validation = insertReferralRewardSchema.partial().safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({ message: fromZodError(validation.error).toString() });
        return;
      }
      const reward = await storage.updateReferralReward(id, validation.data);
      if (!reward) {
        res.status(404).json({ message: "Referral reward not found" });
        return;
      }
      res.json(reward);
    } catch (error) {
      console.error("Error updating referral reward:", error);
      res.status(500).json({ message: "Failed to update referral reward" });
    }
  });

  // Delete referral reward setting
  app.delete("/api/admin/referral-rewards/:id", requireSuperAdmin(), async (req: AuthenticatedAdminRequest, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteReferralReward(id);
      if (!deleted) {
        res.status(404).json({ message: "Referral reward not found" });
        return;
      }
      res.json({ message: "Referral reward deleted successfully" });
    } catch (error) {
      console.error("Error deleting referral reward:", error);
      res.status(500).json({ message: "Failed to delete referral reward" });
    }
  });

  // ================= COUPON MANAGEMENT =================

  // Get all coupons
  app.get("/api/admin/coupons", requireAdmin(), async (req: AuthenticatedAdminRequest, res) => {
    try {
      const coupons = await storage.getAllCoupons();
      res.json(coupons);
    } catch (error) {
      console.error("Error fetching coupons:", error);
      res.status(500).json({ message: "Failed to fetch coupons" });
    }
  });

  // Create coupon
  app.post("/api/admin/coupons", requireAdmin(), async (req: AuthenticatedAdminRequest, res) => {
    try {
      // Prepare data with defaults
      const couponData = {
        ...req.body,
        code: req.body.code?.toUpperCase(),
        validFrom: req.body.validFrom || new Date().toISOString(),
        validUntil: req.body.validUntil || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        perUserLimit: req.body.perUserLimit || 1,
      };

      const validation = insertCouponSchema.safeParse(couponData);
      if (!validation.success) {
        res.status(400).json({ message: fromZodError(validation.error).toString() });
        return;
      }

      const coupon = await storage.createCoupon(validation.data);
      res.status(201).json(coupon);
    } catch (error) {
      console.error("Error creating coupon:", error);
      res.status(500).json({ message: "Failed to create coupon" });
    }
  });

  // Update coupon
  app.patch("/api/admin/coupons/:id", requireAdmin(), async (req: AuthenticatedAdminRequest, res) => {
    try {
      const { id } = req.params;
      const validation = insertCouponSchema.partial().safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({ message: fromZodError(validation.error).toString() });
        return;
      }
      await storage.updateCoupon(id, validation.data);
      res.json({ message: "Coupon updated successfully" });
    } catch (error) {
      console.error("Error updating coupon:", error);
      res.status(500).json({ message: "Failed to update coupon" });
    }
  });

  // Delete coupon
  app.delete("/api/admin/coupons/:id", requireSuperAdmin(), async (req: AuthenticatedAdminRequest, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteCoupon(id);
      if (!deleted) {
        res.status(404).json({ message: "Coupon not found" });
        return;
      }
      res.json({ message: "Coupon deleted successfully" });
    } catch (error) {
      console.error("Error deleting coupon:", error);
      res.status(500).json({ message: "Failed to delete coupon" });
    }
  });

  // ================= REFERRAL MANAGEMENT =================

  // Get all referrals with user details
  app.get("/api/admin/referrals", requireAdmin(), async (req: AuthenticatedAdminRequest, res) => {
    try {
      const referrals = await storage.getAllReferrals();

      // Enrich referrals with user details
      const enrichedReferrals = await Promise.all(
        referrals.map(async (referral) => {
          const referrer = await storage.getUser(referral.referrerId);
          const referred = await storage.getUser(referral.referredId);
          return {
            ...referral,
            referrerName: referrer?.name || "Unknown",
            referrerPhone: referrer?.phone || "-",
            referredName: referred?.name || "Unknown",
            referredPhone: referred?.phone || "-",
          };
        })
      );

      res.json(enrichedReferrals);
    } catch (error) {
      console.error("Error fetching referrals:", error);
      res.status(500).json({ message: "Failed to fetch referrals" });
    }
  });

  // Get referral stats
  app.get("/api/admin/referral-stats", requireAdmin(), async (req: AuthenticatedAdminRequest, res) => {
    try {
      const referrals = await storage.getAllReferrals();

      const totalReferrals = referrals.length;
      const pendingReferrals = referrals.filter(r => r.status === "pending").length;
      const completedReferrals = referrals.filter(r => r.status === "completed").length;
      const totalBonusPaid = referrals
        .filter(r => r.status === "completed")
        .reduce((sum, r) => sum + r.referrerBonus + r.referredBonus, 0);

      res.json({
        totalReferrals,
        pendingReferrals,
        completedReferrals,
        totalBonusPaid,
      });
    } catch (error) {
      console.error("Error fetching referral stats:", error);
      res.status(500).json({ message: "Failed to fetch referral stats" });
    }
  });

  // Update referral status
  app.patch("/api/admin/referrals/:id/status", requireAdmin(), async (req: AuthenticatedAdminRequest, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!["pending", "completed", "expired"].includes(status)) {
        res.status(400).json({ message: "Invalid status" });
        return;
      }

      const referral = await storage.getReferralById(id);
      if (!referral) {
        res.status(404).json({ message: "Referral not found" });
        return;
      }

      if (status === "completed" && referral.status !== "completed") {
        // Credit bonuses to both users
        const settings = await storage.getActiveReferralReward();
        const referrerBonus = settings?.referrerBonus || 50;
        const referredBonus = settings?.referredBonus || 50;

        // Credit referrer
        const referrer = await storage.getUser(referral.referrerId);
        if (referrer) {
          await storage.updateUser(referral.referrerId, {
            walletBalance: referrer.walletBalance + referrerBonus,
          });
          await storage.createWalletTransaction({
            userId: referral.referrerId,
            amount: referrerBonus,
            type: "referral_bonus",
            description: `Referral bonus for successful referral`,
            referenceId: id,
            referenceType: "referral",
          });
        }

        await storage.updateReferralStatus(id, "completed", referrerBonus, referredBonus);
      } else {
        await storage.updateReferralStatus(id, status, 0, 0);
      }

      res.json({ message: "Referral status updated successfully" });
    } catch (error) {
      console.error("Error updating referral status:", error);
      res.status(500).json({ message: "Failed to update referral status" });
    }
  });

  // ================= WALLET TRANSACTION LOGS =================

  // Get all wallet transactions
  app.get("/api/admin/wallet-transactions", requireAdmin(), async (req: AuthenticatedAdminRequest, res) => {
    try {
      const { date } = req.query;
      const transactions = await storage.getAllWalletTransactions(date as string | undefined);

      // Enrich transactions with user details
      const enrichedTransactions = await Promise.all(
        transactions.map(async (tx) => {
          const user = await storage.getUser(tx.userId);
          return {
            ...tx,
            userName: user?.name || "Unknown",
            userPhone: user?.phone || "-",
          };
        })
      );

      res.json(enrichedTransactions);
    } catch (error) {
      console.error("Error fetching wallet transactions:", error);
      res.status(500).json({ message: "Failed to fetch wallet transactions" });
    }
  });

  // Get wallet transaction stats
  app.get("/api/admin/wallet-stats", requireAdmin(), async (req: AuthenticatedAdminRequest, res) => {
    try {
      const transactions = await storage.getAllWalletTransactions();

      let totalCredits = 0;
      let totalDebits = 0;
      let totalReferralBonus = 0;
      let totalOrderDiscounts = 0;

      for (const tx of transactions) {
        if (tx.type === "credit") {
          totalCredits += Math.abs(tx.amount);
        } else if (tx.type === "debit") {
          totalDebits += Math.abs(tx.amount);
        } else if (tx.type === "referral_bonus") {
          totalReferralBonus += Math.abs(tx.amount);
        } else if (tx.type === "order_discount") {
          totalOrderDiscounts += Math.abs(tx.amount);
        }
      }

      res.json({
        totalCredits,
        totalDebits,
        totalReferralBonus,
        totalOrderDiscounts,
      });
    } catch (error) {
      console.error("Error fetching wallet stats:", error);
      res.status(500).json({ message: "Failed to fetch wallet stats" });
    }
  });
}