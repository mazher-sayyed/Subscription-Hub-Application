import { type Subscription, type InsertSubscription, type User, type InsertUser, users, subscriptions } from "@shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";

export interface IStorage {
  // User management
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Subscription management (user-specific)
  getSubscription(id: string, userEmail: string): Promise<Subscription | undefined>;
  getAllSubscriptions(userEmail: string): Promise<Subscription[]>;
  createSubscription(subscription: InsertSubscription): Promise<Subscription>;
  updateSubscription(id: string, subscription: Partial<InsertSubscription>, userEmail: string): Promise<Subscription | undefined>;
  deleteSubscription(id: string, userEmail: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  // User management
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  // Subscription management (user-specific)
  async getSubscription(id: string, userEmail: string): Promise<Subscription | undefined> {
    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(and(eq(subscriptions.id, id), eq(subscriptions.userEmail, userEmail)));
    return subscription || undefined;
  }

  async getAllSubscriptions(userEmail: string): Promise<Subscription[]> {
    return await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userEmail, userEmail));
  }

  async createSubscription(insertSubscription: InsertSubscription): Promise<Subscription> {
    const [subscription] = await db
      .insert(subscriptions)
      .values({
        ...insertSubscription,
        renewalDate: new Date(insertSubscription.renewalDate),
        lastUsed: new Date(),
      })
      .returning();
    return subscription;
  }

  async updateSubscription(id: string, updateData: Partial<InsertSubscription>, userEmail: string): Promise<Subscription | undefined> {
    const processedData = {
      ...updateData,
      renewalDate: updateData.renewalDate ? new Date(updateData.renewalDate) : undefined,
    };

    const [updated] = await db
      .update(subscriptions)
      .set(processedData)
      .where(and(eq(subscriptions.id, id), eq(subscriptions.userEmail, userEmail)))
      .returning();
    
    return updated || undefined;
  }

  async deleteSubscription(id: string, userEmail: string): Promise<boolean> {
    const result = await db
      .delete(subscriptions)
      .where(and(eq(subscriptions.id, id), eq(subscriptions.userEmail, userEmail)))
      .returning({ id: subscriptions.id });
    
    return result.length > 0;
  }
}

export const storage = new DatabaseStorage();