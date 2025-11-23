import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, boolean, timestamp, jsonb, index, pgEnum, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

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
  categoryId: varchar("category_id").notNull(),
  chefId: text("chef_id"),
  stockQuantity: integer("stock_quantity").notNull().default(100),
  lowStockThreshold: integer("low_stock_threshold").notNull().default(20),
  isAvailable: boolean("is_available").notNull().default(true),
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
  validFrom: timestamp("valid_from", { withTimezone: true }).notNull(),
  validUntil: timestamp("valid_until", { withTimezone: true }).notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

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

export const subscriptionStatusEnum = pgEnum("subscription_status", ["active", "paused", "cancelled", "expired"]);
export const subscriptionFrequencyEnum = pgEnum("subscription_frequency", ["daily", "weekly", "monthly"]);

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
  customerName: text("customer_name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  address: text("address").notNull(),
  status: subscriptionStatusEnum("status").notNull().default("active"),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  nextDeliveryDate: timestamp("next_delivery_date").notNull(),
  customItems: jsonb("custom_items"), // User customized items
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertCategorySchema = createInsertSchema(categories).omit({
  id: true,
});

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
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

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  passwordHash: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  password: z.string().min(6),
});

export const userLoginSchema = z.object({
  phone: z.string(),
  password: z.string(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type UserLogin = z.infer<typeof userLoginSchema>;

export const insertAdminUserSchema = createInsertSchema(adminUsers).omit({
  id: true,
  passwordHash: true,
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

export const insertPartnerUserSchema = createInsertSchema(partnerUsers).omit({
  id: true,
  passwordHash: true,
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

export const insertSubscriptionPlanSchema = createInsertSchema(subscriptionPlans).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSubscriptionSchema = createInsertSchema(subscriptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDeliverySettingSchema = createInsertSchema(deliverySettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertSubscriptionPlan = z.infer<typeof insertSubscriptionPlanSchema>;
export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;
export type Subscription = typeof subscriptions.$inferSelect;

export type InsertDeliverySetting = z.infer<typeof insertDeliverySettingSchema>;
export type DeliverySetting = typeof deliverySettings.$inferSelect;

export const insertCartSettingSchema = createInsertSchema(cartSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertCartSetting = z.infer<typeof insertCartSettingSchema>;
export type CartSetting = typeof cartSettings.$inferSelect;

export const insertDeliveryPersonnelSchema = createInsertSchema(deliveryPersonnel).omit({
  id: true,
  passwordHash: true,
  totalDeliveries: true,
  rating: true,
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

export const insertCouponSchema = createInsertSchema(coupons).omit({
  id: true,
  usedCount: true,
  createdAt: true,
});

export type InsertCoupon = z.infer<typeof insertCouponSchema>;
export type Coupon = typeof coupons.$inferSelect;

export const insertReferralSchema = createInsertSchema(referrals).omit({
  id: true,
  createdAt: true,
  completedAt: true,
});

export type InsertReferral = z.infer<typeof insertReferralSchema>;
export type Referral = typeof referrals.$inferSelect;

export const insertWalletTransactionSchema = createInsertSchema(walletTransactions).omit({
  id: true,
  createdAt: true,
});

export type InsertWalletTransaction = z.infer<typeof insertWalletTransactionSchema>;
export type WalletTransaction = typeof walletTransactions.$inferSelect;

export const insertReferralRewardSchema = createInsertSchema(referralRewards).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertReferralReward = z.infer<typeof insertReferralRewardSchema>;
export type ReferralReward = typeof referralRewards.$inferSelect;