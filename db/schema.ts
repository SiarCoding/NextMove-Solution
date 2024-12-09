import { pgTable, text, integer, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

export const companies = pgTable("companies", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  adminId: integer("admin_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const users = pgTable("users", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  email: text("email").unique().notNull(),
  password: text("password").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  companyId: integer("company_id").references(() => companies.id),
  role: text("role").default("customer").notNull(),
  isApproved: boolean("is_approved").default(false).notNull(),
  profileImage: text("profile_image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastActive: timestamp("last_active"),
  assignedAdmin: text("assigned_admin").notNull().default("admin@nextmove.de"),
  onboardingCompleted: boolean("onboarding_completed").default(false).notNull(),
  isFirstLogin: boolean("is_first_login").default(true).notNull(),
  currentPhase: text("current_phase").default("Checkliste").notNull(),
  completedPhases: jsonb("completed_phases").default([]).notNull(),
  progress: integer("progress").default(0).notNull(),
  googleAccessToken: text("google_access_token"),
  googleRefreshToken: text("google_refresh_token"),
  googleTokenExpiry: timestamp("google_token_expiry"),
  googleDriveConnected: boolean("google_drive_connected").default(false).notNull(),
  metaAccessToken: text("meta_access_token"),
  metaConnected: boolean("meta_connected").default(false).notNull(),
});

export const tutorials = pgTable("tutorials", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  videoUrl: text("video_url").notNull(),
  thumbnailUrl: text("thumbnail_url"),
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

export const adminCustomerRelations = pgTable("admin_customer_relations", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  adminId: integer("admin_id").references(() => users.id).notNull(),
  customerId: integer("customer_id").references(() => users.id).notNull(),
  assignedAt: timestamp("assigned_at").defaultNow().notNull(),
});

export const customerChecklist = pgTable("customer_checklist", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id").references(() => users.id).notNull(),
  paymentOption: text("payment_option").notNull(),
  paymentMethod: text("payment_method"),
  taxId: text("tax_id").notNull(),
  domain: text("domain").notNull(),
  targetAudience: text("target_audience"),
  companyInfo: text("company_info"),
  targetGroupGender: text("target_group_gender"),
  targetGroupAge: text("target_group_age"),
  targetGroupLocation: text("target_group_location"),
  targetGroupInterests: text("target_group_interests").array(),
  uniqueSellingPoint: text("unique_selling_point"),
  marketSize: text("market_size"),
  webDesign: jsonb("web_design").notNull(),
  marketResearch: jsonb("market_research").notNull(),
  legalInfo: jsonb("legal_info").notNull(),
  idealCustomerProfile: jsonb("ideal_customer_profile").notNull(),
  qualificationQuestions: jsonb("qualification_questions").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id").references(() => users.id).notNull(),
  token: text("token").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  used: boolean("used").default(false).notNull(),
});

export const passwordResetTokensRelations = relations(passwordResetTokens, ({ one }) => ({
  user: one(users, {
    fields: [passwordResetTokens.userId],
    references: [users.id],
  }),
}));

export const companySettings = pgTable("company_settings", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  companyName: text("company_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  address: text("address").notNull(),
  logoUrl: text("logo_url"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
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
export const insertPasswordResetTokenSchema = createInsertSchema(passwordResetTokens);
export const selectPasswordResetTokenSchema = createSelectSchema(passwordResetTokens);
export const insertCompanySettingsSchema = createInsertSchema(companySettings);
export const selectCompanySettingsSchema = createSelectSchema(companySettings);

// Types
export type User = z.infer<typeof selectUserSchema>;
export type Tutorial = z.infer<typeof selectTutorialSchema>;
export type UserProgress = z.infer<typeof selectProgressSchema>;
export type Metrics = z.infer<typeof selectMetricsSchema>;
export type PasswordResetToken = z.infer<typeof selectPasswordResetTokenSchema>;
export type CompanySettings = z.infer<typeof selectCompanySettingsSchema>;
