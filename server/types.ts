import { Request } from "express";
import { Session } from "express-session";
import { type InferModel } from "drizzle-orm";
import { users } from "@db/schema";

// Define the User type from the schema
export type User = InferModel<typeof users, "select">;

declare module 'express-session' {
  interface SessionData {
    userId?: number;
  }
}

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}
