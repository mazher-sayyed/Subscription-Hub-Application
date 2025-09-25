import "express-session";

declare module "express-session" {
  interface SessionData {
    userEmail?: string;
    userId?: string;
    userName?: string;
  }
}