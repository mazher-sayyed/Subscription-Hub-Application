import { type Subscription, type InsertSubscription, type User, type InsertUser, type AvailableService, type ServiceLaunch, type InsertServiceLaunch, users, subscriptions, availableServices, serviceLaunches } from "@shared/schema";
import { db } from "./db";
import { eq, and, sql, lte, gte, isNotNull } from "drizzle-orm";

export interface IStorage {
  // User management
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Subscription management (user-specific)
  getSubscription(id: string, userEmail: string): Promise<Subscription | undefined>;
  getAllSubscriptions(userEmail: string): Promise<Subscription[]>;
  getExpiringSubscriptions(userEmail: string, daysAhead: number): Promise<Subscription[]>;
  createSubscription(subscription: InsertSubscription): Promise<Subscription>;
  updateSubscription(id: string, subscription: Partial<InsertSubscription>, userEmail: string): Promise<Subscription | undefined>;
  deleteSubscription(id: string, userEmail: string): Promise<boolean>;

  // Available services marketplace
  getAllAvailableServices(): Promise<AvailableService[]>;
  getAvailableService(id: string): Promise<AvailableService | undefined>;
  
  // Service launch tracking
  trackServiceLaunch(launch: InsertServiceLaunch): Promise<ServiceLaunch>;
  getUserLaunchStats(userEmail: string): Promise<{ serviceName: string; launchCount: number; lastLaunched: Date }[]>;
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
        expirationDate: insertSubscription.expirationDate ? new Date(insertSubscription.expirationDate) : null,
        lastUsed: new Date(),
      })
      .returning();
    return subscription;
  }

  async updateSubscription(id: string, updateData: Partial<InsertSubscription>, userEmail: string): Promise<Subscription | undefined> {
    const processedData = {
      ...updateData,
      renewalDate: updateData.renewalDate ? new Date(updateData.renewalDate) : undefined,
      expirationDate: updateData.expirationDate ? new Date(updateData.expirationDate) : undefined,
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

  // Enhanced expiration tracking
  async getExpiringSubscriptions(userEmail: string, daysAhead: number): Promise<Subscription[]> {
    const today = new Date();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() + daysAhead);
    
    return await db
      .select()
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.userEmail, userEmail),
          isNotNull(subscriptions.expirationDate),
          gte(subscriptions.expirationDate, today), // Only future expirations
          lte(subscriptions.expirationDate, cutoffDate) // Within the specified days
        )
      );
  }

  // Available services marketplace
  async getAllAvailableServices(): Promise<AvailableService[]> {
    return await db
      .select()
      .from(availableServices);
  }

  async getAvailableService(id: string): Promise<AvailableService | undefined> {
    const [service] = await db
      .select()
      .from(availableServices)
      .where(eq(availableServices.id, id));
    return service || undefined;
  }

  // Service launch tracking
  async trackServiceLaunch(insertLaunch: InsertServiceLaunch): Promise<ServiceLaunch> {
    const [launch] = await db
      .insert(serviceLaunches)
      .values(insertLaunch)
      .returning();
    return launch;
  }

  async getUserLaunchStats(userEmail: string): Promise<{ serviceName: string; launchCount: number; lastLaunched: Date }[]> {
    const results = await db
      .select({
        serviceName: serviceLaunches.serviceName,
        launchCount: sql<number>`count(*)`,
        lastLaunched: sql<Date>`max(${serviceLaunches.launchedAt})`,
      })
      .from(serviceLaunches)
      .where(eq(serviceLaunches.userEmail, userEmail))
      .groupBy(serviceLaunches.serviceName)
      .orderBy(sql`max(${serviceLaunches.launchedAt}) desc`);
    
    return results.map(result => ({
      serviceName: result.serviceName,
      launchCount: Number(result.launchCount),
      lastLaunched: result.lastLaunched,
    }));
  }
}

export const storage = new DatabaseStorage();