import { type Category, type InsertCategory, type Product, type InsertProduct, type Order, type InsertOrder, type User, type UpsertUser, type Chef, type AdminUser, type InsertAdminUser, type PartnerUser, type Subscription, type SubscriptionPlan, type DeliverySetting, type InsertDeliverySetting, type DeliveryPersonnel, type InsertDeliveryPersonnel } from "@shared/schema";
import { randomUUID } from "crypto";
import { nanoid } from "nanoid";
import { eq, and, gte, lte } from "drizzle-orm";
import { db, sql, users, categories, products, orders, chefs, adminUsers, partnerUsers, subscriptions, subscriptionPlans, deliverySettings, deliveryPersonnel } from "@shared/db";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUser(id: string, user: Partial<UpsertUser>): Promise<User | undefined>;
  deleteUser(id: string): Promise<boolean>;

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
  getChefsByCategory(categoryId: string): Promise<Chef[]>;
  getChefById(id: string): Promise<Chef | null>;
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
  updatePartnerLastLogin(id: string): Promise<void>;
  getOrdersByChefId(chefId: string): Promise<Order[]>;
  getPartnerDashboardMetrics(chefId: string): Promise<any>;

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
  createSubscription(data: Omit<Subscription, "id" | "createdAt" | "updatedAt">): Promise<Subscription>;
  updateSubscription(id: string, data: Partial<Subscription>): Promise<Subscription | undefined>;
  deleteSubscription(id: string): Promise<void>;

  // Delivery settings methods
  getDeliverySettings(): Promise<DeliverySetting[]>;
  getDeliverySetting(id: string): Promise<DeliverySetting | undefined>;
  createDeliverySetting(data: Omit<DeliverySetting, "id" | "createdAt" | "updatedAt">): Promise<DeliverySetting>;
  updateDeliverySetting(id: string, data: Partial<DeliverySetting>): Promise<DeliverySetting | undefined>;
  deleteDeliverySetting(id: string): Promise<void>;

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
  rejectOrder(orderId: string, rejectedBy: string, reason: string): Promise<Order | undefined>;
  assignOrderToDeliveryPerson(orderId: string, deliveryPersonId: string): Promise<Order | undefined>;
  updateOrderPickup(orderId: string): Promise<Order | undefined>;
  updateOrderDelivery(orderId: string): Promise<Order | undefined>;
  getOrdersByDeliveryPerson(deliveryPersonId: string): Promise<Order[]>;
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

  async upsertUser(userData: UpsertUser): Promise<User> {
    const existing = await this.getUser(userData.id!);
    const user: User = {
      id: userData.id!,
      email: userData.email || null,
      firstName: userData.firstName || null,
      lastName: userData.lastName || null,
      profileImageUrl: userData.profileImageUrl || null,
      createdAt: existing?.createdAt || new Date(),
      updatedAt: new Date(),
    };
    await db.insert(users).values(user).onConflictDoUpdate({
      target: users.id,
      set: { ...user, createdAt: users.createdAt } // Preserve original createdAt
    });
    return user;
  }

  async updateUser(id: string, userData: Partial<UpsertUser>): Promise<User | undefined> {
    await db.update(users).set({ ...userData, updatedAt: new Date() }).where(eq(users.id, id));
    return this.getUser(id);
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
      status: insertOrder.status || "pending",
      paymentStatus: "pending" as const,
      paymentQrShown: true,
      chefId: insertOrder.chefId || null,
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
    return db.query.chefs.findMany();
  }

  async getChefById(id: string): Promise<Chef | null> {
    const chef = await db.query.chefs.findFirst({ where: (c, { eq }) => eq(c.id, id) });
    return chef || null;
  }

  async getChefsByCategory(categoryId: string): Promise<Chef[]> {
    return db.query.chefs.findMany({ where: (c, { eq }) => eq(c.categoryId, categoryId) });
  }

  async createChef(data: Omit<Chef, "id">): Promise<Chef> {
    const id = nanoid();
    const chef: Chef = { id, ...data };
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

  async getAllUsers(): Promise<User[]> {
    return db.query.users.findMany();
  }

  async getPartnerByUsername(username: string): Promise<PartnerUser | null> {
    const partner = await db.query.partnerUsers.findFirst({ where: (p, { eq }) => eq(p.username, username) });
    return partner || null;
  }

  async getPartnerById(id: string): Promise<PartnerUser | null> {
    const partner = await db.query.partnerUsers.findFirst({ where: (p, { eq }) => eq(p.id, id) });
    return partner || null;
  }

  async createPartner(data: Omit<PartnerUser, "id" | "createdAt" | "lastLoginAt">): Promise<PartnerUser> {
    const id = randomUUID();
    const newPartner: PartnerUser = {
      id,
      ...data,
      createdAt: new Date(),
      lastLoginAt: null,
    };
    await db.insert(partnerUsers).values(newPartner);
    return newPartner;
  }

  async updatePartnerLastLogin(id: string): Promise<void> {
    await db.update(partnerUsers).set({ lastLoginAt: new Date() }).where(eq(partnerUsers.id, id));
  }

  async getOrdersByChefId(chefId: string): Promise<Order[]> {
    return db.query.orders.findMany({ where: (o, { eq }) => eq(o.chefId, chefId) });
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

  async deleteSubscription(id: string): Promise<void> {
    await db.delete(subscriptions).where(eq(subscriptions.id, id));
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

  async getDeliveryPersonnelByPhone(phone: string): Promise<DeliveryPersonnel | undefined> {
    return db.query.deliveryPersonnel.findFirst({ where: (dp, { eq }) => eq(dp.phone, phone) });
  }

  async getDeliveryPersonnelById(id: string): Promise<DeliveryPersonnel | undefined> {
    return db.query.deliveryPersonnel.findFirst({ where: (dp, { eq }) => eq(dp.id, id) });
  }

  async getAllDeliveryPersonnel(): Promise<DeliveryPersonnel[]> {
    return db.query.deliveryPersonnel.findMany();
  }

  async getAvailableDeliveryPersonnel(): Promise<DeliveryPersonnel[]> {
    return db.query.deliveryPersonnel.findMany({ 
      where: (dp, { eq, and }) => and(eq(dp.status, "available"), eq(dp.isActive, true))
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
    const [order] = await db
      .update(orders)
      .set({ 
        assignedTo: deliveryPersonId,
        assignedAt: new Date(),
        status: "assigned"
      })
      .where(eq(orders.id, orderId))
      .returning();

    await db.update(deliveryPersonnel).set({ status: "busy" }).where(eq(deliveryPersonnel.id, deliveryPersonId));
    
    return order;
  }

  async updateOrderPickup(orderId: string): Promise<Order | undefined> {
    const [order] = await db
      .update(orders)
      .set({ 
        status: "picked_up",
        pickedUpAt: new Date()
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
    return db.query.orders.findMany({ 
      where: (o, { eq }) => eq(o.assignedTo, deliveryPersonId)
    });
  }
}

export const storage = new MemStorage();