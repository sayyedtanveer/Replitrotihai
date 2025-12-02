import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertOrderSchema, userLoginSchema, insertUserSchema } from "@shared/schema";
import { registerAdminRoutes } from "./adminRoutes";
import { registerPartnerRoutes } from "./partnerRoutes";
import { registerDeliveryRoutes } from "./deliveryRoutes";
import { setupWebSocket, broadcastNewOrder, broadcastSubscriptionDelivery } from "./websocket";
import { hashPassword, verifyPassword, generateAccessToken, generateRefreshToken, requireUser, type AuthenticatedUserRequest } from "./userAuth";
import { verifyToken as verifyUserToken } from "./userAuth";
import { requireAdmin } from "./adminAuth";
import { sendEmail, createWelcomeEmail, createPasswordResetEmail, createPasswordChangeConfirmationEmail } from "./emailService";
import { db, subscriptions } from "@shared/db";
import { eq } from "drizzle-orm";
import { ZodError } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  registerAdminRoutes(app);
  registerPartnerRoutes(app);
  registerDeliveryRoutes(app);

  // Coupon verification route (supports optional userId for per-user limit checking)
  app.post("/api/coupons/verify", async (req: any, res) => {
    try {
      const { code, orderAmount, userId: providedUserId } = req.body;

      // Validate coupon code
      if (!code || typeof code !== 'string' || code.trim().length === 0) {
        res.status(400).json({ message: "Coupon code is required" });
        return;
      }

      // Validate order amount
      if (!orderAmount || typeof orderAmount !== 'number' || orderAmount <= 0 || !isFinite(orderAmount)) {
        res.status(400).json({ message: "Valid order amount is required" });
        return;
      }

      // Sanitize and validate userId if provided
      let userId: string | undefined = providedUserId;
      if (providedUserId && typeof providedUserId === 'string') {
        userId = providedUserId.trim();
      }

      // Try to get userId from auth header
      if (!userId && req.headers.authorization?.startsWith("Bearer ")) {
        try {
          const token = req.headers.authorization.substring(7);
          const payload = verifyUserToken(token);
          if (payload?.userId) userId = payload.userId;
        } catch (tokenError) {
          // Token verification failed, continue without userId
          console.log("Token verification failed for coupon, continuing without userId");
        }
      }

      const result = await storage.verifyCoupon(code.trim().toUpperCase(), orderAmount, userId);

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

  // Get available delivery time slots (public endpoint)
  app.get("/api/delivery-slots", async (req, res) => {
    try {
      const slots = await storage.getActiveDeliveryTimeSlots();
      res.json(slots);
    } catch (error) {
      console.error("Error fetching delivery slots:", error);
      res.status(500).json({ message: "Failed to fetch delivery slots" });
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

  // Reset password endpoint (Forgot Password)
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

      // Generate new password (last 6 digits of phone - same as default)
      const newPassword = phone.slice(-6);
      const passwordHash = await hashPassword(newPassword);

      await storage.updateUser(user.id, { passwordHash });

      // Send password reset email if user has email
      let emailSent = false;
      if (user.email) {
        const emailHtml = createPasswordResetEmail(user.name, user.phone, newPassword);
        emailSent = await sendEmail({
          to: user.email,
          subject: '🔐 Password Reset - RotiHai',
          html: emailHtml,
        });
      }

      res.json({
        message: emailSent
          ? "Password reset successful! Check your email for the new password."
          : "Password reset successful. Your new password is the last 6 digits of your phone number.",
        newPassword: !emailSent ? newPassword : undefined,
        emailSent,
        hint: "Use the last 6 digits of your phone number to login"
      });
    } catch (error) {
      console.error("Password reset error:", error);
      res.status(500).json({ message: "Failed to reset password" });
    }
  });

  // Change password endpoint (for logged-in users)
  app.post("/api/user/change-password", requireUser(), async (req: AuthenticatedUserRequest, res) => {
    try {
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        res.status(400).json({ message: "Current password and new password are required" });
        return;
      }

      if (newPassword.length < 6) {
        res.status(400).json({ message: "New password must be at least 6 characters long" });
        return;
      }

      const userId = req.authenticatedUser!.userId;
      const user = await storage.getUser(userId);

      if (!user) {
        res.status(404).json({ message: "User not found" });
        return;
      }

      // Verify current password
      const isValid = await verifyPassword(currentPassword, user.passwordHash);
      if (!isValid) {
        res.status(401).json({ message: "Current password is incorrect" });
        return;
      }

      // Update to new password
      const newPasswordHash = await hashPassword(newPassword);
      await storage.updateUser(user.id, { passwordHash: newPasswordHash });

      // Send confirmation email if user has email
      if (user.email) {
        const emailHtml = createPasswordChangeConfirmationEmail(user.name, user.phone);
        await sendEmail({
          to: user.email,
          subject: '✅ Password Changed Successfully - RotiHai',
          html: emailHtml,
        });
      }

      res.json({
        message: "Password changed successfully",
        success: true
      });
    } catch (error) {
      console.error("Change password error:", error);
      res.status(500).json({ message: "Failed to change password" });
    }
  });

  // User phone-based authentication routes
  app.post("/api/user/register", async (req, res) => {
    try {
      const result = insertUserSchema.safeParse(req.body);
      if (!result.success) {
        console.error("User registration validation failed:", result.error.flatten());
        res.status(400).json({ 
          message: "Invalid user data", 
          errors: result.error.flatten().fieldErrors 
        });
        return;
      }

      // Sanitize phone number
      const sanitizedPhone = result.data.phone.trim().replace(/\s+/g, '');
      
      const existingUser = await storage.getUserByPhone(sanitizedPhone);
      if (existingUser) {
        res.status(409).json({ message: "User with this phone number already exists" });
        return;
      }

      const passwordHash = await hashPassword(result.data.password);
      const user = await storage.createUser({
        name: result.data.name.trim(),
        phone: sanitizedPhone,
        email: result.data.email ? result.data.email.trim().toLowerCase() : null,
        address: result.data.address ? result.data.address.trim() : null,
        passwordHash,
        referralCode: null,
        walletBalance: 0,
      });

      const accessToken = generateAccessToken(user);
      const refreshToken = generateRefreshToken(user);

      console.log(`✅ User registered successfully: ${user.id}`);

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
    } catch (error: any) {
      console.error("Registration error:", error);
      res.status(500).json({ 
        message: error.message || "Failed to register user" 
      });
    }
  });

  // ✅ User login
  app.post("/api/user/login", async (req, res) => {
    try {
      const { phone, password } = req.body;

      if (!phone || !password) {
        res.status(400).json({ message: "Phone and password are required" });
        return;
      }

      const user = await storage.getUserByPhone(phone);
      if (!user) {
        res.status(401).json({ message: "Invalid phone number or password" });
        return;
      }

      const passwordMatch = await verifyPassword(password, user.passwordHash);
      if (!passwordMatch) {
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

  // ✅ Forgot password - send new password via email
  app.post("/api/user/forgot-password", async (req, res) => {
    try {
      const { phone } = req.body;

      if (!phone || phone.length !== 10) {
        res.status(400).json({ message: "Valid 10-digit phone number is required" });
        return;
      }

      const user = await storage.getUserByPhone(phone);
      if (!user) {
        res.status(404).json({ message: "No account found with this phone number" });
        return;
      }

      if (!user.email) {
        res.status(400).json({
          message: "No email address registered for this account. Please contact support."
        });
        return;
      }

      // Generate a new temporary password (8 characters)
      const tempPassword = Math.random().toString(36).slice(-8).toUpperCase();
      const hashedPassword = await hashPassword(tempPassword);

      // Update user password
      await storage.updateUser(user.id, { passwordHash: hashedPassword });

      // Send email with new password
      await sendEmail({
        to: user.email,
        subject: '🔐 Password Reset - RotiHai',
        html: createPasswordResetEmail(user.name, user.phone, tempPassword),
      });

      res.json({
        message: "A new password has been sent to your registered email address",
      });
    } catch (error) {
      console.error("Forgot password error:", error);
      res.status(500).json({
        message: "Failed to reset password. Please try again later."
      });
    }
  });

  // User logout (JWT-based)
app.post("/api/user/logout", async (req, res) => {
  try {
    // For JWT, logout simply means the client deletes the token.
    // (Tokens are stateless — there's nothing to invalidate on the server)
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
      let emailSent = false;

      if (!user) {
        isNewUser = true;
        // Default password: last 6 digits of phone number
        generatedPassword = phone.slice(-6);

        if (!generatedPassword || generatedPassword.length < 6) {
          return res.status(400).json({ message: "Invalid phone number: must be at least 6 digits" });
        }

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
        console.log("New user created:", user.id, "- Default password:", generatedPassword);

        // Send welcome email with password if email is provided
        if (email) {
          const emailHtml = createWelcomeEmail(customerName, phone, generatedPassword);
          emailSent = await sendEmail({
            to: email,
            subject: '🍽️ Welcome to RotiHai - Your Account Details',
            html: emailHtml,
          });

          if (emailSent) {
            console.log(`✅ Welcome email sent to ${email}`);
          }
        }
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
        emailSent: isNewUser ? emailSent : undefined,
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

  // Update user profile
  app.put("/api/user/profile", requireUser(), async (req: AuthenticatedUserRequest, res) => {
    try {
      const userId = req.authenticatedUser!.userId;
      const { name, email, address } = req.body;

      // Validate email if provided
      if (email && (typeof email !== 'string' || !email.includes('@'))) {
        res.status(400).json({ message: "Valid email is required" });
        return;
      }

      const user = await storage.getUser(userId);
      if (!user) {
        res.status(404).json({ message: "User not found" });
        return;
      }

      const updateData: any = {};
      if (name && typeof name === 'string') updateData.name = name.trim();
      if (email && typeof email === 'string') updateData.email = email.trim();
      if (address && typeof address === 'string') updateData.address = address.trim();

      if (Object.keys(updateData).length === 0) {
        res.status(400).json({ message: "No valid fields to update" });
        return;
      }

      await storage.updateUser(userId, updateData);

      const updatedUser = await storage.getUser(userId);
      res.json({
        id: updatedUser!.id,
        name: updatedUser!.name,
        phone: updatedUser!.phone,
        email: updatedUser!.email,
        address: updatedUser!.address,
        referralCode: updatedUser!.referralCode,
        walletBalance: updatedUser!.walletBalance || 0,
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
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

  // Check if user is eligible to apply a referral code
  app.get("/api/user/referral-eligibility", requireUser(), async (req: AuthenticatedUserRequest, res) => {
    try {
      const userId = req.authenticatedUser!.userId;

      // Check if user has already applied a referral code
      const referral = await storage.getReferralByReferredId(userId);

      if (referral) {
        res.json({ eligible: false, reason: "You have already used a referral code" });
        return;
      }

      res.json({ eligible: true });
    } catch (error: any) {
      console.error("Error checking referral eligibility:", error);
      res.status(500).json({ message: error.message || "Failed to check eligibility" });
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

  // User confirms they made payment (similar to order payment confirmation)
  app.post("/api/subscriptions/:id/payment-confirmed", requireUser(), async (req: AuthenticatedUserRequest, res) => {
    try {
      const { id } = req.params;
      const { paymentTransactionId } = req.body;

      console.log(`📋 Subscription payment confirmation request - ID: ${id}, TxnID: ${paymentTransactionId}`);

      if (!req.authenticatedUser) {
        res.status(401).json({ message: "Authentication required" });
        return;
      }

      if (!paymentTransactionId || paymentTransactionId.trim() === "") {
        res.status(400).json({ message: "Payment transaction ID is required" });
        return;
      }

      const subscription = await db.query.subscriptions.findFirst({
        where: eq(subscriptions.id, id),
      });

      if (!subscription) {
        console.log(`❌ Subscription not found: ${id}`);
        res.status(404).json({ message: "Subscription not found" });
        return;
      }

      if (subscription.userId !== req.authenticatedUser.userId) {
        console.log(`❌ Unauthorized access attempt for subscription: ${id}`);
        res.status(403).json({ message: "Unauthorized - This subscription belongs to another user" });
        return;
      }

      if (subscription.isPaid) {
        res.status(400).json({ message: "Subscription already paid" });
        return;
      }

      await db.update(subscriptions)
        .set({
          paymentTransactionId: paymentTransactionId.trim(),
          updatedAt: new Date()
        })
        .where(eq(subscriptions.id, id));

      console.log(`✅ Subscription payment confirmed: ${id} - TxnID: ${paymentTransactionId.trim()}`);

      res.status(200).json({
        message: "Payment confirmation submitted. Admin will verify shortly.",
        subscription: {
          ...subscription,
          paymentTransactionId: paymentTransactionId.trim()
        }
      });
    } catch (error) {
      console.error("Error confirming subscription payment:", error);
      res.status(500).json({
        message: "Failed to confirm payment",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Get subscription delivery schedule
  app.get("/api/subscriptions/:id/schedule", requireUser(), async (req: AuthenticatedUserRequest, res) => {
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

      const plan = await storage.getSubscriptionPlan(subscription.planId);
      if (!plan) {
        res.status(404).json({ message: "Plan not found" });
        return;
      }

      const deliveryDays = plan.deliveryDays as string[];
      const schedule = [];
      const currentDate = new Date(subscription.nextDeliveryDate);
      const endDate = subscription.endDate ? new Date(subscription.endDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      while (currentDate <= endDate && schedule.length < subscription.remainingDeliveries) {
        const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

        if (deliveryDays.includes(dayName)) {
          schedule.push({
            date: new Date(currentDate),
            time: subscription.nextDeliveryTime,
            items: plan.items,
            status: currentDate < new Date() ? "delivered" : "pending"
          });
        }

        currentDate.setDate(currentDate.getDate() + 1);
      }

      res.json({
        subscription,
        plan,
        schedule,
        remainingDeliveries: subscription.remainingDeliveries,
        totalDeliveries: subscription.totalDeliveries,
        deliveryHistory: subscription.deliveryHistory || []
      });
    } catch (error: any) {
      console.error("Error fetching subscription schedule:", error);
      res.status(500).json({ message: error.message || "Failed to fetch schedule" });
    }
  });

  // Mark delivery as completed (called by delivery personnel or auto-scheduled)
  app.post("/api/subscriptions/:id/complete-delivery", requireUser(), async (req: AuthenticatedUserRequest, res) => {
    try {
      const subscription = await storage.getSubscription(req.params.id);

      if (!subscription) {
        res.status(404).json({ message: "Subscription not found" });
        return;
      }

      if (!subscription.isPaid) {
        res.status(400).json({ message: "Subscription not paid" });
        return;
      }

      const plan = await storage.getSubscriptionPlan(subscription.planId);
      if (!plan) {
        res.status(404).json({ message: "Plan not found" });
        return;
      }

      const deliveryHistory = (subscription.deliveryHistory as any[]) || [];
      const now = new Date();

      deliveryHistory.push({
        deliveredAt: now,
        items: plan.items,
        deliveryDate: subscription.nextDeliveryDate,
        deliveryTime: subscription.nextDeliveryTime
      });

      const remainingDeliveries = subscription.remainingDeliveries - 1;
      const deliveryDays = plan.deliveryDays as string[];

      // Calculate next delivery date
      let nextDelivery = new Date(subscription.nextDeliveryDate);
      nextDelivery.setDate(nextDelivery.getDate() + 1);

      while (nextDelivery <= (subscription.endDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000))) {
        const dayName = nextDelivery.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
        if (deliveryDays.includes(dayName)) {
          break;
        }
        nextDelivery.setDate(nextDelivery.getDate() + 1);
      }

      const updateData: any = {
        remainingDeliveries,
        lastDeliveryDate: now,
        deliveryHistory,
        nextDeliveryDate: nextDelivery
      };

      if (remainingDeliveries <= 0) {
        updateData.status = "completed";
      }

      const updated = await storage.updateSubscription(req.params.id, updateData);
      if (!updated) {
        res.status(500).json({ message: "Failed to update subscription" });
        return;
      }

      // Broadcast subscription delivery update to assigned chef
      if (updated.chefId) {
        broadcastSubscriptionDelivery(updated);
      }

      res.json({ message: "Delivery completed", subscription: updated });
    } catch (error: any) {
      console.error("Error completing delivery:", error);
      res.status(500).json({ message: error.message || "Failed to complete delivery" });
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
      console.error("Error fetching categories:", error);
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
      console.error("Error fetching products:", error);
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
      couponCode: body.couponCode || undefined,
      discount: body.discount || 0,
      categoryId: body.categoryId || undefined,
      categoryName: body.categoryName || undefined,
      deliveryTime: body.deliveryTime || undefined,
      deliverySlotId: body.deliverySlotId || undefined,
    };

    // Validate: If order is for Roti category, deliveryTime is required
    const isRotiCategory = sanitized.categoryName?.toLowerCase() === 'roti' || 
                           sanitized.categoryName?.toLowerCase().includes('roti');
    if (isRotiCategory && !sanitized.deliveryTime) {
      return res.status(400).json({
        message: "Delivery time is required for Roti category orders",
        requiresDeliveryTime: true,
        categoryName: sanitized.categoryName
      });
    }

    const result = insertOrderSchema.safeParse(sanitized);
    if (!result.success) {
      console.error("❌ Order validation failed:", result.error.flatten());
      return res.status(400).json({
        message: "Invalid order data",
        errors: result.error.flatten(),
        received: sanitized,
      });
    }

    // Extract authenticated userId (JWT) or auto-register new user
    let userId: string | undefined;
    let accountCreated = false;
    let generatedPassword: string | undefined;
    let emailSent = false;

    if (req.headers.authorization?.startsWith("Bearer ")) {
      const token = req.headers.authorization.substring(7);
      const payload = verifyUserToken(token);
      if (payload?.userId) userId = payload.userId;
    } else if (sanitized.phone) {
      // Auto-register user if phone is provided and user doesn't exist
      let user = await storage.getUserByPhone(sanitized.phone);

      if (!user) {
        // Double-check phone doesn't exist (security measure)
        const existingUser = await storage.getUserByPhone(sanitized.phone);
        if (existingUser) {
          return res.status(400).json({
            message: "Phone number already registered. Please login to continue.",
            requiresLogin: true
          });
        }

        accountCreated = true;
        // Default password: last 6 digits of phone number
        const tempPassword = sanitized.phone.slice(-6);
        generatedPassword = tempPassword;
        const passwordHash = await hashPassword(tempPassword);
        user = await storage.createUser({
          name: sanitized.customerName,
          phone: sanitized.phone,
          email: sanitized.email || null,
          address: sanitized.address || null,
          passwordHash,
          referralCode: null,
          walletBalance: 0,
        });
        console.log("New user auto-created during checkout:", user.id, "- Default password:", generatedPassword);

        // Send welcome email with password if email is provided
        if (sanitized.email && generatedPassword) {
          const emailHtml = createWelcomeEmail(sanitized.customerName, sanitized.phone, generatedPassword);
          emailSent = await sendEmail({
            to: sanitized.email,
            subject: '🍽️ Welcome to RotiHai - Your Account Details',
            html: emailHtml,
          });

          if (emailSent) {
            console.log(`✅ Welcome email sent to ${sanitized.email}`);
          }
        }
      } else {
        await storage.updateUserLastLogin(user.id);
      }

      userId = user.id;
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

    // Get chef name and add to order
    const chef = await storage.getChefById(orderPayload.chefId);
    if (chef) {
      orderPayload.chefName = chef.name;
    }

    const order = await storage.createOrder(orderPayload);

      // Record coupon usage with per-user tracking
      if (orderPayload.couponCode && userId) {
        await storage.recordCouponUsage(orderPayload.couponCode, userId, order.id);
      } else if (orderPayload.couponCode) {
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
          // Execute referral completion in a database transaction
          await database.transaction(async (tx) => {
            // Get referred user info using transaction client
            const referredUser = await tx.query.users.findFirst({
              where: (u, { eq }) => eq(u.id, userId),
            });

            // Mark referral as completed
            await tx.update(referralsTable)
              .set({
                status: "completed",
                referredOrderCompleted: true,
                completedAt: new Date()
              })
              .where(eq(referralsTable.id, pendingReferral.id));

            // Add bonus to referrer's wallet with proper wallet transaction
            await storage.createWalletTransaction({
              userId: pendingReferral.referrerId,
              amount: pendingReferral.referrerBonus,
              type: "referral_bonus",
              description: `Referral bonus: ${referredUser?.name || 'User'} completed their first order using your code`,
              referenceId: pendingReferral.id,
              referenceType: "referral",
            }, tx);
          });
        }
      }

    broadcastNewOrder(order);

    console.log("✅ Order created successfully:", order.id);

    // Generate access token for newly created users
    let accessToken: string | undefined;
    if (accountCreated && userId) {
      const user = await storage.getUser(userId);
      if (user) {
        accessToken = generateAccessToken(user);
      }
    }

    res.status(201).json({
      ...order,
      accountCreated,
      defaultPassword: accountCreated ? generatedPassword : undefined,
      emailSent: accountCreated ? emailSent : undefined,
      accessToken: accountCreated ? accessToken : undefined,
    });
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

  // Confirm payment manually by user
  app.post("/api/orders/:id/payment-confirmed", async (req, res) => {
    try {
      const { id } = req.params;

      const order = await storage.getOrderById(id);
      if (!order) {
        res.status(404).json({ message: "Order not found" });
        return;
      }

      // Update order payment status to indicate user confirmed payment
      const updatedOrder = await storage.updateOrderPaymentStatus(id, "paid");

      console.log(`✅ Payment confirmed for order ${id} - Status: ${updatedOrder?.paymentStatus}`);

      res.json({
        message: "Payment confirmation received",
        order: updatedOrder
      });
    } catch (error: any) {
      console.error("Error confirming payment:", error);
      res.status(500).json({ message: error.message || "Failed to confirm payment" });
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

  // Calculate delivery fee based on distance (using admin settings)
  app.post("/api/calculate-delivery", async (req, res) => {
    try {
      const { latitude, longitude, chefId, subtotal = 0 } = req.body;

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

      // Import delivery utilities
      const { calculateDistance, calculateDelivery } = await import("@shared/deliveryUtils");

      // Calculate distance
      const distance = calculateDistance(latitude, longitude, chefLat, chefLon);

      // Get admin delivery settings
      const deliverySettings = await storage.getDeliverySettings();

      // Calculate delivery fee using admin settings
      const deliveryCalc = calculateDelivery(distance, subtotal, deliverySettings);

      res.json({
        distance,
        deliveryFee: deliveryCalc.deliveryFee,
        deliveryRangeName: deliveryCalc.deliveryRangeName,
        freeDeliveryEligible: deliveryCalc.freeDeliveryEligible,
        amountForFreeDelivery: deliveryCalc.amountForFreeDelivery,
        estimatedTime: Math.ceil(distance * 2 + 15)
      });
    } catch (error) {
      console.error("Error calculating delivery:", error);
      res.status(500).json({ message: "Failed to calculate delivery" });
    }
  });

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

  // Public route to fetch active promotional banners
  app.get("/api/promotional-banners", async (_req, res) => {
    try {
      const banners = await storage.getActivePromotionalBanners();
      res.json(banners);
    } catch (error) {
      console.error("Error fetching promotional banners:", error);
      res.status(500).json({ message: "Failed to fetch promotional banners" });
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
      const { planId, deliveryTime = "09:00", deliverySlotId, durationDays = 30 } = req.body;

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

      const endDate = new Date(now);
      endDate.setDate(endDate.getDate() + durationDays);

      // Calculate total deliveries based on frequency and duration
      const deliveryDays = plan.deliveryDays as string[];
      let totalDeliveries = 0;

      if (plan.frequency === "daily") {
        totalDeliveries = deliveryDays.length > 0 ? Math.floor(durationDays / 7) * deliveryDays.length : durationDays;
      } else if (plan.frequency === "weekly") {
        totalDeliveries = Math.floor(durationDays / 7);
      } else {
        totalDeliveries = Math.floor(durationDays / 30);
      }

      const subscription = await storage.createSubscription({
        userId,
        planId,
        chefId: null,
        chefAssignedAt: null,
        deliverySlotId: deliverySlotId || null,
        customerName: user.name || "",
        phone: user.phone || "",
        email: user.email || "",
        address: user.address || "",
        status: "pending", // Start as pending until payment is confirmed
        startDate: now,
        endDate,
        nextDeliveryDate: nextDelivery,
        nextDeliveryTime: deliveryTime,
        customItems: null,
        remainingDeliveries: totalDeliveries,
        totalDeliveries,
        isPaid: false,
        paymentTransactionId: null,
        originalPrice: plan.price,
        discountAmount: 0,
        walletAmountUsed: 0,
        couponCode: null,
        couponDiscount: 0,
        finalAmount: plan.price,
        paymentNotes: null,
        lastDeliveryDate: null,
        deliveryHistory: [],
        pauseStartDate: null,
        pauseResumeDate: null,
      });

      console.log(`📋 Subscription created: ${subscription.id} - Status: pending (awaiting payment)`);

      res.status(201).json(subscription);
    } catch (error: any) {
      console.error("Error creating subscription:", error);
      res.status(500).json({ message: error.message || "Failed to create subscription" });
    }
  });

  // Pause a subscription with optional date range
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

      const { pauseStartDate, pauseResumeDate } = req.body;
      
      // Prepare update data
      const updateData: any = { status: "paused" };
      
      if (pauseStartDate) {
        updateData.pauseStartDate = new Date(pauseStartDate);
      } else {
        updateData.pauseStartDate = new Date();
      }
      
      if (pauseResumeDate) {
        updateData.pauseResumeDate = new Date(pauseResumeDate);
      }

      const updated = await storage.updateSubscription(req.params.id, updateData);
      
      console.log(`⏸️ Subscription ${req.params.id} paused from ${updateData.pauseStartDate} to ${updateData.pauseResumeDate || 'indefinite'}`);
      
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

      const updated = await storage.updateSubscription(req.params.id, { 
        status: "active",
        pauseStartDate: null,
        pauseResumeDate: null
      });
      
      console.log(`▶️ Subscription ${req.params.id} resumed`);
      
      res.json(updated);
    } catch (error: any) {
      console.error("Error resuming subscription:", error);
      res.status(500).json({ message: error.message || "Failed to resume subscription" });
    }
  });

  // Update delivery time preference
  app.patch("/api/subscriptions/:id/delivery-time", requireUser(), async (req: AuthenticatedUserRequest, res) => {
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

      const { deliveryTime } = req.body;
      if (!deliveryTime) {
        res.status(400).json({ message: "Delivery time is required" });
        return;
      }

      const updated = await storage.updateSubscription(req.params.id, { 
        nextDeliveryTime: deliveryTime 
      });
      
      console.log(`🕐 Subscription ${req.params.id} delivery time updated to ${deliveryTime}`);
      
      res.json(updated);
    } catch (error: any) {
      console.error("Error updating delivery time:", error);
      res.status(500).json({ message: error.message || "Failed to update delivery time" });
    }
  });

  // Get delivery logs for a subscription
  app.get("/api/subscriptions/:id/delivery-logs", requireUser(), async (req: AuthenticatedUserRequest, res) => {
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

      const logs = await storage.getSubscriptionDeliveryLogs(req.params.id);
      res.json(logs);
    } catch (error: any) {
      console.error("Error fetching delivery logs:", error);
      res.status(500).json({ message: error.message || "Failed to fetch delivery logs" });
    }
  });

  // Confirm subscription payment (user confirms after paying via QR)
  app.post("/api/subscriptions/:id/payment-confirmed", requireUser(), async (req: AuthenticatedUserRequest, res) => {
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

      const { paymentTransactionId } = req.body;
      if (!paymentTransactionId) {
        res.status(400).json({ message: "Payment transaction ID is required" });
        return;
      }

      const updated = await storage.updateSubscription(req.params.id, {
        paymentTransactionId,
      });

      console.log(`💳 Subscription ${req.params.id} payment submitted with transaction: ${paymentTransactionId}`);

      res.json(updated);
    } catch (error: any) {
      console.error("Error confirming subscription payment:", error);
      res.status(500).json({ message: error.message || "Failed to confirm payment" });
    }
  });

  // Renew subscription (creates a new subscription for the same plan)
  app.post("/api/subscriptions/:id/renew", requireUser(), async (req: AuthenticatedUserRequest, res) => {
    try {
      const userId = req.authenticatedUser!.userId;
      const oldSubscription = await storage.getSubscription(req.params.id);

      if (!oldSubscription) {
        res.status(404).json({ message: "Subscription not found" });
        return;
      }

      if (oldSubscription.userId !== userId) {
        res.status(403).json({ message: "Unauthorized" });
        return;
      }

      const plan = await storage.getSubscriptionPlan(oldSubscription.planId);
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

      const endDate = new Date(now);
      endDate.setDate(endDate.getDate() + 30);

      const deliveryDays = plan.deliveryDays as string[];
      let totalDeliveries = Math.floor(30 / 7) * deliveryDays.length;

      const newSubscription = await storage.createSubscription({
        userId,
        planId: oldSubscription.planId,
        chefId: oldSubscription.chefId || null,
        chefAssignedAt: null,
        deliverySlotId: oldSubscription.deliverySlotId || null,
        customerName: user.name || "",
        phone: user.phone || "",
        email: user.email || "",
        address: user.address || "",
        status: "pending",
        startDate: now,
        endDate,
        nextDeliveryDate: nextDelivery,
        nextDeliveryTime: oldSubscription.nextDeliveryTime || "09:00",
        customItems: null,
        remainingDeliveries: totalDeliveries,
        totalDeliveries,
        isPaid: false,
        paymentTransactionId: null,
        originalPrice: plan.price,
        discountAmount: 0,
        walletAmountUsed: 0,
        couponCode: null,
        couponDiscount: 0,
        finalAmount: plan.price,
        paymentNotes: null,
        lastDeliveryDate: null,
        deliveryHistory: [],
        pauseStartDate: null,
        pauseResumeDate: null,
      });

      console.log(`🔄 Subscription renewed for user ${userId} - New subscription ID: ${newSubscription.id}`);

      res.status(201).json(newSubscription);
    } catch (error: any) {
      console.error("Error renewing subscription:", error);
      res.status(500).json({ message: error.message || "Failed to renew subscription" });
    }
  });

  // Update delivery time for a subscription
  app.patch("/api/subscriptions/:subscriptionId/delivery-time", requireUser(), async (req: AuthenticatedUserRequest, res) => {
    try {
      const userId = req.authenticatedUser!.userId;
      const { subscriptionId } = req.params;
      const { deliveryTime } = req.body;

      if (!deliveryTime || typeof deliveryTime !== "string") {
        res.status(400).json({ message: "Valid delivery time is required" });
        return;
      }

      // Validate time format (HH:mm)
      if (!/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(deliveryTime)) {
        res.status(400).json({ message: "Invalid time format. Use HH:mm" });
        return;
      }

      const subscription = await storage.getSubscription(subscriptionId);
      if (!subscription) {
        res.status(404).json({ message: "Subscription not found" });
        return;
      }

      if (subscription.userId !== userId) {
        res.status(403).json({ message: "Unauthorized" });
        return;
      }

      const updated = await storage.updateSubscription(subscriptionId, {
        nextDeliveryTime: deliveryTime,
      });

      console.log(`⏰ Updated subscription ${subscriptionId} delivery time to: ${deliveryTime}`);
      res.json(updated);
    } catch (error: any) {
      console.error("Error updating delivery time:", error);
      res.status(500).json({ message: error.message || "Failed to update delivery time" });
    }
  });

  // Get subscription schedule with delivery history
  app.get("/api/subscriptions/:id/schedule", requireUser(), async (req: AuthenticatedUserRequest, res) => {
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

      const plan = await storage.getSubscriptionPlan(subscription.planId);
      if (!plan) {
        res.status(404).json({ message: "Subscription plan not found" });
        return;
      }

      const logs = await storage.getSubscriptionDeliveryLogs(req.params.id);
      
      const scheduleItems = logs.map(log => ({
        date: log.date,
        time: log.time,
        items: plan.items,
        status: log.status === "delivered" ? "delivered" : "pending"
      }));

      res.json({
        subscription,
        plan,
        schedule: scheduleItems,
        remainingDeliveries: subscription.remainingDeliveries,
        totalDeliveries: subscription.totalDeliveries,
        deliveryHistory: logs
      });
    } catch (error: any) {
      console.error("Error fetching subscription schedule:", error);
      res.status(500).json({ message: error.message || "Failed to fetch schedule" });
    }
  });

  // Cancel subscription route removed - users can only pause/resume
  // Admin can manage subscriptions through admin routes if needed

  // Public delivery settings endpoint (no auth required for cart calculations)
  app.get("/api/delivery-settings", async (req, res) => {
    try {
      const settings = await storage.getDeliverySettings();
      res.json(settings);
    } catch (error: any) {
      console.error("Error fetching delivery settings:", error);
      res.status(500).json({ message: error.message || "Failed to fetch delivery settings" });
    }
  });

  // Cart Settings APIs - Public endpoint to get cart minimum order settings
  app.get("/api/cart-settings", async (req, res) => {
    try {
      const settings = await storage.getCartSettings();
      res.json(settings);
    } catch (error: any) {
      console.error("Error fetching cart settings:", error);
      res.status(500).json({ message: error.message || "Failed to fetch cart settings" });
    }
  });

  app.get("/api/cart-settings/category/:categoryId", async (req, res) => {
    try {
      const setting = await storage.getCartSettingByCategoryId(req.params.categoryId);
      if (!setting) {
        res.status(404).json({ message: "Cart setting not found for this category" });
        return;
      }
      res.json(setting);
    } catch (error: any) {
      console.error("Error fetching cart setting:", error);
      res.status(500).json({ message: error.message || "Failed to fetch cart setting" });
    }
  });

  // Admin: Assign a chef/partner to a subscription
  app.patch("/api/admin/subscriptions/:id/assign-chef", requireAdmin(), async (req: any, res) => {
    try {
      const { chefId } = req.body;
      if (!chefId) {
        res.status(400).json({ message: "Chef ID is required" });
        return;
      }

      const subscription = await storage.getSubscription(req.params.id);
      if (!subscription) {
        res.status(404).json({ message: "Subscription not found" });
        return;
      }

      const chef = await storage.getChefById(chefId);
      if (!chef) {
        res.status(404).json({ message: "Chef not found" });
        return;
      }

      const updated = await storage.updateSubscription(req.params.id, { chefId, chefAssignedAt: new Date() });
      console.log(`👨‍🍳 Subscription ${req.params.id} assigned to chef ${chefId}`);
      
      // Broadcast the subscription update
      const { broadcastSubscriptionUpdate } = await import("./websocket");
      if (updated) {
        broadcastSubscriptionUpdate(updated);
      }
      
      res.json(updated);
    } catch (error: any) {
      console.error("Error assigning chef to subscription:", error);
      res.status(500).json({ message: error.message || "Failed to assign chef" });
    }
  });

  // Admin: Get subscriptions needing reassignment (assigned but not delivered for 1-2 days)
  app.get("/api/admin/subscriptions/reassignment-pending", requireAdmin(), async (req: any, res) => {
    try {
      const allSubscriptions = await storage.getSubscriptions();
      const now = new Date();
      const reassignmentThresholdDays = 2; // Reassign if no delivery in 2 days
      
      const pendingReassignments = allSubscriptions.filter(sub => {
        // Must have a chef assigned
        if (!sub.chefId || !sub.chefAssignedAt) return false;
        
        // Must be active and paid
        if (sub.status !== "active" || !sub.isPaid) return false;
        
        // Check if assigned more than threshold days ago AND no recent delivery
        const daysSinceAssignment = Math.floor((now.getTime() - new Date(sub.chefAssignedAt).getTime()) / (1000 * 60 * 60 * 24));
        const daysSinceLastDelivery = sub.lastDeliveryDate ? Math.floor((now.getTime() - new Date(sub.lastDeliveryDate).getTime()) / (1000 * 60 * 60 * 24)) : daysSinceAssignment;
        
        // Flag for reassignment if assigned 2+ days ago with no delivery
        return daysSinceAssignment >= reassignmentThresholdDays && daysSinceLastDelivery >= reassignmentThresholdDays;
      });

      // Fetch chef details for each subscription
      const enrichedReassignments = await Promise.all(pendingReassignments.map(async (sub) => {
        const chef = sub.chefId ? await storage.getChefById(sub.chefId) : null;
        const plan = await storage.getSubscriptionPlan(sub.planId);
        return {
          ...sub,
          currentChefName: chef?.name,
          planName: plan?.name,
        };
      }));

      console.log(`⚠️ Found ${enrichedReassignments.length} subscriptions pending reassignment`);
      res.json(enrichedReassignments);
    } catch (error: any) {
      console.error("Error fetching pending reassignments:", error);
      res.status(500).json({ message: error.message || "Failed to fetch pending reassignments" });
    }
  });

  // Admin: Reassign subscription to a different chef
  app.patch("/api/admin/subscriptions/:id/reassign-chef", requireAdmin(), async (req: any, res) => {
    try {
      const { newChefId } = req.body;
      if (!newChefId) {
        res.status(400).json({ message: "New chef ID is required" });
        return;
      }

      const subscription = await storage.getSubscription(req.params.id);
      if (!subscription) {
        res.status(404).json({ message: "Subscription not found" });
        return;
      }

      const newChef = await storage.getChefById(newChefId);
      if (!newChef) {
        res.status(404).json({ message: "Chef not found" });
        return;
      }

      const oldChefId = subscription.chefId;
      const updated = await storage.updateSubscription(req.params.id, { chefId: newChefId, chefAssignedAt: new Date() });
      
      console.log(`🔄 Subscription ${req.params.id} reassigned from chef ${oldChefId} to ${newChefId}`);
      res.json({ 
        message: "Subscription reassigned successfully", 
        subscription: updated,
        previousChefId: oldChefId,
        newChefId: newChefId
      });
    } catch (error: any) {
      console.error("Error reassigning subscription:", error);
      res.status(500).json({ message: error.message || "Failed to reassign subscription" });
    }
  });

  const httpServer = createServer(app);
  setupWebSocket(httpServer);

  return httpServer;
}