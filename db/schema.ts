import { pgTable, text, integer, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  email: text("email").unique().notNull(),
  password: text("password").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  companyName: text("company_name"),
  role: text("role").default("customer").notNull(),
  isApproved: boolean("is_approved").default(false).notNull(),
  profileImage: text("profile_image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastActive: timestamp("last_active"),
});

export const tutorials = pgTable("tutorials", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  videoUrl: text("video_url").notNull(),
  category: text("category").notNull(),
  isOnboarding: boolean("is_onboarding").default(false),
  order: integer("order").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const userProgress = pgTable("user_progress", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id").references(() => users.id).notNull(),
  tutorialId: integer("tutorial_id").references(() => tutorials.id).notNull(),
  completed: boolean("completed").default(false),
  completedAt: timestamp("completed_at"),
});

export const metrics = pgTable("metrics", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id").references(() => users.id).notNull(),
  leads: integer("leads").default(0),
  adSpend: integer("ad_spend").default(0),
  clicks: integer("clicks").default(0),
  impressions: integer("impressions").default(0),
  date: timestamp("date").defaultNow().notNull(),
});

export const referrals = pgTable("referrals", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  referrerId: integer("referrer_id").references(() => users.id).notNull(),
  referredId: integer("referred_id").references(() => users.id),
  code: text("code").unique().notNull(),
  status: text("status").default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const callbacks = pgTable("callbacks", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id").references(() => users.id).notNull(),
  phone: text("phone").notNull(),
  status: text("status").default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Zod Schemas
export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);
export const insertTutorialSchema = createInsertSchema(tutorials);
export const selectTutorialSchema = createSelectSchema(tutorials);
export const insertProgressSchema = createInsertSchema(userProgress);
export const selectProgressSchema = createSelectSchema(userProgress);
export const insertMetricsSchema = createInsertSchema(metrics);
export const selectMetricsSchema = createSelectSchema(metrics);

// Types
export type User = z.infer<typeof selectUserSchema>;
export type Tutorial = z.infer<typeof selectTutorialSchema>;
export type UserProgress = z.infer<typeof selectProgressSchema>;
export type Metrics = z.infer<typeof selectMetricsSchema>;