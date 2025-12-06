import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, boolean, timestamp, jsonb, index, pgEnum, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import * as crypto from "crypto";

export const adminRoleEnum = pgEnum("admin_role", ["super_admin", "manager", "viewer"]);

export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 20 }).notNull().unique(),
  email: varchar("email", { length: 255 }),
  address: text("address"),
  passwordHash: text("password_hash").notNull(),
  referralCode: varchar("referral_code", { length: 20 }).unique(),
  walletBalance: integer("wallet_balance").notNull().default(0),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const adminUsers = pgTable("admin_users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: varchar("username", { length: 50 }).notNull().unique(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: adminRoleEnum("role").notNull().default("viewer"),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const partnerUsers = pgTable("partner_users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  chefId: text("chef_id").notNull().unique(),
  username: varchar("username", { length: 50 }).notNull().unique(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  profilePictureUrl: text("profile_picture_url"),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const categories = pgTable("categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description").notNull(),
  image: text("image").notNull(),
  iconName: text("icon_name").notNull(),
  itemCount: text("item_count").notNull()
});

export const chefs = pgTable("chefs", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  image: text("image").notNull(),
  rating: text("rating").notNull(),
  reviewCount: integer("review_count").notNull(),
  categoryId: text("category_id").notNull(),
  latitude: real("latitude").notNull().default(19.0728),
  longitude: real("longitude").notNull().default(72.8826),
  isActive: boolean("is_active").notNull().default(true),
});


export const products = pgTable("products", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  price: integer("price").notNull(),
  image: text("image").notNull(),
  rating: decimal("rating", { precision: 2, scale: 1 }).notNull().default("4.5"),
  reviewCount: integer("review_count").notNull().default(0),
  isVeg: boolean("is_veg").notNull().default(true),
  isCustomizable: boolean("is_customizable").notNull().default(false),
  stockQuantity: integer("stock_quantity").notNull().default(100),
  lowStockThreshold: integer("low_stock_threshold").notNull().default(20),
  isAvailable: boolean("is_available").notNull().default(true),
  categoryId: varchar("category_id").notNull(),
  chefId: text("chef_id"),
  offerPercentage: integer("offer_percentage").notNull().default(0), // Added offerPercentage field
});

export const paymentStatusEnum = pgEnum("payment_status", ["pending", "paid", "confirmed"]);
export const deliveryPersonnelStatusEnum = pgEnum("delivery_personnel_status", ["available", "busy", "offline"]);

export const deliveryPersonnel = pgTable("delivery_personnel", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  phone: text("phone").notNull().unique(),
  email: text("email"),
  passwordHash: text("password_hash").notNull(),
  status: deliveryPersonnelStatusEnum("status").notNull().default("available"),
  currentLocation: text("current_location"),
  isActive: boolean("is_active").notNull().default(true),
  totalDeliveries: integer("total_deliveries").notNull().default(0),
  rating: decimal("rating", { precision: 2, scale: 1 }).default("5.0"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  lastLoginAt: timestamp("last_login_at"),
});

