import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertSubscriptionSchema, insertUserSchema } from "@shared/schema";
import { requireAuth, loginUser, logoutUser, type AuthenticatedRequest } from "./auth";

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication routes - completely rewritten
  app.post("/api/auth/login", async (req: AuthenticatedRequest, res) => {
    try {
      const { email, name } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      // Use the new login helper from auth module
      const user = await loginUser(req, storage, email, name);
      
      res.json({ 
        user: { 
          id: user.id,
          email: user.email, 
          name: user.name 
        },
        authenticated: true
      });
    } catch (error: any) {
      console.error('Login error:', error);
      if (error.issues) {
        return res.status(400).json({ message: "Validation failed", errors: error.issues });
      }
      res.status(500).json({ message: "Failed to login" });
    }
  });

  app.post("/api/auth/logout", async (req: AuthenticatedRequest, res) => {
    try {
      await logoutUser(req);
      res.json({ message: "Logged out successfully", authenticated: false });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ message: "Failed to logout" });
    }
  });

  app.get("/api/auth/me", async (req: AuthenticatedRequest, res) => {
    if (!req.isAuthenticated || !req.currentUser) {
      return res.status(401).json({ 
        message: "Not authenticated", 
        authenticated: false 
      });
    }
    
    res.json({ 
      user: {
        id: req.currentUser.id,
        email: req.currentUser.email,
        name: req.currentUser.name
      },
      authenticated: true
    });
  });

  // Protected subscription routes - rewritten with new auth
  app.get("/api/subscriptions", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const subscriptions = await storage.getAllSubscriptions(req.currentUser!.email);
      res.json(subscriptions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch subscriptions" });
    }
  });

  // Get expiring subscriptions - MUST come before /:id route
  app.get("/api/subscriptions/expiring", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const days = parseInt(req.query.days as string) || 30; // Default to 30 days
      const expiringSubscriptions = await storage.getExpiringSubscriptions(req.currentUser!.email, days);
      res.json(expiringSubscriptions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch expiring subscriptions" });
    }
  });

  app.get("/api/subscriptions/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const subscription = await storage.getSubscription(req.params.id, req.currentUser!.email);
      if (!subscription) {
        return res.status(404).json({ message: "Subscription not found" });
      }
      res.json(subscription);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch subscription" });
    }
  });

  app.post("/api/subscriptions", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      // Parse request body (userEmail excluded from schema, added by storage)
      const validatedData = insertSubscriptionSchema.parse(req.body);
      const subscription = await storage.createSubscription(validatedData, req.currentUser!.email);
      res.status(201).json(subscription);
    } catch (error: any) {
      if (error.issues) {
        return res.status(400).json({ message: "Validation failed", errors: error.issues });
      }
      res.status(500).json({ message: "Failed to create subscription" });
    }
  });

  app.patch("/api/subscriptions/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      // Validate partial data (userEmail already excluded from insertSubscriptionSchema)
      const partialSchema = insertSubscriptionSchema.partial();
      const validatedData = partialSchema.parse(req.body);
      
      const subscription = await storage.updateSubscription(req.params.id, validatedData, req.currentUser!.email);
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

  app.delete("/api/subscriptions/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const deleted = await storage.deleteSubscription(req.params.id, req.currentUser!.email);
      if (!deleted) {
        return res.status(404).json({ message: "Subscription not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete subscription" });
    }
  });


  // One-click subscription from marketplace
  app.post("/api/subscriptions/subscribe", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { serviceId, planId } = req.body;
      
      if (!serviceId || !planId) {
        return res.status(400).json({ message: "Service ID and Plan ID are required" });
      }

      // Get the available service
      const service = await storage.getAvailableService(serviceId);
      if (!service) {
        return res.status(404).json({ message: "Service not found" });
      }

      // Find the selected plan
      const selectedPlan = service.plans.find((plan: any) => plan.id === planId);
      if (!selectedPlan) {
        return res.status(404).json({ message: "Plan not found" });
      }

      // Calculate renewal and expiration dates
      const now = new Date();
      const renewalDate = new Date(now);
      const expirationDate = new Date(now);
      
      if (selectedPlan.billingCycle === 'annual') {
        renewalDate.setFullYear(renewalDate.getFullYear() + 1);
        expirationDate.setFullYear(expirationDate.getFullYear() + 1);
      } else {
        renewalDate.setMonth(renewalDate.getMonth() + 1);
        expirationDate.setMonth(expirationDate.getMonth() + 1);
      }
      
      // Create subscription with auto-populated data
      const subscriptionData = {
        name: `${service.name} - ${selectedPlan.name}`,
        category: service.category,
        cost: selectedPlan.price.toString(),
        billingCycle: selectedPlan.billingCycle,
        renewalDate: renewalDate.toISOString(),
        expirationDate: expirationDate.toISOString(),
        status: 'active',
        logoUrl: service.logoUrl,
        description: service.description,

      };

      const subscription = await storage.createSubscription(subscriptionData, req.currentUser!.email);
      res.status(201).json(subscription);
    } catch (error: any) {
      console.error('Subscription error:', error);
      console.error('Error stack:', error.stack);
      console.error('Error message:', error.message);
      if (error.issues) {
        return res.status(400).json({ message: "Validation failed", errors: error.issues });
      }
      res.status(500).json({ message: "Failed to subscribe to service" });
    }
  });

  // Available streaming services marketplace
  app.get("/api/available-services", async (req, res) => {
    try {
      const services = await storage.getAllAvailableServices();
      res.json(services);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch available services" });
    }
  });

  app.get("/api/available-services/:id", async (req, res) => {
    try {
      const service = await storage.getAvailableService(req.params.id);
      if (!service) {
        return res.status(404).json({ message: "Service not found" });
      }
      res.json(service);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch service" });
    }
  });

  // Service launch tracking
  app.post("/api/subscriptions/:id/launch", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const subscriptionId = req.params.id;
      
      // Get subscription to verify ownership and get service name
      const subscription = await storage.getSubscription(subscriptionId, req.currentUser!.email);
      if (!subscription) {
        return res.status(404).json({ message: "Subscription not found" });
      }
      
      // Track the launch
      const launch = await storage.trackServiceLaunch({
        subscriptionId,
        userEmail: req.currentUser!.email,
        serviceName: subscription.name
      });
      
      // Update lastUsed timestamp
      await storage.updateSubscription(subscriptionId, { lastUsed: new Date() }, req.currentUser!.email);
      
      res.json({ success: true, launch });
    } catch (error) {
      console.error('Launch tracking error:', error);
      res.status(500).json({ message: "Failed to track launch" });
    }
  });
  
  // Get user launch statistics
  app.get("/api/users/launch-stats", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const stats = await storage.getUserLaunchStats(req.currentUser!.email);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch launch stats" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}