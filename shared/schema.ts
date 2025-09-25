import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, timestamp, integer, json, boolean } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Types for available services
export interface PricingPlan {
  id: string;
  name: string;
  price: number;
  billingCycle: 'monthly' | 'annual';
  features: string[];
}

export interface ServiceFeature {
  name: string;
  description?: string;
}

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  name: text("name"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const subscriptions = pgTable("subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  category: text("category").notNull(),
  cost: decimal("cost", { precision: 10, scale: 2 }).notNull(),
  billingCycle: text("billing_cycle").notNull(), // 'monthly' | 'annual'
  renewalDate: timestamp("renewal_date").notNull(),
  expirationDate: timestamp("expiration_date"), // Enhanced expiration tracking
  status: text("status").notNull(), // 'active' | 'inactive' | 'expiring'
  logoUrl: text("logo_url"),
  description: text("description"),
  lastUsed: timestamp("last_used"),
  userEmail: text("user_email").notNull(),
});

// Available streaming services marketplace table
export const availableServices = pgTable("available_services", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  category: text("category").notNull(),
  logoUrl: text("logo_url").notNull(),
  description: text("description").notNull(),
  basePrice: decimal("base_price", { precision: 10, scale: 2 }).notNull(),
  plans: json("plans").$type<PricingPlan[]>().notNull(), // Array of pricing plans
  isPopular: boolean("is_popular").default(false),
  features: json("features").$type<string[]>().notNull(), // Array of feature strings
  launchUrl: text("launch_url"), // Direct URL to launch the service
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

// Usage tracking for service launches
export const serviceLaunches = pgTable("service_launches", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  subscriptionId: varchar("subscription_id").notNull(),
  userEmail: text("user_email").notNull(),
  serviceName: text("service_name").notNull(),
  launchedAt: timestamp("launched_at").notNull().default(sql`now()`),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  subscriptions: many(subscriptions),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  user: one(users, {
    fields: [subscriptions.userEmail],
    references: [users.email],
  }),
}));

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertSubscriptionSchema = createInsertSchema(subscriptions).omit({
  id: true,
  userEmail: true, // Exclude userEmail - added server-side from session
}).extend({
  cost: z.string().min(1, "Cost is required"),
  renewalDate: z.string().min(1, "Renewal date is required"),
  expirationDate: z.string().optional(), // Optional expiration date
});

export const insertAvailableServiceSchema = createInsertSchema(availableServices).omit({
  id: true,
  createdAt: true,
});

export const insertServiceLaunchSchema = createInsertSchema(serviceLaunches).omit({
  id: true,
  launchedAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;
export type Subscription = typeof subscriptions.$inferSelect;
export type AvailableService = typeof availableServices.$inferSelect;
export type InsertAvailableService = z.infer<typeof insertAvailableServiceSchema>;
export type ServiceLaunch = typeof serviceLaunches.$inferSelect;
export type InsertServiceLaunch = z.infer<typeof insertServiceLaunchSchema>;
