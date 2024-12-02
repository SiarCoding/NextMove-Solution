import { Request } from "express";
import { type InferModel } from "drizzle-orm";
import { users } from "@db/schema";

// Define the User type from the schema
export type User = InferModel<typeof users, "select">;

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

declare module "express-session" {
  interface SessionData {
    userId?: number;
  }
}