export const orders = pgTable("orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id"),
  customerName: text("customer_name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  address: text("address").notNull(),
  items: jsonb("items").notNull(),
  subtotal: integer("subtotal").notNull(),
  deliveryFee: integer("delivery_fee").notNull(),
  discount: integer("discount").notNull().default(0),
  couponCode: varchar("coupon_code", { length: 50 }),
  walletAmountUsed: integer("wallet_amount_used").notNull().default(0),
  total: integer("total").notNull(),
  status: text("status").notNull().default("pending"),
  paymentStatus: paymentStatusEnum("payment_status").notNull().default("pending"),
  paymentQrShown: boolean("payment_qr_shown").notNull().default(false),
  chefId: text("chef_id"),
  chefName: text("chef_name"),
  categoryId: varchar("category_id"), // Category of the order (for Roti validation)
  categoryName: text("category_name"), // Category name for display
  deliveryTime: text("delivery_time"), // Required for Roti orders (HH:mm format)
  deliverySlotId: varchar("delivery_slot_id"), // Reference to delivery time slot
  approvedBy: text("approved_by"),
  rejectedAt: timestamp("rejected_at"),
  approvedAt: timestamp("approved_at"),
  rejectedBy: text("rejected_by"),
  rejectionReason: text("rejection_reason"),
  assignedTo: text("assigned_to"),
  deliveryPersonName: text("delivery_person_name"),
  deliveryPersonPhone: text("delivery_person_phone"),
  assignedAt: timestamp("assigned_at"),
  pickedUpAt: timestamp("picked_up_at"),
  deliveredAt: timestamp("delivered_at"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const deliverySettings = pgTable("delivery_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  minDistance: decimal("min_distance", { precision: 5, scale: 2 }).notNull(),
  maxDistance: decimal("max_distance", { precision: 5, scale: 2 }).notNull(),
  price: integer("price").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const cartSettings = pgTable("cart_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  categoryId: varchar("category_id").notNull().unique(),
  categoryName: text("category_name").notNull(),
  minOrderAmount: integer("min_order_amount").notNull().default(100),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const discountTypeEnum = pgEnum("discount_type", ["percentage", "fixed"]);

export const coupons = pgTable("coupons", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 50 }).notNull().unique(),
  description: text("description").notNull(),
  discountType: discountTypeEnum("discount_type").notNull(),
  discountValue: integer("discount_value").notNull(),
  minOrderAmount: integer("min_order_amount").notNull().default(0),
  maxDiscount: integer("max_discount"),
  usageLimit: integer("usage_limit"),
  usedCount: integer("used_count").notNull().default(0),
  perUserLimit: integer("per_user_limit").default(1), // How many times each user can use this coupon
  validFrom: timestamp("valid_from", { withTimezone: true }).notNull(),
  validUntil: timestamp("valid_until", { withTimezone: true }).notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const couponUsages = pgTable("coupon_usages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  couponId: varchar("coupon_id").notNull(),
  userId: varchar("user_id").notNull(),
  orderId: varchar("order_id"), // Reference to the order where coupon was used
  usedAt: timestamp("used_at").notNull().defaultNow(),
}, (table) => [
  index("IDX_coupon_usages_coupon_user").on(table.couponId, table.userId),
]);

export const referrals = pgTable("referrals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  referrerId: varchar("referrer_id").notNull(), // User who refers
  referredId: varchar("referred_id").notNull(), // User who was referred
  referralCode: varchar("referral_code", { length: 20 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, completed, expired
  referrerBonus: integer("referrer_bonus").notNull().default(0), // Bonus amount for referrer
  referredBonus: integer("referred_bonus").notNull().default(0), // Bonus amount for referred user
  referredOrderCompleted: boolean("referred_order_completed").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
}, (table) => [
  index("IDX_referrals_referrer").on(table.referrerId, table.status),
  index("IDX_referrals_referred").on(table.referredId),
]);

export const transactionTypeEnum = pgEnum("transaction_type", ["credit", "debit", "referral_bonus", "order_discount"]);

export const walletTransactions = pgTable("wallet_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  amount: integer("amount").notNull(),
  type: transactionTypeEnum("type").notNull(),
  description: text("description").notNull(),
  referenceId: varchar("reference_id"), // Order ID or Referral ID
  referenceType: varchar("reference_type", { length: 50 }), // 'order', 'referral', etc
  balanceBefore: integer("balance_before").notNull(),
  balanceAfter: integer("balance_after").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("IDX_wallet_user_created").on(table.userId, table.createdAt),
]);

export const walletSettings = pgTable("wallet_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  maxUsagePerOrder: integer("max_usage_per_order").notNull().default(10),
  referrerBonus: integer("referrer_bonus").notNull().default(100),
  referredBonus: integer("referred_bonus").notNull().default(50),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type WalletSettings = typeof walletSettings.$inferSelect;
export type InsertWalletSettings = typeof walletSettings.$inferInsert;

export const referralRewards = pgTable("referral_rewards", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  referrerBonus: integer("referrer_bonus").notNull().default(50), // ₹50 for referrer
  referredBonus: integer("referred_bonus").notNull().default(50), // ₹50 for referred user
  minOrderAmount: integer("min_order_amount").notNull().default(0), // Min order to qualify
  maxReferralsPerMonth: integer("max_referrals_per_month").default(10),
  maxEarningsPerMonth: integer("max_earnings_per_month").default(500),
  expiryDays: integer("expiry_days").default(30), // Days for referred user to complete first order
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const subscriptionStatusEnum = pgEnum("subscription_status", ["pending", "active", "paused", "cancelled", "expired"]);
export const subscriptionFrequencyEnum = pgEnum("subscription_frequency", ["daily", "weekly", "monthly"]);
export const deliveryLogStatusEnum = pgEnum("delivery_log_status", ["scheduled", "preparing", "out_for_delivery", "delivered", "missed"]);

export const subscriptionPlans = pgTable("subscription_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description").notNull(),
  categoryId: varchar("category_id").notNull(),
  frequency: subscriptionFrequencyEnum("frequency").notNull(),
  price: integer("price").notNull(),
  deliveryDays: jsonb("delivery_days").notNull(), // Array of days: ["monday", "tuesday", etc]
  items: jsonb("items").notNull(), // Default items included
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const subscriptions = pgTable("subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  planId: varchar("plan_id").notNull(),
  chefId: text("chef_id"), // Chef assigned to handle this subscription
  chefAssignedAt: timestamp("chef_assigned_at").default(sql`null`), // When chef was assigned - used to track if reassignment needed
  deliverySlotId: varchar("delivery_slot_id"), // Reference to delivery time slot
  customerName: text("customer_name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  address: text("address").notNull(),
  status: subscriptionStatusEnum("status").notNull().default("active"),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  nextDeliveryDate: timestamp("next_delivery_date").notNull(),
  nextDeliveryTime: text("next_delivery_time").default("09:00"), // Delivery time (HH:mm format)
  customItems: jsonb("custom_items"), // User customized items
  remainingDeliveries: integer("remaining_deliveries").notNull().default(30), // Track remaining deliveries
  totalDeliveries: integer("total_deliveries").notNull().default(30), // Total deliveries in subscription
  isPaid: boolean("is_paid").notNull().default(false),
  paymentTransactionId: text("payment_transaction_id"),
  // Payment breakdown fields for admin adjustments
  originalPrice: integer("original_price"), // Original plan price
  discountAmount: integer("discount_amount").default(0), // Admin-applied discount
  walletAmountUsed: integer("wallet_amount_used").default(0), // Wallet balance deducted
  couponCode: text("coupon_code"), // Coupon code applied
  couponDiscount: integer("coupon_discount").default(0), // Discount from coupon
  finalAmount: integer("final_amount"), // Final amount after all adjustments
  paymentNotes: text("payment_notes"), // Admin notes for payment adjustments
  lastDeliveryDate: timestamp("last_delivery_date"),
  deliveryHistory: jsonb("delivery_history").default([]), // Array of delivery records
  pauseStartDate: timestamp("pause_start_date"), // Advanced pause: start date
  pauseResumeDate: timestamp("pause_resume_date"), // Advanced pause: auto-resume date
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Subscription Delivery Logs - tracks each scheduled delivery
export const subscriptionDeliveryLogs = pgTable("subscription_delivery_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  subscriptionId: varchar("subscription_id").notNull(),
  date: timestamp("date").notNull(),
  time: text("time").notNull().default("09:00"), // HH:mm format
  status: deliveryLogStatusEnum("status").notNull().default("scheduled"),
  deliveryPersonId: varchar("delivery_person_id"), // nullable
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertCategorySchema = createInsertSchema(categories).omit({
  id: true,
});

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
}).extend({
  isCustomizable: z.boolean().default(false).optional(),
  offerPercentage: z.number().min(0).max(100).optional(), // Added offerPercentage to Zod schema
  createdAt: z.date().or(z.string()).optional(),
  updatedAt: z.date().or(z.string()).optional(),
});

export const insertChefSchema = createInsertSchema(chefs).omit({
  id: true,
});

// Assuming orderItemSchema is defined elsewhere and needs to be available
const orderItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  price: z.number(),
  quantity: z.number(),
});

export const insertOrderSchema = createInsertSchema(orders, {
  items: z.array(z.object({
    id: z.string(),
    name: z.string(),
    price: z.number(),
    quantity: z.number(),
  })),
  status: z.enum([
    'pending',              // Order placed, waiting for payment confirmation
    'confirmed',            // Payment confirmed, sent to chef
    'accepted_by_chef',     // Chef accepted the order
    'preparing',            // Chef is preparing the food
    'prepared',             // Food ready, waiting for pickup
    'accepted_by_delivery', // Delivery person accepted
    'out_for_delivery',     // Delivery person picked up, on the way
    'delivered',            // Order delivered to customer
    'completed',            // Order completed
    'cancelled'             // Order cancelled
  ]).default('pending'),
  paymentStatus: z.enum(['pending', 'paid', 'confirmed']).default('pending'),
  categoryId: z.string().optional(),
  categoryName: z.string().optional(),
  deliveryTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format").optional(),
  deliverySlotId: z.string().optional(),
}).omit({
  id: true,
  createdAt: true,
  approvedAt: true,
  approvedBy: true,
  rejectedAt: true,
  rejectedBy: true,
  rejectionReason: true,
  pickedUpAt: true,
  deliveredAt: true,
  assignedTo: true,
  deliveryPersonName: true,
  deliveryPersonPhone: true,
});

export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Category = typeof categories.$inferSelect;
export type InsertChef = z.infer<typeof insertChefSchema>;
export type Chef = typeof chefs.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof products.$inferSelect;

export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof orders.$inferSelect;

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

export const insertUserSchema = createInsertSchema(users, {
  name: z.string().min(1, { message: "Name must be at least 1 character long" }),
  phone: z.string().min(10, { message: "Phone number must be at least 10 digits long" }),
  passwordHash: z.string().min(6, { message: "Password must be at least 6 characters long" }),
  referralCode: z.string().optional(),
  walletBalance: z.number().int().default(0),
}).omit({
  id: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  password: z.string().min(6, { message: "Password must be at least 6 characters long" }),
});

export const userLoginSchema = z.object({
  phone: z.string(),
  password: z.string(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type UserLogin = z.infer<typeof userLoginSchema>;

export const insertAdminUserSchema = createInsertSchema(adminUsers, {
  username: z.string().min(3, { message: "Username must be at least 3 characters long" }),
  email: z.string().email({ message: "Invalid email address" }),
  passwordHash: z.string().min(8, { message: "Password must be at least 8 characters long" }),
  role: z.enum(["super_admin", "manager", "viewer"]).default("viewer"),
}).omit({
  id: true,
  lastLoginAt: true,
  createdAt: true,
}).extend({
  password: z.string().min(8),
});

export const adminLoginSchema = z.object({
  username: z.string(),
  password: z.string(),
});

export type InsertAdminUser = z.infer<typeof insertAdminUserSchema>;
export type AdminUser = typeof adminUsers.$inferSelect;
export type AdminLogin = z.infer<typeof adminLoginSchema>;

export const insertPartnerUserSchema = createInsertSchema(partnerUsers, {
  chefId: z.string().min(1, { message: "Chef ID is required" }),
  username: z.string().min(3, { message: "Username must be at least 3 characters long" }),
  email: z.string().email({ message: "Invalid email address" }),
  passwordHash: z.string().min(8, { message: "Password must be at least 8 characters long" }),
}).omit({
  id: true,
  lastLoginAt: true,
  createdAt: true,
}).extend({
  password: z.string().min(8),
});

export const partnerLoginSchema = z.object({
  username: z.string(),
  password: z.string(),
});

export type InsertPartnerUser = z.infer<typeof insertPartnerUserSchema>;
export type PartnerUser = typeof partnerUsers.$inferSelect;
export type PartnerLogin = z.infer<typeof partnerLoginSchema>;

export const insertSubscriptionPlanSchema = createInsertSchema(subscriptionPlans);

// Promotional Banner Table
export const promotionalBanners = pgTable("promotional_banners", {
  id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text("title").notNull(),
  subtitle: text("subtitle").notNull(),
  buttonText: text("button_text").notNull(),
  gradientFrom: varchar("gradient_from", { length: 50 }).notNull().default("orange-600"),
  gradientVia: varchar("gradient_via", { length: 50 }).notNull().default("amber-600"),
  gradientTo: varchar("gradient_to", { length: 50 }).notNull().default("yellow-600"),
  emoji1: varchar("emoji_1", { length: 10 }).notNull().default("🍽️"),
  emoji2: varchar("emoji_2", { length: 10 }).notNull().default("🥘"),
  emoji3: varchar("emoji_3", { length: 10 }).notNull().default("🍛"),
  actionType: varchar("action_type", { length: 50 }).notNull().default("subscription"), // subscription, category, url
  actionValue: text("action_value"), // category id or url
  isActive: boolean("is_active").notNull().default(true),
  displayOrder: integer("display_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type PromotionalBanner = typeof promotionalBanners.$inferSelect;
export type InsertPromotionalBanner = typeof promotionalBanners.$inferInsert;
export const insertPromotionalBannerSchema = createInsertSchema(promotionalBanners);

export const insertSubscriptionSchema = createInsertSchema(subscriptions, {
  userId: z.string().min(1, { message: "User ID is required" }),
  planId: z.string().min(1, { message: "Plan ID is required" }),
  chefId: z.string().optional(), // Chef/Partner assigned to subscription
  customerName: z.string().min(1, { message: "Customer name is required" }),
  phone: z.string().min(10, { message: "Phone number must be at least 10 digits long" }),
  address: z.string().min(1, { message: "Address is required" }),
  status: z.enum(["pending", "active", "paused", "cancelled", "expired"]).default("active"),
  startDate: z.preprocess((arg) => new Date(arg as string), z.date()),
  endDate: z.preprocess((arg) => new Date(arg as string), z.date()).optional(),
  nextDeliveryDate: z.preprocess((arg) => new Date(arg as string), z.date()),
  nextDeliveryTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: "Invalid time format. Use HH:mm." }).default("09:00"),
  customItems: z.array(z.object({ id: z.string(), name: z.string(), quantity: z.number() })).optional(),
  remainingDeliveries: z.number().int().min(0).default(30),
  totalDeliveries: z.number().int().min(0).default(30),
  isPaid: z.boolean().default(false),
  paymentTransactionId: z.string().optional(),
  lastDeliveryDate: z.preprocess((arg) => new Date(arg as string), z.date()).optional(),
  deliveryHistory: z.array(z.object({ deliveryDate: z.preprocess((arg) => new Date(arg as string), z.date()), status: z.string() })).default([]),
  pauseStartDate: z.preprocess((arg) => arg ? new Date(arg as string) : null, z.date().nullable()).optional(),
  pauseResumeDate: z.preprocess((arg) => arg ? new Date(arg as string) : null, z.date().nullable()).optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDeliverySettingSchema = createInsertSchema(deliverySettings, {
  name: z.string().min(1, { message: "Setting name is required" }),
  minDistance: z.number({ message: "Minimum distance is required" }),
  maxDistance: z.number({ message: "Maximum distance is required" }),
  price: z.number({ message: "Price is required" }),
  isActive: z.boolean().default(true),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertSubscriptionPlan = z.infer<typeof insertSubscriptionPlanSchema>;
export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;
export type Subscription = typeof subscriptions.$inferSelect;

export const insertSubscriptionDeliveryLogSchema = createInsertSchema(subscriptionDeliveryLogs, {
  subscriptionId: z.string().min(1, { message: "Subscription ID is required" }),
  date: z.preprocess((arg) => new Date(arg as string), z.date()),
  time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: "Invalid time format. Use HH:mm." }).default("09:00"),
  status: z.enum(["scheduled", "preparing", "out_for_delivery", "delivered", "missed"]).default("scheduled"),
  deliveryPersonId: z.string().optional(),
  notes: z.string().optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertSubscriptionDeliveryLog = z.infer<typeof insertSubscriptionDeliveryLogSchema>;
export type SubscriptionDeliveryLog = typeof subscriptionDeliveryLogs.$inferSelect;

export type InsertDeliverySetting = z.infer<typeof insertDeliverySettingSchema>;
export type DeliverySetting = typeof deliverySettings.$inferSelect;

export const insertCartSettingSchema = createInsertSchema(cartSettings, {
  categoryId: z.string().min(1, { message: "Category ID is required" }),
  categoryName: z.string().min(1, { message: "Category name is required" }),
  minOrderAmount: z.number().int().default(100),
  isActive: z.boolean().default(true),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertCartSetting = z.infer<typeof insertCartSettingSchema>;
export type CartSetting = typeof cartSettings.$inferSelect;

export const insertDeliveryPersonnelSchema = createInsertSchema(deliveryPersonnel, {
  name: z.string().min(1, { message: "Name is required" }),
  phone: z.string().min(10, { message: "Phone number must be at least 10 digits long" }),
  passwordHash: z.string().min(8, { message: "Password must be at least 8 characters long" }),
  status: z.enum(["available", "busy", "offline"]).default("available"),
  isActive: z.boolean().default(true),
  totalDeliveries: z.number().int().default(0),
  rating: z.number().min(0).max(5).default(5.0),
}).omit({
  id: true,
  createdAt: true,
  lastLoginAt: true,
}).extend({
  password: z.string().min(8),
});

export const deliveryPersonnelLoginSchema = z.object({
  phone: z.string(),
  password: z.string(),
});

export type InsertDeliveryPersonnel = z.infer<typeof insertDeliveryPersonnelSchema>;
export type DeliveryPersonnel = typeof deliveryPersonnel.$inferSelect;
export type DeliveryPersonnelLogin = z.infer<typeof deliveryPersonnelLoginSchema>;

export const insertCouponSchema = createInsertSchema(coupons, {
  code: z.string().min(1, { message: "Coupon code is required" }),
  description: z.string().min(1, { message: "Description is required" }),
  discountType: z.enum(["percentage", "fixed"]),
  discountValue: z.number().int().min(0, { message: "Discount value must be a non-negative integer" }),
  minOrderAmount: z.number().int().default(0),
  maxDiscount: z.number().int().optional(),
  usageLimit: z.number().int().optional(),
  validFrom: z.preprocess((arg) => new Date(arg as string), z.date()),
  validUntil: z.preprocess((arg) => new Date(arg as string), z.date()),
  isActive: z.boolean().default(true),
}).omit({
  id: true,
  usedCount: true,
  createdAt: true,
});

export type InsertCoupon = z.infer<typeof insertCouponSchema>;
export type Coupon = typeof coupons.$inferSelect;

export const insertReferralSchema = createInsertSchema(referrals, {
  referrerId: z.string().min(1, { message: "Referrer ID is required" }),
  referredId: z.string().min(1, { message: "Referred ID is required" }),
  referralCode: z.string().min(1, { message: "Referral code is required" }),
  status: z.enum(["pending", "completed", "expired"]).default("pending"),
  referrerBonus: z.number().int().default(0),
  referredBonus: z.number().int().default(0),
  referredOrderCompleted: z.boolean().default(false),
}).omit({
  id: true,
  createdAt: true,
  completedAt: true,
});

export type InsertReferral = z.infer<typeof insertReferralSchema>;
export type Referral = typeof referrals.$inferSelect;

export const insertWalletTransactionSchema = createInsertSchema(walletTransactions, {
  userId: z.string().min(1, { message: "User ID is required" }),
  amount: z.number({ message: "Amount is required" }),
  type: z.enum(["credit", "debit", "referral_bonus", "order_discount"]),
  description: z.string().min(1, { message: "Description is required" }),
  referenceId: z.string().optional(),
  referenceType: z.string().optional(),
  balanceBefore: z.number({ message: "Balance before is required" }),
  balanceAfter: z.number({ message: "Balance after is required" }),
}).omit({
  id: true,
  createdAt: true,
});

export type InsertWalletTransaction = z.infer<typeof insertWalletTransactionSchema>;
export type WalletTransaction = typeof walletTransactions.$inferSelect;

export const insertReferralRewardSchema = createInsertSchema(referralRewards, {
  name: z.string().min(1, { message: "Reward name is required" }),
  referrerBonus: z.number().int().default(50),
  referredBonus: z.number().int().default(50),
  minOrderAmount: z.number().int().default(0),
  maxReferralsPerMonth: z.number().int().default(10),
  maxEarningsPerMonth: z.number().int().default(500),
  expiryDays: z.number().int().default(30),
  isActive: z.boolean().default(true),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertReferralReward = z.infer<typeof insertReferralRewardSchema>;
export type ReferralReward = typeof referralRewards.$inferSelect;

// Delivery Time Slots for Subscriptions
export const deliveryTimeSlots = pgTable("delivery_time_slots", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  startTime: varchar("start_time", { length: 5 }).notNull(),
  endTime: varchar("end_time", { length: 5 }).notNull(),
  label: varchar("label", { length: 100 }).notNull(),
  capacity: integer("capacity").notNull().default(50),
  currentOrders: integer("current_orders").notNull().default(0),
  // Optional per-slot cutoff in hours before the slot start when ordering must be placed
  cutoffHoursBefore: integer("cutoff_hours_before"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

export const insertDeliveryTimeSlotsSchema = createInsertSchema(deliveryTimeSlots, {
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Invalid time format"),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Invalid time format"),
  label: z.string().min(1, "Label is required"),
  capacity: z.number().int().min(1, "Capacity must be at least 1"),
  isActive: z.boolean().default(true),
  cutoffHoursBefore: z.number().int().min(0).optional(),
}).omit({
  id: true,
  currentOrders: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertDeliveryTimeSlot = z.infer<typeof insertDeliveryTimeSlotsSchema>;
export type DeliveryTimeSlot = typeof deliveryTimeSlots.$inferSelect;

// Roti Order Settings - Admin-configurable time restrictions
export const rotiSettings = pgTable("roti_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  morningBlockStartTime: varchar("morning_block_start_time", { length: 5 }).notNull().default("08:00"),
  morningBlockEndTime: varchar("morning_block_end_time", { length: 5 }).notNull().default("11:00"),
  lastOrderTime: varchar("last_order_time", { length: 5 }).notNull().default("23:00"),
  blockMessage: text("block_message").notNull().default("Roti orders are not available from 8 AM to 11 AM. Please order before 11 PM for next morning delivery."),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

export const insertRotiSettingsSchema = createInsertSchema(rotiSettings, {
  morningBlockStartTime: z.string().regex(/^\d{2}:\d{2}$/, "Invalid time format (HH:mm)"),
  morningBlockEndTime: z.string().regex(/^\d{2}:\d{2}$/, "Invalid time format (HH:mm)"),
  lastOrderTime: z.string().regex(/^\d{2}:\d{2}$/, "Invalid time format (HH:mm)"),
  blockMessage: z.string().min(1, "Block message is required"),
  isActive: z.boolean().default(true),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertRotiSettings = z.infer<typeof insertRotiSettingsSchema>;
export type RotiSettings = typeof rotiSettings.$inferSelect;