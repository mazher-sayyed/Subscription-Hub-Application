import { Request, Response, NextFunction } from 'express';
import session from 'express-session';
import MemoryStore from 'memorystore';
import { User } from '@shared/schema';

// Create persistent session store for development
const MemoryStoreSession = MemoryStore(session);

// Session configuration with persistent storage
export const sessionConfig = {
  secret: process.env.SESSION_SECRET || 'development-secret-key',
  resave: false,
  saveUninitialized: false,
  store: new MemoryStoreSession({
    checkPeriod: 86400000, // Prune expired entries every 24h
    ttl: 86400000, // Session TTL of 24h
    stale: false // Don't serve stale sessions
  }),
  cookie: {
    secure: false, // Allow non-HTTPS in development
    httpOnly: false, // Allow client access for debugging
    maxAge: 86400000, // 24 hours
    sameSite: 'none' as const, // More permissive for development
    domain: undefined // Don't restrict domain
  },
  name: 'streaming.session' // Custom session name
};

// Extended session data interface
declare module 'express-session' {
  interface SessionData {
    userId?: string;
    user?: User;
    isAuthenticated?: boolean;
  }
}

// Enhanced request interface with user
export interface AuthenticatedRequest extends Request {
  currentUser?: User;
  isAuthenticated: boolean;
}

// Middleware to attach current user to request
export function attachUser(storage: any) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    req.isAuthenticated = false;
    req.currentUser = undefined;


    if (req.session?.userId && req.session?.isAuthenticated) {
      try {
        const user = await storage.getUserById(req.session.userId);
        if (user) {
          req.currentUser = user;
          req.isAuthenticated = true;
          req.session.user = user; // Keep session fresh
        } else {
          // User deleted, clear session
          req.session.destroy(() => {});
        }
      } catch (error) {
        console.error('Error fetching user:', error);
        req.session.destroy(() => {});
      }
    }
    
    next();
  };
}

// Authentication middleware for protected routes
export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.isAuthenticated || !req.currentUser) {
    return res.status(401).json({ 
      message: 'Authentication required',
      authenticated: false 
    });
  }
  next();
}

// Login helper function
export async function loginUser(req: AuthenticatedRequest, storage: any, email: string, name?: string) {
  // Find or create user
  let user = await storage.getUserByEmail(email);
  
  if (!user) {
    user = await storage.createUser({ email, name: name || 'User' });
  }

  // Regenerate session for security
  return new Promise<User>((resolve, reject) => {
    req.session.regenerate((err) => {
      if (err) {
        reject(err);
        return;
      }

      // Set session data
      req.session.userId = user.id;
      req.session.user = user;
      req.session.isAuthenticated = true;

      // Save session
      req.session.save((err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(user);
      });
    });
  });
}

// Logout helper function  
export async function logoutUser(req: AuthenticatedRequest) {
  return new Promise<void>((resolve, reject) => {
    req.session.destroy((err) => {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });
}