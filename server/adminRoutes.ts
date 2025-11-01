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
import { adminLoginSchema, insertAdminUserSchema, insertCategorySchema, insertProductSchema } from "@shared/schema";
import { fromZodError } from "zod-validation-error";

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
    try {
      const validation = adminLoginSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({ message: fromZodError(validation.error).toString() });
        return;
      }

      const { username, password } = validation.data;
      const admin = await storage.getAdminByUsername(username);

      if (!admin) {
        res.status(401).json({ message: "Invalid credentials" });
        return;
      }

      const isPasswordValid = await verifyPassword(password, admin.passwordHash);
      if (!isPasswordValid) {
        res.status(401).json({ message: "Invalid credentials" });
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
      console.error("Admin login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.post("/api/admin/auth/logout", (req, res) => {
    res.clearCookie("refreshToken");
    res.json({ message: "Logged out successfully" });
  });

  app.post("/api/admin/auth/refresh", async (req, res) => {
    try {
      const refreshToken = req.cookies.refreshToken;

      if (!refreshToken) {
        res.status(401).json({ message: "No refresh token" });
        return;
      }

      const payload = verifyToken(refreshToken);
      if (!payload) {
        res.status(401).json({ message: "Invalid refresh token" });
        return;
      }

      const admin = await storage.getAdminById(payload.adminId);
      if (!admin) {
        res.status(401).json({ message: "Admin not found" });
        return;
      }

      const newAccessToken = generateAccessToken(admin);
      const newRefreshToken = generateRefreshToken(admin);

      res.cookie("refreshToken", newRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.json({
        accessToken: newAccessToken,
        admin: {
          id: admin.id,
          username: admin.username,
          email: admin.email,
          role: admin.role,
        },
      });
    } catch (error) {
      console.error("Token refresh error:", error);
      res.status(401).json({ message: "Token refresh failed" });
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

      res.json(order);
    } catch (error) {
      console.error("Update order status error:", error);
      res.status(500).json({ message: "Failed to update order status" });
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
}
