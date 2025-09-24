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
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 86400000, // 24 hours
    sameSite: 'lax' as const
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

    console.log('=== ATTACH USER DEBUG ===');
    console.log('Session ID:', req.sessionID);
    console.log('Session exists:', !!req.session);
    console.log('Session data:', req.session);
    console.log('========================');

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
  console.log('=== REQUIRE AUTH DEBUG ===');
  console.log('URL:', req.url);
  console.log('Method:', req.method);
  console.log('Session ID:', req.sessionID);
  console.log('Is authenticated:', req.isAuthenticated);
  console.log('Current user exists:', !!req.currentUser);
  console.log('=========================');
  
  if (!req.isAuthenticated || !req.currentUser) {
    console.log('❌ AUTHENTICATION FAILED');
    return res.status(401).json({ 
      message: 'Authentication required',
      authenticated: false 
    });
  }
  console.log('✅ AUTHENTICATION PASSED');
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