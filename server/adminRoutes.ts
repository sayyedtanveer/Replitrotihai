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
import { adminLoginSchema, insertAdminUserSchema, insertCategorySchema, insertProductSchema, insertDeliveryPersonnelSchema } from "@shared/schema";
import { fromZodError } from "zod-validation-error";
import { broadcastOrderUpdate, broadcastNewOrder, notifyDeliveryAssignment } from "./websocket";
import { hashPassword as hashDeliveryPassword } from "./deliveryAuth";

export function registerAdminRoutes(app: Express) {
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

  app.patch("/api/admin/orders/:id/payment", requireAdmin(), async (req, res) => {
    try {
      const { paymentStatus } = req.body;
      const order = await storage.getOrderById(req.params.id);

      if (!order) {
        res.status(404).json({ message: "Order not found" });
        return;
      }

      // Update payment status
      let updatedOrder = await storage.updateOrderPaymentStatus(
        req.params.id, 
        paymentStatus as "pending" | "paid" | "confirmed"
      );

      if (!updatedOrder) {
        res.status(404).json({ message: "Order not found" });
        return;
      }

      // When admin confirms payment, also update order status to confirmed
      if (paymentStatus === "confirmed" && order.status === "pending") {
        updatedOrder = await storage.updateOrderStatus(req.params.id, "confirmed") || updatedOrder;
      }

      // Log payment confirmation
      console.log(`
╔════════════════════════════════════════════════════════════════
║ 💰 PAYMENT CONFIRMED BY ADMIN
╠════════════════════════════════════════════════════════════════
║ Order ID: ${updatedOrder.id.slice(0, 8)}
║ Customer: ${updatedOrder.customerName}
║ Amount: ₹${updatedOrder.total}
║ Status: Order sent to chef for preparation
║ Time: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
╠════════════════════════════════════════════════════════════════
║ 📱 Notification sent to chef
╚════════════════════════════════════════════════════════════════
      `);

      broadcastOrderUpdate(updatedOrder);

      res.json(updatedOrder);
    } catch (error) {
      console.error("Error updating payment status:", error);
      res.status(500).json({ message: "Failed to update payment status" });
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

      if (!deliveryPersonId) {
        res.status(400).json({ message: "Delivery person ID is required" });
        return;
      }

      const deliveryPerson = await storage.getDeliveryPersonnelById(deliveryPersonId);
      if (!deliveryPerson) {
        res.status(404).json({ message: "Delivery person not found" });
        return;
      }

      // First assign the delivery person
      let order = await storage.assignOrderToDeliveryPerson(id, deliveryPersonId);
      if (!order) {
        res.status(404).json({ message: "Order not found" });
        return;
      }

      // Update status to 'assigned' if order is confirmed
      if (order.status === "confirmed") {
        order = await storage.updateOrderStatus(id, "assigned") || order;
      }

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
      res.json(chefs);
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

      res.json(chef);
    } catch (error) {
      console.error("Update chef error:", error);
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

      const passwordHash = await hashPassword(password);
      const partner = await storage.createPartner({
        chefId,
        username: normalizedUsername,
        email: email.trim().toLowerCase(),
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

  app.delete("/api/admin/subscription-plans/:id", requireSuperAdmin(), async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteSubscriptionPlan(id);
      res.json({ message: "Subscription plan deleted successfully" });
    } catch (error) {
      console.error("Delete subscription plan error:", error);
      res.status(500).json({ message: "Failed to delete subscription plan" });
    }
  });

  // Active Subscriptions
  app.get("/api/admin/subscriptions", requireAdmin(), async (req, res) => {
    try {
      const subscriptions = await storage.getSubscriptions();
      res.json(subscriptions);
    } catch (error) {
      console.error("Get subscriptions error:", error);
      res.status(500).json({ message: "Failed to fetch subscriptions" });
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
}