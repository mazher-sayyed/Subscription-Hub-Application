import { type Subscription, type InsertSubscription } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getSubscription(id: string): Promise<Subscription | undefined>;
  getAllSubscriptions(): Promise<Subscription[]>;
  createSubscription(subscription: InsertSubscription): Promise<Subscription>;
  updateSubscription(id: string, subscription: Partial<InsertSubscription>): Promise<Subscription | undefined>;
  deleteSubscription(id: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private subscriptions: Map<string, Subscription>;

  constructor() {
    this.subscriptions = new Map();
    
    // Initialize with some sample data
    this.initializeData();
  }

  private initializeData() {
    const sampleSubscriptions: Omit<Subscription, 'id'>[] = [
      {
        name: "Netflix Premium",
        category: "Streaming", 
        cost: "15.99",
        billingCycle: "monthly",
        renewalDate: new Date("2024-12-28"),
        status: "expiring",
        logoUrl: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=60",
        description: "Premium streaming service",
        lastUsed: new Date("2024-12-20")
      },
      {
        name: "Spotify Premium",
        category: "Music",
        cost: "9.99", 
        billingCycle: "monthly",
        renewalDate: new Date("2025-01-15"),
        status: "active",
        logoUrl: "https://images.unsplash.com/photo-1611339555312-e607c8352fd7?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=60",
        description: "Music streaming service",
        lastUsed: new Date("2024-12-23")
      },
      {
        name: "Adobe Creative Cloud",
        category: "Software",
        cost: "52.99",
        billingCycle: "monthly", 
        renewalDate: new Date("2025-01-06"),
        status: "active",
        logoUrl: "https://images.unsplash.com/photo-1611224923853-80b023f02d71?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=60",
        description: "Creative design software suite",
        lastUsed: new Date("2024-12-22")
      },
      {
        name: "Microsoft 365",
        category: "Productivity",
        cost: "12.99",
        billingCycle: "monthly",
        renewalDate: new Date("2025-02-12"),
        status: "active", 
        logoUrl: "https://images.unsplash.com/photo-1633419461186-7d40a38105ec?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=60",
        description: "Office productivity suite",
        lastUsed: new Date("2024-12-21")
      },
      {
        name: "Dropbox Plus",
        category: "Cloud Storage",
        cost: "9.99",
        billingCycle: "monthly",
        renewalDate: new Date("2025-01-22"),
        status: "active",
        logoUrl: "https://images.unsplash.com/photo-1544717305-2782549b5136?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=60", 
        description: "Cloud storage service",
        lastUsed: new Date("2024-12-19")
      },
      {
        name: "Amazon Prime",
        category: "Streaming",
        cost: "14.99",
        billingCycle: "monthly",
        renewalDate: new Date("2024-12-01"),
        status: "inactive",
        logoUrl: "https://images.unsplash.com/photo-1523474253046-8cd2748b5fd2?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=60",
        description: "Prime membership with streaming",
        lastUsed: new Date("2024-11-28")
      }
    ];

    sampleSubscriptions.forEach(sub => {
      const id = randomUUID();
      this.subscriptions.set(id, { ...sub, id });
    });
  }

  async getSubscription(id: string): Promise<Subscription | undefined> {
    return this.subscriptions.get(id);
  }

  async getAllSubscriptions(): Promise<Subscription[]> {
    return Array.from(this.subscriptions.values());
  }

  async createSubscription(insertSubscription: InsertSubscription): Promise<Subscription> {
    const id = randomUUID();
    const subscription: Subscription = {
      ...insertSubscription,
      id,
      renewalDate: new Date(insertSubscription.renewalDate),
      lastUsed: new Date(),
      description: insertSubscription.description || null,
      logoUrl: insertSubscription.logoUrl || null
    };
    this.subscriptions.set(id, subscription);
    return subscription;
  }

  async updateSubscription(id: string, updateData: Partial<InsertSubscription>): Promise<Subscription | undefined> {
    const existing = this.subscriptions.get(id);
    if (!existing) return undefined;

    const updated: Subscription = {
      ...existing,
      ...updateData,
      renewalDate: updateData.renewalDate ? new Date(updateData.renewalDate) : existing.renewalDate
    };
    
    this.subscriptions.set(id, updated);
    return updated;
  }

  async deleteSubscription(id: string): Promise<boolean> {
    return this.subscriptions.delete(id);
  }
}

export const storage = new MemStorage();
