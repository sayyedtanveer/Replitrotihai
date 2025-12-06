import { type Category, type InsertCategory, type Product, type InsertProduct, type Order, type InsertOrder, type User, type UpsertUser, type Chef, type AdminUser, type InsertAdminUser, type PartnerUser, type Subscription, type SubscriptionPlan, type DeliverySetting, type InsertDeliverySetting, type CartSetting, type InsertCartSetting, type DeliveryPersonnel, type InsertDeliveryPersonnel, type WalletTransaction, type ReferralReward, type PromotionalBanner, type InsertPromotionalBanner, type SubscriptionDeliveryLog, type InsertSubscriptionDeliveryLog, type DeliveryTimeSlot, type InsertDeliveryTimeSlot, type Coupon } from "@shared/schema";
import { randomUUID } from "crypto";
import { nanoid } from "nanoid";
import { eq, and, gte, lte, desc, asc, or, isNull, sql } from "drizzle-orm";
import { db, users, categories, products, orders, chefs, adminUsers, partnerUsers, subscriptions,
  subscriptionPlans, subscriptionDeliveryLogs, deliverySettings, cartSettings, deliveryPersonnel, coupons, couponUsages, referrals, walletTransactions, referralRewards, promotionalBanners, deliveryTimeSlots } from "@shared/db";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByPhone(phone: string): Promise<User | undefined>;
  createUser(user: Omit<User, "id" | "createdAt" | "updatedAt" | "lastLoginAt">): Promise<User>;
  updateUserLastLogin(id: string): Promise<void>;
  updateUser(id: string, user: Partial<User>): Promise<User | undefined>;
  deleteUser(id: string): Promise<boolean>;
  getOrdersByUserId(userId: string): Promise<Order[]>;

  getAllCategories(): Promise<Category[]>;
  getCategoryById(id: string): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(id: string, category: Partial<InsertCategory>): Promise<Category | undefined>;
  deleteCategory(id: string): Promise<boolean>;

  getAllProducts(): Promise<Product[]>;
  getProductById(id: string): Promise<Product | undefined>;
  getProductsByCategoryId(categoryId: string): Promise<Product[]>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: string, product: Partial<InsertProduct>): Promise<Product | undefined>;
  deleteProduct(id: string): Promise<boolean>;

  createOrder(order: InsertOrder): Promise<Order>;
  getOrderById(id: string): Promise<Order | undefined>;
  getAllOrders(): Promise<Order[]>;
  updateOrderStatus(id: string, status: string): Promise<Order | undefined>;
  updateOrderPaymentStatus(id: string, paymentStatus: "pending" | "paid" | "confirmed"): Promise<Order | undefined>;
  deleteOrder(id: string): Promise<void>;

  getChefs(): Promise<Chef[]>;
  getChefById(id: string): Promise<Chef | null>;
  getChefsByCategory(categoryId: string): Promise<Chef[]>;
  createChef(data: Omit<Chef, "id">): Promise<Chef>;
  updateChef(id: string, data: Partial<Chef>): Promise<Chef | undefined>;
  deleteChef(id: string): Promise<boolean>;

  getAdminByUsername(username: string): Promise<AdminUser | undefined>;
  getAdminById(id: string): Promise<AdminUser | undefined>;
  createAdmin(admin: InsertAdminUser & { passwordHash: string }): Promise<AdminUser>;
  updateAdminLastLogin(id: string): Promise<void>;
  updateAdminRole(id: string, role: string): Promise<AdminUser | undefined>;
  deleteAdmin(id: string): Promise<boolean>;
  getAllAdmins(): Promise<AdminUser[]>;
  getAllUsers(): Promise<User[]>;

  getPartnerByUsername(username: string): Promise<PartnerUser | null>;
  getPartnerById(id: string): Promise<PartnerUser | null>;
  createPartner(data: Omit<PartnerUser, "id" | "createdAt" | "lastLoginAt">): Promise<PartnerUser>;
  updatePartner(id: string, data: Partial<Pick<PartnerUser, "email" | "passwordHash" | "profilePictureUrl">>): Promise<void>;
  updatePartnerLastLogin(id: string): Promise<void>;
  getOrdersByChefId(chefId: string): Promise<Order[]>;
  getPartnerDashboardMetrics(chefId: string): Promise<any>;
  getAllPartners(): Promise<PartnerUser[]>;
  deletePartner(id: string): Promise<boolean>;

  getDashboardMetrics(): Promise<{
    userCount: number;
    orderCount: number;
    totalRevenue: number;
    pendingOrders: number;
    completedOrders: number;
  }>;

  // Subscription methods
  getSubscriptionPlans(): Promise<SubscriptionPlan[]>;
  getSubscriptionPlan(id: string): Promise<SubscriptionPlan | undefined>;
  createSubscriptionPlan(data: Omit<SubscriptionPlan, "id" | "createdAt" | "updatedAt">): Promise<SubscriptionPlan>;
  updateSubscriptionPlan(id: string, data: Partial<SubscriptionPlan>): Promise<SubscriptionPlan | undefined>;
  deleteSubscriptionPlan(id: string): Promise<void>;

  getSubscriptions(): Promise<Subscription[]>;
  getSubscription(id: string): Promise<Subscription | undefined>;
  getSubscriptionsByUserId(userId: string): Promise<Subscription[]>;
  createSubscription(data: Omit<Subscription, "id" | "createdAt" | "updatedAt">): Promise<Subscription>;
  updateSubscription(id: string, data: Partial<Subscription>): Promise<Subscription | undefined>;
  deleteSubscription(id: string): Promise<boolean>;
  getActiveSubscriptionCountByChef(chefId: string): Promise<number>; // Added for load balancing
  findBestChefForCategory(categoryId: string): Promise<Chef | null>; // Added for load balancing
  assignChefToSubscription(subscriptionId: string, chefId: string): Promise<Subscription | undefined>;
  getActiveSubscriptionsByChef(chefId: string): Promise<Subscription[]>; // Added for load balancing

  // Subscription Delivery Log methods
  getSubscriptionDeliveryLogs(subscriptionId: string): Promise<SubscriptionDeliveryLog[]>;
  getSubscriptionDeliveryLogsByDate(date: Date): Promise<SubscriptionDeliveryLog[]>;
  getSubscriptionDeliveryLog(id: string): Promise<SubscriptionDeliveryLog | undefined>;
  createSubscriptionDeliveryLog(data: Omit<SubscriptionDeliveryLog, "id" | "createdAt" | "updatedAt">): Promise<SubscriptionDeliveryLog>;
  updateSubscriptionDeliveryLog(id: string, data: Partial<SubscriptionDeliveryLog>): Promise<SubscriptionDeliveryLog | undefined>;
  deleteSubscriptionDeliveryLog(id: string): Promise<void>;
  getDeliveryLogBySubscriptionAndDate(subscriptionId: string, date: Date): Promise<SubscriptionDeliveryLog | undefined>;

  // Delivery settings methods
  getDeliverySettings(): Promise<DeliverySetting[]>;
  getDeliverySetting(id: string): Promise<DeliverySetting | undefined>;
  createDeliverySetting(data: Omit<DeliverySetting, "id" | "createdAt" | "updatedAt">): Promise<DeliverySetting>;
  updateDeliverySetting(id: string, data: Partial<DeliverySetting>): Promise<DeliverySetting | undefined>;
  deleteDeliverySetting(id: string): Promise<void>;

  // Cart settings methods
  getCartSettings(): Promise<CartSetting[]>;
  getCartSettingByCategoryId(categoryId: string): Promise<CartSetting | undefined>;
  createCartSetting(data: Omit<CartSetting, "id" | "createdAt" | "updatedAt">): Promise<CartSetting>;
  updateCartSetting(id: string, data: Partial<CartSetting>): Promise<CartSetting | undefined>;
  deleteCartSetting(id: string): Promise<void>;

  // Report methods
  getSalesReport(from: Date, to: Date): Promise<any>;
  getUserReport(from: Date, to: Date): Promise<any>;
  getInventoryReport(): Promise<any>;
  getSubscriptionReport(from: Date, to: Date): Promise<any>;

  // Delivery Personnel methods
  getDeliveryPersonnelByPhone(phone: string): Promise<DeliveryPersonnel | undefined>;
  getDeliveryPersonnelById(id: string): Promise<DeliveryPersonnel | undefined>;
  getAllDeliveryPersonnel(): Promise<DeliveryPersonnel[]>;
  getAvailableDeliveryPersonnel(): Promise<DeliveryPersonnel[]>;
  createDeliveryPersonnel(data: InsertDeliveryPersonnel & { passwordHash: string }): Promise<DeliveryPersonnel>;
  updateDeliveryPersonnel(id: string, data: Partial<DeliveryPersonnel>): Promise<DeliveryPersonnel | undefined>;
  updateDeliveryPersonnelLastLogin(id: string): Promise<void>;
  deleteDeliveryPersonnel(id: string): Promise<boolean>;

  // Enhanced Order methods
  approveOrder(orderId: string, approvedBy: string): Promise<Order | undefined>;
  acceptOrder(orderId: string, approvedBy: string): Promise<Order | undefined>;
  rejectOrder(orderId: string, rejectedBy: string, reason: string): Promise<Order | undefined>;
  assignOrderToDeliveryPerson(orderId: string, deliveryPersonId: string): Promise<Order | undefined>;
  updateOrderPickup(orderId: string): Promise<Order | undefined>;
  updateOrderDelivery(orderId: string): Promise<Order | undefined>;
  getOrdersByDeliveryPerson(deliveryPersonId: string): Promise<Order[]>;

  // Admin dashboard metrics
  getAdminDashboardMetrics(): Promise<{ partnerCount: number; deliveryPersonnelCount: number }>;

  // Referral methods
  generateReferralCode(userId: string): Promise<string>;
  createReferral(referrerId: string, referredId: string): Promise<any>;
  applyReferralBonus(referralCode: string, newUserId: string): Promise<void>;
  getReferralsByUser(userId: string): Promise<any[]>;
  getReferralByReferredId(referredId: string): Promise<any | null>;
  getUserWalletBalance(userId: string): Promise<number>;
  updateWalletBalance(userId: string, amount: number): Promise<void>;

  // Enhanced Wallet & Referral methods
  createWalletTransaction(transaction: {
    userId: string;
    amount: number;
    type: "credit" | "debit" | "referral_bonus" | "order_discount";
    description: string;
    referenceId?: string;
    referenceType?: string;
  }, txClient?: any): Promise<void>;
  getWalletTransactions(userId: string, limit?: number): Promise<any[]>;
  getReferralStats(userId: string): Promise<{
    totalReferrals: number;
    pendingReferrals: number;
    completedReferrals: number;
    totalEarnings: number;
    referralCode: string;
  }>;
  getUserReferralCode(userId: string): Promise<string | null>;
  markReferralComplete(referralId: string): Promise<void>;
  checkReferralEligibility(userId: string): Promise<{ eligible: boolean; reason?: string }>;

  // Promotional Banner methods
  getAllPromotionalBanners(): Promise<PromotionalBanner[]>;
  getActivePromotionalBanners(): Promise<PromotionalBanner[]>;
  createPromotionalBanner(data: InsertPromotionalBanner): Promise<PromotionalBanner>;
  updatePromotionalBanner(id: string, data: Partial<InsertPromotionalBanner>): Promise<PromotionalBanner | null>;
  deletePromotionalBanner(id: string): Promise<boolean>;

  // Delivery Time Slots methods
  getAllDeliveryTimeSlots(): Promise<DeliveryTimeSlot[]>;
  getActiveDeliveryTimeSlots(): Promise<DeliveryTimeSlot[]>;
  getDeliveryTimeSlot(id: string): Promise<DeliveryTimeSlot | undefined>;
  createDeliveryTimeSlot(data: InsertDeliveryTimeSlot): Promise<DeliveryTimeSlot>;
  updateDeliveryTimeSlot(id: string, data: Partial<InsertDeliveryTimeSlot>): Promise<DeliveryTimeSlot | undefined>;
  deleteDeliveryTimeSlot(id: string): Promise<boolean>;

  // Referral Rewards Settings methods
  getAllReferralRewards(): Promise<ReferralReward[]>;
  getActiveReferralReward(): Promise<ReferralReward | undefined>;
  createReferralReward(data: Omit<ReferralReward, "id" | "createdAt" | "updatedAt">): Promise<ReferralReward>;
  updateReferralReward(id: string, data: Partial<ReferralReward>): Promise<ReferralReward | undefined>;
  deleteReferralReward(id: string): Promise<boolean>;

  // Coupon management methods
  getAllCoupons(): Promise<Coupon[]>;
  createCoupon(data: any): Promise<Coupon>;
  deleteCoupon(id: string): Promise<boolean>;
  updateCoupon(id: string, data: Partial<Coupon>): Promise<Coupon | undefined>;

  // Referral management methods
  getAllReferrals(): Promise<any[]>;
  getReferralById(id: string): Promise<any | undefined>;
  updateReferralStatus(id: string, status: string, referrerBonus: number, referredBonus: number): Promise<void>;

  // Wallet transaction methods
  getAllWalletTransactions(dateFilter?: string): Promise<WalletTransaction[]>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private categories: Map<string, Category> = new Map();
  private chefsData: Map<string, Chef> = new Map(); // Renamed from 'chefs' to 'chefsData' for clarity
  private products: Map<string, Product> = new Map();
  private orders: Map<string, Order> = new Map();
  private adminUsers: Map<string, AdminUser> = new Map();
  private subscriptionPlans: Map<string, SubscriptionPlan> = new Map();
  private subscriptions: Map<string, Subscription> = new Map();

  constructor() {
    this.users = new Map();
    this.categories = new Map();
    this.chefsData = new Map(); // Initialize chefsData
    this.products = new Map();
    this.orders = new Map();
    this.adminUsers = new Map();
    this.subscriptionPlans = new Map();
    this.subscriptions = new Map();
    // this.seedData(); // Seed data is not directly applicable to the DB-backed storage
  }

  async getUser(id: string): Promise<User | undefined> {
    return db.query.users.findFirst({ where: (u, { eq }) => eq(u.id, id) });
  }

  async getUserByPhone(phone: string): Promise<User | undefined> {
    return db.query.users.findFirst({ where: (user, { eq }) => eq(user.phone, phone) });
  }

  async createUser(userData: Omit<User, "id" | "createdAt" | "updatedAt" | "lastLoginAt">): Promise<User> {
    const id = randomUUID();
    const user: User = {
      ...userData,
      id,
      lastLoginAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await db.insert(users).values(user);
    return user;
  }

  async updateUserLastLogin(id: string): Promise<void> {
    await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, id));
  }

  async updateUser(id: string, userData: Partial<User>): Promise<User | undefined> {
    await db.update(users).set({ ...userData, updatedAt: new Date() }).where(eq(users.id, id));
    return this.getUser(id);
  }

  async getOrdersByUserId(userId: string): Promise<Order[]> {
    return db.query.orders.findMany({
      where: (order, { eq }) => eq(order.userId, userId),
      orderBy: (order, { desc }) => [desc(order.createdAt)],
    });
  }

  async deleteUser(id: string): Promise<boolean> {
    await db.delete(users).where(eq(users.id, id));
    return true;
  }

  async getAllCategories(): Promise<Category[]> {
    return db.query.categories.findMany();
  }

  async getCategoryById(id: string): Promise<Category | undefined> {
    return db.query.categories.findFirst({ where: (c, { eq }) => eq(c.id, id) });
  }

  async createCategory(insertCategory: InsertCategory): Promise<Category> {
    const id = randomUUID();
    const category: Category = { ...insertCategory, id };
    await db.insert(categories).values(category);
    return category;
  }

  async updateCategory(id: string, updateData: Partial<InsertCategory>): Promise<Category | undefined> {
    await db.update(categories).set(updateData).where(eq(categories.id, id));
    return this.getCategoryById(id);
  }

  async deleteCategory(id: string): Promise<boolean> {
    await db.delete(categories).where(eq(categories.id, id));
    return true;
  }

  async getAllProducts(): Promise<Product[]> {
    return db.query.products.findMany();
  }

  async getProductById(id: string): Promise<Product | undefined> {
    return db.query.products.findFirst({ where: (p, { eq }) => eq(p.id, id) });
  }

  async getProductsByCategoryId(categoryId: string): Promise<Product[]> {
    // This filter should apply to products within a category.
    // If the intention is to show restaurants/partners, this logic might need adjustment
    // to filter chefs/partners based on category, not products.
    return db.query.products.findMany({ where: (p, { eq }) => eq(p.categoryId, categoryId) });
  }

  async createProduct(insertProduct: InsertProduct): Promise<Product> {
    const id = randomUUID();
    const product: Product = {
      ...insertProduct,
      id,
      rating: insertProduct.rating || "4.5",
      reviewCount: insertProduct.reviewCount || 0,
      isVeg: insertProduct.isVeg !== undefined ? insertProduct.isVeg : true,
      isCustomizable: insertProduct.isCustomizable !== undefined ? insertProduct.isCustomizable : false,
      chefId: insertProduct.chefId || null,
      stockQuantity: insertProduct.stockQuantity !== undefined ? insertProduct.stockQuantity : 100,
      lowStockThreshold: insertProduct.lowStockThreshold !== undefined ? insertProduct.lowStockThreshold : 20,
      isAvailable: insertProduct.isAvailable !== undefined ? insertProduct.isAvailable : true,
      offerPercentage: insertProduct.offerPercentage ?? 0,
    };
    await db.insert(products).values(product);
    return product;
  }

  async updateProduct(id: string, updateData: Partial<InsertProduct>): Promise<Product | undefined> {
    await db.update(products).set(updateData).where(eq(products.id, id));
    return this.getProductById(id);
  }

  async deleteProduct(id: string): Promise<boolean> {
    await db.delete(products).where(eq(products.id, id));
    return true;
  }

  async createOrder(insertOrder: InsertOrder): Promise<Order> {
    const id = randomUUID();
    const orderData = {
      id,
      customerName: insertOrder.customerName,
      phone: insertOrder.phone,
      email: insertOrder.email || null,
      address: insertOrder.address,
      items: insertOrder.items,
      subtotal: insertOrder.subtotal,
      deliveryFee: insertOrder.deliveryFee,
      total: insertOrder.total,
      status: insertOrder.paymentStatus || "pending",
      paymentStatus: "pending" as const,
      paymentQrShown: true,
      chefId: insertOrder.chefId || null,
      chefName: insertOrder.chefName || null,
      userId: insertOrder.userId || null,
      categoryId: insertOrder.categoryId || null,
      categoryName: insertOrder.categoryName || null,
      deliveryTime: insertOrder.deliveryTime || null,
      deliverySlotId: insertOrder.deliverySlotId || null,
      createdAt: new Date(),
    };

    const [createdOrder] = await db.insert(orders).values(orderData).returning();
    return createdOrder;
  }

  async getOrderById(id: string): Promise<Order | undefined> {
    return db.query.orders.findFirst({ where: (o, { eq }) => eq(o.id, id) });
  }

  async getAllOrders(): Promise<Order[]> {
    return db.query.orders.findMany();
  }

  async updateOrderStatus(id: string, status: string): Promise<Order | undefined> {
    const [order] = await db
      .update(orders)
      .set({ status })
      .where(eq(orders.id, id))
      .returning();
    return order || undefined;
  }

  async updateOrderPaymentStatus(id: string, paymentStatus: "pending" | "paid" | "confirmed"): Promise<Order | undefined> {
    const [order] = await db
      .update(orders)
      .set({ paymentStatus })
      .where(eq(orders.id, id))
      .returning();
    return order || undefined;
  }

  async deleteOrder(id: string): Promise<void> {
    await db.delete(orders).where(eq(orders.id, id));
  }

   async getChefs(): Promise<Chef[]> {
    // If filtering by category is intended to show partners/restaurants,
    // this query should select from `partnerUsers` or `chefs` based on context.
    // For now, returning all chefs as per original implementation.
    const result = await db.select().from(chefs);
    return result.map(chef => ({
      ...chef,
      latitude: chef.latitude ?? 19.0728,
      longitude: chef.longitude ?? 72.8826,
    }));
  }


  async getChefById(id: string): Promise<Chef | null> {
    const chef = await db.query.chefs.findFirst({ where: (c, { eq }) => eq(c.id, id) });
    return chef || null;
  }

  async getChefsByCategory(categoryId: string): Promise<Chef[]> {
    // This method, when called with a category, should return chefs/partners
    // associated with that category. The current implementation does this.
    return db.query.chefs.findMany({ where: (c, { eq }) => eq(c.categoryId, categoryId) });
  }

  async createChef(data: Omit<Chef, "id">): Promise<Chef> {
    const id = nanoid();
    const chef: Chef = { id, ...data, latitude: data.latitude || 0, longitude: data.longitude || 0 };
    await db.insert(chefs).values(chef);
    return chef;
  }

  async updateChef(id: string, data: Partial<Chef>): Promise<Chef | undefined> {
    await db.update(chefs).set(data).where(eq(chefs.id, id));
    const chef = await this.getChefById(id);
    return chef || undefined;
  }

  async deleteChef(id: string): Promise<boolean> {
    await db.delete(chefs).where(eq(chefs.id, id));
    return true;
  }

  async getAdminByUsername(username: string): Promise<AdminUser | undefined> {
    return db.query.adminUsers.findFirst({ where: (admin, { eq }) => eq(admin.username, username) });
  }

  async getAdminById(id: string): Promise<AdminUser | undefined> {
    return db.query.adminUsers.findFirst({ where: (admin, { eq }) => eq(admin.id, id) });
  }

  async createAdmin(adminData: InsertAdminUser & { passwordHash: string }): Promise<AdminUser> {
    const id = randomUUID();
    const admin: AdminUser = {
      id,
      username: adminData.username,
      email: adminData.email,
      passwordHash: adminData.passwordHash,
      role: adminData.role || "viewer",
      lastLoginAt: null,
      createdAt: new Date(),
    };
    await db.insert(adminUsers).values(admin);
    return admin;
  }

  async updateAdminLastLogin(id: string): Promise<void> {
    await db.update(adminUsers).set({ lastLoginAt: new Date() }).where(eq(adminUsers.id, id));
  }

  async updateAdminRole(id: string, role: string): Promise<AdminUser | undefined> {
    await db.update(adminUsers).set({ role: role as "super_admin" | "manager" | "viewer" }).where(eq(adminUsers.id, id));
    return this.getAdminById(id);
  }

  async deleteAdmin(id: string): Promise<boolean> {
    await db.delete(adminUsers).where(eq(adminUsers.id, id));
    return true;
  }

  async getAllAdmins(): Promise<AdminUser[]> {
    return db.query.adminUsers.findMany();
  }

  async getAllUsers(): Promise<User[]>{
    return db.query.users.findMany();
  }

  async getPartnerByUsername(username: string): Promise<PartnerUser | null> {
    try {
      const trimmedUsername = username.trim().toLowerCase();
      const result = await db
        .select()
        .from(partnerUsers)
        .where(eq(partnerUsers.username, trimmedUsername))
        .limit(1);
      return result[0] || null;
    } catch (error) {
      console.error("Error getting partner by username:", error);
      return null;
    }
  }

  async getPartnerById(id: string): Promise<PartnerUser | null> {
    const partner = await db.query.partnerUsers.findFirst({ where: (p, { eq }) => eq(p.id, id) });
    return partner || null;
  }

  async createPartner(data: Omit<PartnerUser, "id" | "createdAt" | "lastLoginAt">): Promise<PartnerUser> {
    try {
      const id = randomUUID();
      const newPartner: PartnerUser = {
        id,
        ...data,
        createdAt: new Date(),
        lastLoginAt: null,
      };
      await db.insert(partnerUsers).values(newPartner);
      return newPartner;
    } catch (error: any) {
      console.error("DB error creating partner:", error?.message || error);
      if (error?.code) console.error("DB error code:", error.code);
      if (error?.detail) console.error("DB error detail:", error.detail);
      if (error?.stack) console.error(error.stack);
      throw error;
    }
  }

  async updatePartner(id: string, data: Partial<Pick<PartnerUser, "email" | "passwordHash" | "profilePictureUrl">>): Promise<void> {
    await db.update(partnerUsers).set(data).where(eq(partnerUsers.id, id));
  }

  async updatePartnerLastLogin(id: string): Promise<void> {
    await db.update(partnerUsers).set({ lastLoginAt: new Date() }).where(eq(partnerUsers.id, id));
  }

  async getOrdersByChefId(chefId: string): Promise<Order[]> {
    const orderRecords = await db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.chefId, chefId),
          eq(orders.paymentStatus, 'confirmed')
        )
      )
      .orderBy(desc(orders.createdAt));

    return orderRecords.map(this.mapOrder);
  }

  async getPartnerDashboardMetrics(chefId: string) {
    const chefOrders = await this.getOrdersByChefId(chefId);

    const totalOrders = chefOrders.length;
    const totalRevenue = chefOrders.reduce((sum, order) => sum + order.total, 0);

    const statusCounts = chefOrders.reduce((acc, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayOrders = chefOrders.filter(order =>
      new Date(order.createdAt) >= today
    ).length;

    return {
      totalOrders,
      totalRevenue,
      pendingOrders: statusCounts.pending || 0,
      completedOrders: statusCounts.completed || 0,
      todayOrders,
      statusBreakdown: statusCounts,
    };
  }

  async getDashboardMetrics(): Promise<{
    userCount: number;
    orderCount: number;
    totalRevenue: number;
    pendingOrders: number;
    completedOrders: number;
  }> {
    const orders = await db.query.orders.findMany();
    const users = await db.query.users.findMany();
    const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
    const pendingOrders = orders.filter((o) => o.status === "pending").length;
    const completedOrders = orders.filter((o) => o.status === "delivered" || o.status === "completed").length;

    return {
      userCount: users.length,
      orderCount: orders.length,
      totalRevenue,
      pendingOrders,
      completedOrders,
    };
  }

  // Coupons
  async verifyCoupon(code: string, orderAmount: number, userId?: string): Promise<{
    code: string;
    discountAmount: number;
    discountType: string;
  } | null> {
    const coupon = await db.query.coupons.findFirst({
      where: (coupons, { eq, and }) =>
        and(eq(coupons.code, code.toUpperCase()), eq(coupons.isActive, true)),
    });

    if (!coupon) throw new Error("Invalid coupon code");

    console.log("🧾 Coupon validity check:", {
      now: new Date().toISOString(),
      validFrom: coupon.validFrom,
      validUntil: coupon.validUntil,
    });

    const now = Date.now();
    const validFrom = new Date(coupon.validFrom).getTime();
    const validUntil = new Date(coupon.validUntil).getTime();

    if (isNaN(validFrom) || isNaN(validUntil)) {
      throw new Error("Invalid coupon date format");
    }

    if (now < validFrom) throw new Error("Coupon not active yet");
    if (now > validUntil) throw new Error("Coupon has expired");

    if (orderAmount < coupon.minOrderAmount) {
      throw new Error(`Minimum order amount of ₹${coupon.minOrderAmount} required`);
    }

    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      throw new Error("Coupon usage limit reached");
    }

    // Check per-user usage limit
    if (userId && coupon.perUserLimit) {
      const userUsageCount = await db.query.couponUsages.findMany({
        where: (usages, { eq, and }) =>
          and(eq(usages.couponId, coupon.id), eq(usages.userId, userId)),
      });

      if (userUsageCount.length >= coupon.perUserLimit) {
        throw new Error(`You have already used this coupon ${coupon.perUserLimit} time(s)`);
      }
    }

    let discountAmount = 0;
    if (coupon.discountType === "percentage") {
      discountAmount = Math.floor((orderAmount * coupon.discountValue) / 100);
      if (coupon.maxDiscount && discountAmount > coupon.maxDiscount) {
        discountAmount = coupon.maxDiscount;
      }
    } else {
      discountAmount = coupon.discountValue;
    }

    return {
      code: coupon.code,
      discountAmount,
      discountType: coupon.discountType,
    };
  }

  async recordCouponUsage(code: string, userId: string, orderId?: string): Promise<void> {
    const coupon = await db.query.coupons.findFirst({
      where: (coupons, { eq }) => eq(coupons.code, code.toUpperCase()),
    });

    if (coupon) {
      // Record in coupon_usages table
      await db.insert(couponUsages).values({
        id: randomUUID(),
        couponId: coupon.id,
        userId,
        orderId: orderId || null,
        usedAt: new Date(),
      });

      // Also increment total usage count
      await db.update(coupons)
        .set({ usedCount: coupon.usedCount + 1 })
        .where(eq(coupons.code, code.toUpperCase()));
    }
  }

  async incrementCouponUsage(code: string): Promise<void> {
    const coupon = await db.query.coupons.findFirst({
      where: (coupons, { eq }) => eq(coupons.code, code.toUpperCase()),
    });

    if (coupon) {
      await db.update(coupons)
        .set({ usedCount: coupon.usedCount + 1 })
        .where(eq(coupons.code, code.toUpperCase()));
    }
  }

  async getCouponUserUsage(couponId: string, userId: string): Promise<number> {
    const usages = await db.query.couponUsages.findMany({
      where: (usages, { eq, and }) =>
        and(eq(usages.couponId, couponId), eq(usages.userId, userId)),
    });
    return usages.length;
  }

  async getCouponByCode(code: string): Promise<{
    id: string;
    code: string;
    discountType: "percentage" | "fixed";
    discountValue: number;
    minOrderAmount: number;
    maxDiscountAmount: number | null;
    usageLimit: number | null;
    usedCount: number;
    perUserLimit: number | null;
    isActive: boolean;
    expiryDate: Date | null;
    validFrom: Date;
  } | null> {
    const coupon = await db.query.coupons.findFirst({
      where: (coupons, { eq }) => eq(coupons.code, code.toUpperCase()),
    });
    if (!coupon) return null;
    return {
      id: coupon.id,
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      minOrderAmount: coupon.minOrderAmount,
      maxDiscountAmount: coupon.maxDiscount,
      usageLimit: coupon.usageLimit,
      usedCount: coupon.usedCount,
      perUserLimit: coupon.perUserLimit,
      isActive: coupon.isActive,
      expiryDate: coupon.validUntil,
      validFrom: coupon.validFrom,
    };
  }

  // Subscription Plans
  async getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    return db.query.subscriptionPlans.findMany();
  }

  async getSubscriptionPlan(id: string): Promise<SubscriptionPlan | undefined> {
    return db.query.subscriptionPlans.findFirst({ where: (sp, { eq }) => eq(sp.id, id) });
  }

  async createSubscriptionPlan(data: Omit<SubscriptionPlan, "id" | "createdAt" | "updatedAt">): Promise<SubscriptionPlan> {
    const id = randomUUID();
    const plan: SubscriptionPlan = {
      ...data,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await db.insert(subscriptionPlans).values(plan);
    return plan;
  }

  async updateSubscriptionPlan(id: string, data: Partial<SubscriptionPlan>): Promise<SubscriptionPlan | undefined> {
    await db.update(subscriptionPlans).set({ ...data, updatedAt: new Date() }).where(eq(subscriptionPlans.id, id));
    return this.getSubscriptionPlan(id);
  }

  async deleteSubscriptionPlan(id: string): Promise<void> {
    await db.delete(subscriptionPlans).where(eq(subscriptionPlans.id, id));
  }

  // Subscriptions
  async getSubscriptions(): Promise<Subscription[]> {
    return db.query.subscriptions.findMany();
  }

  async getSubscription(id: string): Promise<Subscription | undefined> {
    return db.query.subscriptions.findFirst({ where: (s, { eq }) => eq(s.id, id) });
  }

  async createSubscription(data: Omit<Subscription, "id" | "createdAt" | "updatedAt">): Promise<Subscription> {
    const id = randomUUID();
    const subscription: Subscription = {
      ...data,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await db.insert(subscriptions).values(subscription);
    return subscription;
  }

  async updateSubscription(id: string, data: Partial<Subscription>): Promise<Subscription | undefined> {
    await db.update(subscriptions).set({ ...data, updatedAt: new Date() }).where(eq(subscriptions.id, id));
    return this.getSubscription(id);
  }

  async deleteSubscription(id: string): Promise<boolean> {
    await db.delete(subscriptions).where(eq(subscriptions.id, id));
    return true;
  }

  async getSubscriptionsByUserId(userId: string): Promise<Subscription[]> {
    return db.query.subscriptions.findMany({ where: (s, { eq }) => eq(s.userId, userId) });
  }

  // Get active subscriptions count for a chef
  async getActiveSubscriptionCountByChef(chefId: string): Promise<number> {
    const result = await db.query.subscriptions.findMany({
      where: (s, { and, eq }) => and(
        eq(s.chefId, chefId),
        eq(s.status, "active")
      ),
    });
    return result.length;
  }

  // Find the best available chef for a category (load balancing)
  async findBestChefForCategory(categoryId: string): Promise<Chef | null> {
    // Get all active chefs for this category
    const activeChefs = await db.query.chefs.findMany({
      where: (c, { and, eq }) => and(
        eq(c.categoryId, categoryId),
        eq(c.isActive, true)
      ),
    });

    if (activeChefs.length === 0) {
      return null;
    }

    // Find the chef with the least number of active subscriptions
    let bestChef = activeChefs[0];
    let minSubscriptions = await this.getActiveSubscriptionCountByChef(activeChefs[0].id);

    for (let i = 1; i < activeChefs.length; i++) {
      const chef = activeChefs[i];
      const subCount = await this.getActiveSubscriptionCountByChef(chef.id);
      if (subCount < minSubscriptions) {
        minSubscriptions = subCount;
        bestChef = chef;
      }
    }

    return bestChef;
  }

  // Assign chef to subscription
  async assignChefToSubscription(subscriptionId: string, chefId: string): Promise<Subscription | undefined> {
    return this.updateSubscription(subscriptionId, {
      chefId,
      chefAssignedAt: new Date(),
    });
  }

  // Get active subscriptions by chef
  async getActiveSubscriptionsByChef(chefId: string): Promise<Subscription[]> {
    return db.query.subscriptions.findMany({
      where: (s, { and, eq }) => and(
        eq(s.chefId, chefId),
        eq(s.status, "active")
      ),
    });
  }

  // Subscription Delivery Logs
  async getSubscriptionDeliveryLogs(subscriptionId: string): Promise<SubscriptionDeliveryLog[]> {
    return db.query.subscriptionDeliveryLogs.findMany({
      where: (log, { eq }) => eq(log.subscriptionId, subscriptionId),
      orderBy: (log, { desc }) => [desc(log.date)],
    });
  }

  async getSubscriptionDeliveryLogsByDate(date: Date): Promise<SubscriptionDeliveryLog[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return db.query.subscriptionDeliveryLogs.findMany({
      where: (log, { and, gte, lte }) => and(
        gte(log.date, startOfDay),
        lte(log.date, endOfDay)
      ),
    });
  }

  async getSubscriptionDeliveryLog(id: string): Promise<SubscriptionDeliveryLog | undefined> {
    return db.query.subscriptionDeliveryLogs.findFirst({ where: (log, { eq }) => eq(log.id, id) });
  }

  async createSubscriptionDeliveryLog(data: Omit<SubscriptionDeliveryLog, "id" | "createdAt" | "updatedAt">): Promise<SubscriptionDeliveryLog> {
    const id = randomUUID();
    const log: SubscriptionDeliveryLog = {
      ...data,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await db.insert(subscriptionDeliveryLogs).values(log);
    return log;
  }

  async updateSubscriptionDeliveryLog(id: string, data: Partial<SubscriptionDeliveryLog>): Promise<SubscriptionDeliveryLog | undefined> {
    await db.update(subscriptionDeliveryLogs).set({ ...data, updatedAt: new Date() }).where(eq(subscriptionDeliveryLogs.id, id));
    return this.getSubscriptionDeliveryLog(id);
  }

  async deleteSubscriptionDeliveryLog(id: string): Promise<void> {
    await db.delete(subscriptionDeliveryLogs).where(eq(subscriptionDeliveryLogs.id, id));
  }

  async getDeliveryLogBySubscriptionAndDate(subscriptionId: string, date: Date): Promise<SubscriptionDeliveryLog | undefined> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return db.query.subscriptionDeliveryLogs.findFirst({
      where: (log, { and, eq, gte, lte }) => and(
        eq(log.subscriptionId, subscriptionId),
        gte(log.date, startOfDay),
        lte(log.date, endOfDay)
      ),
    });
  }

  async getSalesReport(from: Date, to: Date) {
    const allOrders = await db.query.orders.findMany();
    const filteredOrders = allOrders.filter(o => {
      const createdAt = new Date(o.createdAt);
      return createdAt >= from && createdAt <= to;
    });

    const totalRevenue = filteredOrders.reduce((sum, order) => sum + order.total, 0);
    const totalOrders = filteredOrders.length;
    const averageOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

    const productSales = new Map<string, { name: string; quantity: number; revenue: number }>();
    for (const order of filteredOrders) {
      for (const item of order.items as any[]) {
        const existing = productSales.get(item.id) || { name: item.name, quantity: 0, revenue: 0 };
        productSales.set(item.id, {
          name: item.name,
          quantity: existing.quantity + item.quantity,
          revenue: existing.revenue + (item.price * item.quantity),
        });
      }
    }

    const topProducts = Array.from(productSales.entries())
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    return {
      totalRevenue,
      totalOrders,
      averageOrderValue,
      topProducts,
      revenueChange: 0,
      ordersChange: 0,
    };
  }

  async getUserReport(from: Date, to: Date) {
    const allUsers = await db.query.users.findMany();
    const newUsers = allUsers.filter(u => u.createdAt && new Date(u.createdAt) >= from && new Date(u.createdAt) <= to);

    const topCustomers: any[] = [];

    return {
      totalUsers: allUsers.length,
      newUsers: newUsers.length,
      activeUsers: 0,
      userGrowth: 0,
      topCustomers,
    };
  }

  async getInventoryReport() {
    const allProducts = await db.query.products.findMany();
    const allCategories = await db.query.categories.findMany();

    const categoryStats = allCategories.map(cat => {
      const catProducts = allProducts.filter(p => p.categoryId === cat.id);
      return {
        name: cat.name,
        productCount: catProducts.length,
        revenue: 0,
      };
    });

    return {
      totalProducts: allProducts.length,
      lowStock: 0,
      outOfStock: 0,
      categories: categoryStats,
    };
  }

  async getSubscriptionReport(from: Date, to: Date) {
    const subs = await db.select().from(subscriptions);
    const plans = await db.select().from(subscriptionPlans);

    const planStats = plans.map(plan => {
      const planSubs = subs.filter(s => s.planId === plan.id);
      return {
        id: plan.id,
        name: plan.name,
        subscriberCount: planSubs.length,
        revenue: planSubs.length * plan.price,
      };
    });

    return {
      totalSubscriptions: subs.length,
      activeSubscriptions: subs.filter(s => s.status === 'active').length,
      pausedSubscriptions: subs.filter(s => s.status === 'paused').length,
      cancelledSubscriptions: subs.filter(s => s.status === 'cancelled').length,
      subscriptionRevenue: planStats.reduce((sum, p) => sum + p.revenue, 0),
      topPlans: planStats.sort((a, b) => b.revenue - a.revenue).slice(0, 5),
    };
  }

  async getDeliverySettings(): Promise<DeliverySetting[]> {
    return db.query.deliverySettings.findMany({ where: (ds, { eq }) => eq(ds.isActive, true) });
  }

  async getDeliverySetting(id: string): Promise<DeliverySetting | undefined> {
    return db.query.deliverySettings.findFirst({ where: (ds, { eq }) => eq(ds.id, id) });
  }

  async createDeliverySetting(data: Omit<DeliverySetting, "id" | "createdAt" | "updatedAt">): Promise<DeliverySetting> {
    const id = randomUUID();
    const setting: DeliverySetting = {
      ...data,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await db.insert(deliverySettings).values(setting);
    return setting;
  }

  async updateDeliverySetting(id: string, data: Partial<DeliverySetting>): Promise<DeliverySetting | undefined> {
    await db.update(deliverySettings).set({ ...data, updatedAt: new Date() }).where(eq(deliverySettings.id, id));
    return this.getDeliverySetting(id);
  }

  async deleteDeliverySetting(id: string): Promise<void> {
    await db.delete(deliverySettings).where(eq(deliverySettings.id, id));
  }

  async getCartSettings(): Promise<CartSetting[]> {
    return db.query.cartSettings.findMany({ where: (cs, { eq }) => eq(cs.isActive, true) });
  }

  async getCartSettingByCategoryId(categoryId: string): Promise<CartSetting | undefined> {
    return db.query.cartSettings.findFirst({ where: (cs, { eq }) => eq(cs.categoryId, categoryId) });
  }

  async createCartSetting(data: Omit<CartSetting, "id" | "createdAt" | "updatedAt">): Promise<CartSetting> {
    const id = randomUUID();

    // Fetch category name if not provided
    let categoryName = data.categoryName;
    if (!categoryName) {
      const category = await this.getCategoryById(data.categoryId);
      if (!category) {
        throw new Error("Category not found");
      }
      categoryName = category.name;
    }

    const setting: CartSetting = {
      ...data,
      categoryName,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await db.insert(cartSettings).values(setting);
    return setting;
  }

  async updateCartSetting(id: string, data: Partial<CartSetting>): Promise<CartSetting | undefined> {
    // If categoryId is being updated, fetch and update categoryName too
    let updateData = { ...data };
    if (data.categoryId && !data.categoryName) {
      const category = await this.getCategoryById(data.categoryId);
      if (category) {
        updateData.categoryName = category.name;
      }
    }

    await db.update(cartSettings).set({ ...updateData, updatedAt: new Date() }).where(eq(cartSettings.id, id));
    return db.query.cartSettings.findFirst({ where: (cs, { eq }) => eq(cs.id, id) });
  }

  async deleteCartSetting(id: string): Promise<void> {
    await db.delete(cartSettings).where(eq(cartSettings.id, id));
  }

  async getDeliveryPersonnelByPhone(phone: string): Promise<DeliveryPersonnel | undefined> {
    return db.query.deliveryPersonnel.findFirst({ where: (dp, { eq }) => eq(dp.phone, phone) });
  }

  async getDeliveryPersonnelById(id: string): Promise<DeliveryPersonnel | undefined> {
    return db.query.deliveryPersonnel.findFirst({ where: (dp, { eq }) => eq(dp.id, id) });
  }

  async getDeliveryPersonnel(id: string): Promise<DeliveryPersonnel | undefined> {
    return this.getDeliveryPersonnelById(id);
  }

  async getAllDeliveryPersonnel(): Promise<DeliveryPersonnel[]> {
    return db.query.deliveryPersonnel.findMany();
  }

  async getAvailableDeliveryPersonnel(): Promise<DeliveryPersonnel[]> {
    // Return all active delivery personnel regardless of status
    // Admin can assign to any active personnel
    return db.query.deliveryPersonnel.findMany({
      where: (dp, { eq }) => eq(dp.isActive, true),
      orderBy: (dp, { asc }) => [asc(dp.status)] // Show "available" first
    });
  }

  async createDeliveryPersonnel(data: InsertDeliveryPersonnel & { passwordHash: string }): Promise<DeliveryPersonnel> {
    const id = randomUUID();
    const deliveryPerson: DeliveryPersonnel = {
      id,
      name: data.name,
      phone: data.phone,
      email: data.email || null,
      passwordHash: data.passwordHash,
      status: data.status || "available",
      currentLocation: data.currentLocation || null,
      isActive: true,
      totalDeliveries: 0,
      rating: "5.0",
      createdAt: new Date(),
      lastLoginAt: null,
    };
    await db.insert(deliveryPersonnel).values(deliveryPerson);
    return deliveryPerson;
  }

  async updateDeliveryPersonnel(id: string, data: Partial<DeliveryPersonnel>): Promise<DeliveryPersonnel | undefined> {
    await db.update(deliveryPersonnel).set(data).where(eq(deliveryPersonnel.id, id));
    return this.getDeliveryPersonnelById(id);
  }

  async updateDeliveryPersonnelLastLogin(id: string): Promise<void> {
    await db.update(deliveryPersonnel).set({ lastLoginAt: new Date() }).where(eq(deliveryPersonnel.id, id));
  }

  async deleteDeliveryPersonnel(id: string): Promise<boolean> {
    await db.delete(deliveryPersonnel).where(eq(deliveryPersonnel.id, id));
    return true;
  }

  async getAllPartners(): Promise<PartnerUser[]> {
    return await db.select().from(partnerUsers);
  }

  async deletePartner(id: string): Promise<boolean> {
    await db.delete(partnerUsers).where(eq(partnerUsers.id, id));
    return true;
  }

  async approveOrder(orderId: string, approvedBy: string): Promise<Order | undefined> {
    const [order] = await db
      .update(orders)
      .set({
        status: "approved",
        approvedBy,
        approvedAt: new Date()
      })
      .where(eq(orders.id, orderId))
      .returning();
    return order;
  }

  async acceptOrder(orderId: string, approvedBy: string): Promise<Order | undefined> {
    const [order] = await db
      .update(orders)
      .set({
        status: "confirmed",
        paymentStatus: "confirmed",
        approvedBy,
        approvedAt: new Date()
      })
      .where(eq(orders.id, orderId))
      .returning();
    return order;
  }

  async rejectOrder(orderId: string, rejectedBy: string, reason: string): Promise<Order | undefined> {
    const [order] = await db
      .update(orders)
      .set({
        status: "rejected",
        rejectedBy,
        rejectionReason: reason
      })
      .where(eq(orders.id, orderId))
      .returning();
    return order;
  }

  async assignOrderToDeliveryPerson(orderId: string, deliveryPersonId: string): Promise<Order | undefined> {
    try {
      // Get delivery person details
      const deliveryPerson = await this.getDeliveryPersonnelById(deliveryPersonId);
      if (!deliveryPerson) {
        throw new Error("Delivery person not found");
      }

      console.log(`📦 Assigning order ${orderId} to delivery person ${deliveryPerson.name} (${deliveryPerson.phone})`);

      const [updatedOrder] = await db
        .update(orders)
        .set({
          assignedTo: deliveryPersonId,
          assignedAt: new Date(),
          deliveryPersonName: deliveryPerson.name,
          deliveryPersonPhone: deliveryPerson.phone
        })
        .where(eq(orders.id, orderId))
        .returning();

      if (!updatedOrder) {
        throw new Error("Failed to update order");
      }

      // Update delivery person status to busy
      await db.update(deliveryPersonnel).set({ status: "busy" }).where(eq(deliveryPersonnel.id, deliveryPersonId));

      console.log(`✅ Order ${orderId} assigned successfully. Delivery person: ${deliveryPerson.name} (${deliveryPerson.phone})`);
      console.log(`✅ Updated order fields - deliveryPersonName: ${updatedOrder.deliveryPersonName}, deliveryPersonPhone: ${updatedOrder.deliveryPersonPhone}`);

      // Return the mapped order to ensure all fields are properly formatted
      return this.mapOrder(updatedOrder);
    } catch (error) {
      console.error("Error assigning order to delivery person:", error);
      throw error;
    }
  }

  async updateOrderPickup(orderId: string): Promise<Order | undefined> {
    const [order] = await db
      .update(orders)
      .set({
        status: "out_for_delivery",
        pickedUpAt: new Date(),
      })
      .where(eq(orders.id, orderId))
      .returning();
    return order;
  }

  async updateOrderDelivery(orderId: string): Promise<Order | undefined> {
    const order = await this.getOrderById(orderId);
    if (!order) return undefined;

    const [updatedOrder] = await db
      .update(orders)
      .set({
        status: "delivered",
        deliveredAt: new Date()
      })
      .where(eq(orders.id, orderId))
      .returning();

    if (order.assignedTo) {
      await db.update(deliveryPersonnel)
        .set({
          status: "available",
          totalDeliveries: sql`${deliveryPersonnel.totalDeliveries} + 1`
        })
        .where(eq(deliveryPersonnel.id, order.assignedTo));
    }

    return updatedOrder;
  }

  async getOrdersByDeliveryPerson(deliveryPersonId: string): Promise<Order[]> {
    const orderRecords = await db
      .select()
      .from(orders)
      .where(
        or(
          eq(orders.assignedTo, deliveryPersonId),
          and(
            eq(orders.status, 'out_for_delivery'),
            isNull(orders.assignedTo)
          )
        )
      )
      .orderBy(desc(orders.createdAt));

    return orderRecords.map(this.mapOrder);
  }

  async getAdminDashboardMetrics(): Promise<{ partnerCount: number; deliveryPersonnelCount: number }> {
    const partners = await db.select().from(partnerUsers);
    const delivery = await db.select().from(deliveryPersonnel);

    return {
      partnerCount: partners.length,
      deliveryPersonnelCount: delivery.length,
    };
  }

  async generateReferralCode(userId: string): Promise<string> {
    const code = `REF${nanoid(8).toUpperCase()}`;
    await db.update(users).set({ referralCode: code }).where(eq(users.id, userId));
    return code;
  }

  async createReferral(referrerId: string, referredId: string): Promise<any> {
    const referrer = await this.getUser(referrerId);
    if (!referrer?.referralCode) {
      throw new Error("Referrer does not have a referral code");
    }

    const referral = {
      referrerId,
      referredId,
      referralCode: referrer.referralCode,
      status: "pending",
      referrerBonus: 100, // ₹100 for referrer
      referredBonus: 50,  // ₹50 for new user
      referredOrderCompleted: false,
    };

    const [created] = await db.insert(referrals).values(referral).returning();
    return created;
  }

  async applyReferralBonus(referralCode: string, newUserId: string): Promise<void> {
    // Execute entire referral bonus application in a database transaction
    await db.transaction(async (tx) => {
      const referrer = await tx.query.users.findFirst({
        where: (u, { eq }) => eq(u.referralCode, referralCode),
      });

      if (!referrer) {
        throw new Error("Invalid referral code");
      }

      // Self-referral prevention
      if (referrer.id === newUserId) {
        throw new Error("You cannot use your own referral code");
      }

      const newUser = await tx.query.users.findFirst({
        where: (u, { eq }) => eq(u.id, newUserId),
      });

      if (!newUser) {
        throw new Error("User not found");
      }

      // Check if user already used a referral
      const existingReferral = await tx.query.referrals.findFirst({
        where: (r, { eq }) => eq(r.referredId, newUserId),
      });

      if (existingReferral) {
        throw new Error("User already used a referral code");
      }

      // Get referral settings
      const settings = await this.getActiveReferralReward();
      const referrerBonus = settings?.referrerBonus || 50;
      const referredBonus = settings?.referredBonus || 50;
      const maxReferralsPerMonth = settings?.maxReferralsPerMonth || 10;
      const maxEarningsPerMonth = settings?.maxEarningsPerMonth || 500;

      // Check monthly referral limit for referrer
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const monthlyReferrals = await tx.query.referrals.findMany({
        where: (r, { and, eq: eqOp, gte: gteOp }) => and(
          eqOp(r.referrerId, referrer.id),
          gteOp(r.createdAt, startOfMonth)
        ),
      });

      if (monthlyReferrals.length >= maxReferralsPerMonth) {
        throw new Error(`Referrer has reached the monthly limit of ${maxReferralsPerMonth} referrals`);
      }

      // Check monthly earnings cap for referrer
      const completedThisMonth = monthlyReferrals.filter(r => r.status === "completed");
      const monthlyEarnings = completedThisMonth.reduce((sum, r) => sum + r.referrerBonus, 0);

      if (monthlyEarnings >= maxEarningsPerMonth) {
        throw new Error(`Referrer has reached the monthly earnings cap of ₹${maxEarningsPerMonth}`);
      }

      // Create referral record (pending state until first order)
      const referralData = {
        referrerId: referrer.id,
        referredId: newUserId,
        referralCode: referrer.referralCode!,
        status: "pending",
        referrerBonus: referrerBonus,
        referredBonus: referredBonus,
        referredOrderCompleted: false,
      };

      const [referral] = await tx.insert(referrals).values(referralData).returning();

      // Give instant bonus to new user with proper wallet transaction
      await this.createWalletTransaction({
        userId: newUserId,
        amount: referredBonus,
        type: "referral_bonus",
        description: `Welcome bonus for using ${referrer.name}'s referral code (${referralCode})`,
        referenceId: referral.id,
        referenceType: "referral",
      }, tx);
    });
  }

  // Complete referral when referred user places first order
  async completeReferralOnFirstOrder(userId: string, orderId: string): Promise<void> {
    await db.transaction(async (tx) => {
      // Find pending referral for this user
      const referral = await tx.query.referrals.findFirst({
        where: (r, { and, eq: eqOp }) => and(
          eqOp(r.referredId, userId),
          eqOp(r.status, "pending")
        ),
      });

      if (!referral) {
        return; // No pending referral, nothing to do
      }

      // Get referral settings for validation
      const settings = await this.getActiveReferralReward();
      const expiryDays = settings?.expiryDays || 30;
      const maxEarningsPerMonth = settings?.maxEarningsPerMonth || 500;

      // Check if referral has expired
      const referralDate = new Date(referral.createdAt);
      const expiryDate = new Date(referralDate);
      expiryDate.setDate(expiryDate.getDate() + expiryDays);

      if (new Date() > expiryDate) {
        // Mark as expired
        await tx.update(referrals)
          .set({ status: "expired" })
          .where(eq(referrals.id, referral.id));
        return;
      }

      // Check monthly earnings cap before crediting
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const completedThisMonth = await tx.query.referrals.findMany({
        where: (r, { and, eq: eqOp, gte: gteOp }) => and(
          eqOp(r.referrerId, referral.referrerId),
          eqOp(r.status, "completed"),
          gteOp(r.createdAt, startOfMonth)
        ),
      });

      const monthlyEarnings = completedThisMonth.reduce((sum, r) => sum + r.referrerBonus, 0);
      const canCreditBonus = monthlyEarnings + referral.referrerBonus <= maxEarningsPerMonth;

      if (canCreditBonus) {
        // Credit referrer bonus
        await this.createWalletTransaction({
          userId: referral.referrerId,
          amount: referral.referrerBonus,
          type: "referral_bonus",
          description: `Referral bonus - friend completed first order`,
          referenceId: referral.id,
          referenceType: "referral",
        }, tx);
      }

      // Mark referral as completed
      await tx.update(referrals)
        .set({
          status: "completed",
          referredOrderCompleted: true,
          completedAt: new Date(),
          referrerBonus: canCreditBonus ? referral.referrerBonus : 0,
        })
        .where(eq(referrals.id, referral.id));
    });
  }

  async getReferralsByUser(userId: string): Promise<any[]> {
    return db.query.referrals.findMany({
      where: (r, { eq }) => eq(r.referrerId, userId),
    });
  }

  async getReferralByReferredId(referredId: string): Promise<any | null> {
    const referral = await db.query.referrals.findFirst({
      where: (r, { eq }) => eq(r.referredId, referredId),
    });
    return referral || null;
  }

  async getUserWalletBalance(userId: string): Promise<number> {
    const user = await this.getUser(userId);
    return user?.walletBalance || 0;
  }

  async updateWalletBalance(userId: string, amount: number): Promise<void> {
    await db.update(users)
      .set({ walletBalance: sql`${users.walletBalance} + ${amount}` })
      .where(eq(users.id, userId));
  }

  async createWalletTransaction(transaction: {
    userId: string;
    amount: number;
    type: "credit" | "debit" | "referral_bonus" | "order_discount";
    description: string;
    referenceId?: string;
    referenceType?: string;
  }, txClient?: any): Promise<void> {
    // Validate amount is positive
    if (transaction.amount <= 0) {
      throw new Error("Transaction amount must be positive");
    }

    // Use provided transaction client or default db
    const dbClient = txClient || db;

    // Fetch user using the same transaction client to ensure atomic reads
    const user = await dbClient.query.users.findFirst({
      where: eq(users.id, transaction.userId),
    });

    if (!user) throw new Error("User not found");

    const balanceBefore = user.walletBalance;
    const amountChange = transaction.type === "debit" ? -transaction.amount : transaction.amount;
    const balanceAfter = balanceBefore + amountChange;

    if (balanceAfter < 0) {
      throw new Error("Insufficient wallet balance");
    }

    // Execute both operations atomically with the same client
    await dbClient.insert(walletTransactions).values({
      userId: transaction.userId,
      amount: transaction.amount,
      type: transaction.type,
      description: transaction.description,
      referenceId: transaction.referenceId || null,
      referenceType: transaction.referenceType || null,
      balanceBefore,
      balanceAfter,
    });

    // Update user's wallet balance using the same transaction client
    await dbClient.update(users)
      .set({ walletBalance: balanceAfter })
      .where(eq(users.id, transaction.userId));
  }

  async getWalletTransactions(userId: string, limit: number = 50): Promise<any[]> {
    return db.query.walletTransactions.findMany({
      where: (t, { eq }) => eq(t.userId, userId),
      orderBy: (t, { desc }) => [desc(t.createdAt)],
      limit,
    });
  }

  async getReferralStats(userId: string): Promise<{
    totalReferrals: number;
    pendingReferrals: number;
    completedReferrals: number;
    totalEarnings: number;
    referralCode: string;
  }> {
    const user = await this.getUser(userId);
    const referralCode = user?.referralCode || "";

    const allReferrals = await db.query.referrals.findMany({
      where: (r, { eq }) => eq(r.referrerId, userId),
    });

    const totalReferrals = allReferrals.length;
    const pendingReferrals = allReferrals.filter(r => r.status === "pending").length;
    const completedReferrals = allReferrals.filter(r => r.status === "completed").length;
    const totalEarnings = allReferrals
      .filter(r => r.status === "completed")
      .reduce((sum, r) => sum + r.referrerBonus, 0);

    return {
      totalReferrals,
      pendingReferrals,
      completedReferrals,
      totalEarnings,
      referralCode,
    };
  }

  async getUserReferralCode(userId: string): Promise<string | null> {
    const user = await this.getUser(userId);
    return user?.referralCode || null;
  }

  async markReferralComplete(referralId: string): Promise<void> {
    await db.update(referrals)
      .set({ status: "completed", completedAt: new Date() })
      .where(eq(referrals.id, referralId));
  }

  async checkReferralEligibility(userId: string): Promise<{ eligible: boolean; reason?: string }> {
    // Check if user has completed their first order
    const userOrders = await this.getOrdersByUserId(userId);
    const completedOrders = userOrders.filter(o => o.status === "delivered");

    if (completedOrders.length > 0) {
      return { eligible: false, reason: "User has already completed an order" };
    }

    // Check if user was referred
    const referral = await db.query.referrals.findFirst({
      where: (r, { eq }) => eq(r.referredId, userId),
    });

    if (!referral) {
      return { eligible: false, reason: "User was not referred" };
    }

    if (referral.status === "completed") {
      return { eligible: false, reason: "Referral bonus already claimed" };
    }

    return { eligible: true };
  }

  // Promotional Banners
  async getAllPromotionalBanners(): Promise<PromotionalBanner[]> {
    return db.query.promotionalBanners.findMany({ orderBy: [desc(promotionalBanners.displayOrder)] });
  }

  async getActivePromotionalBanners(): Promise<PromotionalBanner[]> {
    return db.query.promotionalBanners.findMany({
      where: eq(promotionalBanners.isActive, true),
      orderBy: [asc(promotionalBanners.displayOrder)], // Ensure they display in order
    });
  }

  async createPromotionalBanner(data: InsertPromotionalBanner): Promise<PromotionalBanner> {
    const id = randomUUID();
    const banner: PromotionalBanner = {
      id,
      title: data.title,
      subtitle: data.subtitle,
      buttonText: data.buttonText,
      gradientFrom: data.gradientFrom ?? "orange-600",
      gradientVia: data.gradientVia ?? "amber-600",
      gradientTo: data.gradientTo ?? "yellow-600",
      emoji1: data.emoji1 ?? "🍽️",
      emoji2: data.emoji2 ?? "🥘",
      emoji3: data.emoji3 ?? "🍛",
      actionType: data.actionType ?? "subscription",
      actionValue: data.actionValue ?? null,
      isActive: data.isActive ?? true,
      displayOrder: data.displayOrder ?? 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const [createdBanner] = await db.insert(promotionalBanners).values(banner).returning();
    return createdBanner;
  }

  async updatePromotionalBanner(id: string, data: Partial<InsertPromotionalBanner>): Promise<PromotionalBanner | null> {
    const [updated] = await db.update(promotionalBanners)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(promotionalBanners.id, id))
      .returning();
    return updated || null;
  }

  async deletePromotionalBanner(id: string): Promise<boolean> {
    const result = await db.delete(promotionalBanners)
      .where(eq(promotionalBanners.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Delivery Time Slots
  async getAllDeliveryTimeSlots(): Promise<DeliveryTimeSlot[]> {
    return db.query.deliveryTimeSlots.findMany({
      orderBy: (slot, { asc }) => [asc(slot.startTime)]
    });
  }

  async getActiveDeliveryTimeSlots(): Promise<DeliveryTimeSlot[]> {
    return db.query.deliveryTimeSlots.findMany({
      where: (slot, { eq }) => eq(slot.isActive, true),
      orderBy: (slot, { asc }) => [asc(slot.startTime)]
    });
  }

  async getDeliveryTimeSlot(id: string): Promise<DeliveryTimeSlot | undefined> {
    return db.query.deliveryTimeSlots.findFirst({ where: (slot, { eq }) => eq(slot.id, id) });
  }

  async getDeliveryTimeSlotById(id: string): Promise<DeliveryTimeSlot | undefined> {
    return db.query.deliveryTimeSlots.findFirst({ where: (slot, { eq }) => eq(slot.id, id) });
  }

  async createDeliveryTimeSlot(data: InsertDeliveryTimeSlot): Promise<DeliveryTimeSlot> {
    const id = randomUUID();
    const slot: DeliveryTimeSlot = {
      id,
      ...data,
      cutoffHoursBefore: data.cutoffHoursBefore ?? null,
      currentOrders: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const [created] = await db.insert(deliveryTimeSlots).values(slot).returning();
    return created;
  }

  async updateDeliveryTimeSlot(id: string, data: Partial<InsertDeliveryTimeSlot>): Promise<DeliveryTimeSlot | undefined> {
    const [updated] = await db.update(deliveryTimeSlots)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(deliveryTimeSlots.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteDeliveryTimeSlot(id: string): Promise<boolean> {
    const result = await db.delete(deliveryTimeSlots).where(eq(deliveryTimeSlots.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  private mapOrder(order: any): Order {
    return {
      ...order,
      items: typeof order.items === 'string' ? JSON.parse(order.items) : order.items,
      createdAt: new Date(order.createdAt),
      updatedAt: order.updatedAt ? new Date(order.updatedAt) : null,
      deliveredAt: order.deliveredAt ? new Date(order.deliveredAt) : null,
      pickedUpAt: order.pickedUpAt ? new Date(order.pickedUpAt) : null,
      approvedAt: order.approvedAt ? new Date(order.approvedAt) : null,
      assignedAt: order.assignedAt ? new Date(order.assignedAt) : null,
    };
  }

  // Referral Rewards Settings
  async getAllReferralRewards(): Promise<ReferralReward[]> {
    return db.query.referralRewards.findMany({
      orderBy: (rr, { desc }) => [desc(rr.createdAt)]
    });
  }

  async getActiveReferralReward(): Promise<ReferralReward | undefined> {
    return db.query.referralRewards.findFirst({
      where: (rr, { eq }) => eq(rr.isActive, true),
      orderBy: (rr, { desc }) => [desc(rr.createdAt)]
    });
  }

  async createReferralReward(data: Omit<ReferralReward, "id" | "createdAt" | "updatedAt">): Promise<ReferralReward> {
    const id = randomUUID();
    const reward: ReferralReward = {
      id,
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const [created] = await db.insert(referralRewards).values(reward).returning();
    return created;
  }

  async updateReferralReward(id: string, data: Partial<ReferralReward>): Promise<ReferralReward | undefined> {
    const [updated] = await db.update(referralRewards)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(referralRewards.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteReferralReward(id: string): Promise<boolean> {
    const result = await db.delete(referralRewards).where(eq(referralRewards.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Get all coupons (for admin)
  async getAllCoupons(): Promise<Coupon[]> {
    return db.query.coupons.findMany({
      orderBy: (c, { desc }) => [desc(c.createdAt)]
    });
  }

  // Create coupon
  async createCoupon(data: any): Promise<Coupon> {
    const id = randomUUID();
    const coupon = {
      id,
      ...data,
      usedCount: 0,
      createdAt: new Date(),
    };
    const [created] = await db.insert(coupons).values(coupon).returning();
    return created;
  }

  // Delete coupon
  async deleteCoupon(id: string): Promise<boolean> {
    const result = await db.delete(coupons).where(eq(coupons.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Update coupon
  async updateCoupon(id: string, data: Partial<Coupon>): Promise<Coupon | undefined> {
    const [updated] = await db.update(coupons)
      .set({ ...data })
      .where(eq(coupons.id, id))
      .returning();
    return updated || undefined;
  }

  // ================= NEW REFERRAL MANAGEMENT METHODS =================

  // Get all referrals
  async getAllReferrals(): Promise<any[]> {
    return db.query.referrals.findMany({
      orderBy: (r, { desc }) => [desc(r.createdAt)]
    });
  }

  // Get referral by ID
  async getReferralById(id: string): Promise<any | undefined> {
    return db.query.referrals.findFirst({
      where: (r, { eq: equals }) => equals(r.id, id)
    });
  }

  // Update referral status
  async updateReferralStatus(id: string, status: string, referrerBonus: number, referredBonus: number): Promise<void> {
    await db.update(referrals)
      .set({
        status,
        referrerBonus,
        referredBonus,
        referredOrderCompleted: status === "completed",
        completedAt: status === "completed" ? new Date() : null,
      })
      .where(eq(referrals.id, id));
  }

  // ================= NEW WALLET TRANSACTION METHODS =================

  // Get all wallet transactions (for admin)
  async getAllWalletTransactions(dateFilter?: string): Promise<WalletTransaction[]> {
    if (dateFilter) {
      const filterDate = new Date(dateFilter);
      const startOfDay = new Date(filterDate.setHours(0, 0, 0, 0));
      const endOfDay = new Date(filterDate.setHours(23, 59, 59, 999));

      return db.query.walletTransactions.findMany({
        where: (wt, { and, gte: gteOp, lte: lteOp }) => and(
          gteOp(wt.createdAt, startOfDay),
          lteOp(wt.createdAt, endOfDay)
        ),
        orderBy: (wt, { desc }) => [desc(wt.createdAt)]
      });
    }

    return db.query.walletTransactions.findMany({
      orderBy: (wt, { desc }) => [desc(wt.createdAt)],
      limit: 500
    });
  }
}

export const storage = new MemStorage();