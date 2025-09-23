import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const subscriptions = pgTable("subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  category: text("category").notNull(),
  cost: decimal("cost", { precision: 10, scale: 2 }).notNull(),
  billingCycle: text("billing_cycle").notNull(), // 'monthly' | 'annual'
  renewalDate: timestamp("renewal_date").notNull(),
  status: text("status").notNull(), // 'active' | 'inactive' | 'expiring'
  logoUrl: text("logo_url"),
  description: text("description"),
  lastUsed: timestamp("last_used"),
});

export const insertSubscriptionSchema = createInsertSchema(subscriptions).omit({
  id: true,
}).extend({
  cost: z.string().min(1, "Cost is required"),
  renewalDate: z.string().min(1, "Renewal date is required"),
});

export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;
export type Subscription = typeof subscriptions.$inferSelect;
