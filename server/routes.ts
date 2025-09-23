import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertSubscriptionSchema, insertUserSchema } from "@shared/schema";
import "./types"; // Import session type extensions

// Authentication middleware
const requireAuth = (req: any, res: any, next: any) => {
  if (!req.session?.userEmail) {
    return res.status(401).json({ message: "Authentication required" });
  }
  next();
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, name } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      // Check if user exists
      let user = await storage.getUserByEmail(email);
      
      if (!user) {
        // Create new user
        const validatedData = insertUserSchema.parse({ email, name: name || "" });
        user = await storage.createUser(validatedData);
      }

      // Set session
      req.session.userEmail = user.email;
      req.session.userId = user.id;

      res.json({ user: { email: user.email, name: user.name } });
    } catch (error: any) {
      if (error.issues) {
        return res.status(400).json({ message: "Validation failed", errors: error.issues });
      }
      res.status(500).json({ message: "Failed to login" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err: any) => {
      if (err) {
        return res.status(500).json({ message: "Failed to logout" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/auth/me", (req, res) => {
    if (!req.session?.userEmail) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    res.json({ 
      user: { 
        email: req.session.userEmail,
        name: req.session.userName || ""
      } 
    });
  });

  // Protected subscription routes
  app.get("/api/subscriptions", requireAuth, async (req: any, res) => {
    try {
      const subscriptions = await storage.getAllSubscriptions(req.session.userEmail);
      res.json(subscriptions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch subscriptions" });
    }
  });

  app.get("/api/subscriptions/:id", requireAuth, async (req: any, res) => {
    try {
      const subscription = await storage.getSubscription(req.params.id, req.session.userEmail);
      if (!subscription) {
        return res.status(404).json({ message: "Subscription not found" });
      }
      res.json(subscription);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch subscription" });
    }
  });

  app.post("/api/subscriptions", requireAuth, async (req: any, res) => {
    try {
      const validatedData = insertSubscriptionSchema.parse({
        ...req.body,
        userEmail: req.session.userEmail
      });
      const subscription = await storage.createSubscription(validatedData);
      res.status(201).json(subscription);
    } catch (error: any) {
      if (error.issues) {
        return res.status(400).json({ message: "Validation failed", errors: error.issues });
      }
      res.status(500).json({ message: "Failed to create subscription" });
    }
  });

  app.patch("/api/subscriptions/:id", requireAuth, async (req: any, res) => {
    try {
      // Validate partial data
      const partialSchema = insertSubscriptionSchema.partial().omit({ userEmail: true });
      const validatedData = partialSchema.parse(req.body);
      
      const subscription = await storage.updateSubscription(req.params.id, validatedData, req.session.userEmail);
      if (!subscription) {
        return res.status(404).json({ message: "Subscription not found" });
      }
      res.json(subscription);
    } catch (error: any) {
      if (error.issues) {
        return res.status(400).json({ message: "Validation failed", errors: error.issues });
      }
      res.status(500).json({ message: "Failed to update subscription" });
    }
  });

  app.delete("/api/subscriptions/:id", requireAuth, async (req: any, res) => {
    try {
      const deleted = await storage.deleteSubscription(req.params.id, req.session.userEmail);
      if (!deleted) {
        return res.status(404).json({ message: "Subscription not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete subscription" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}