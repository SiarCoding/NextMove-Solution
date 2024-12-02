Ich baue aktuell ein Kundenportal in React und so sieht mein Routen routes.ts aus: "import { type Express, type Request, type Response } from "express";
import bcrypt from "bcryptjs";
import { and, eq, desc, gte } from "drizzle-orm";
import { db } from "db";
import {
  users,
  tutorials,
  userProgress,
  metrics,
  referrals,
  callbacks,
  companySettings,
  companies,
} from "@db/schema";
import { uploadFile } from "./upload";
import multer from "multer";
import path from "path";
import "./types";
import { type User } from "./types";

// Middleware to check if user is authenticated
const requireAuth = async (req: Request, res: Response, next: Function) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Nicht authentifiziert" });
  }

  try {
    // Verify user exists in database
    const user = await db.query.users.findFirst({
      where: eq(users.id, req.session.userId)
    });

    if (!user) {
      req.session.destroy(() => {});
      return res.status(401).json({ error: "Nicht authentifiziert" });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    return res.status(500).json({ error: "Serverfehler" });
  }
};

// Middleware to check if user is admin
const requireAdmin = async (req: Request, res: Response, next: Function) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Nicht authentifiziert" });
  }

  try {
    // Verify user exists in database
    const user = await db.query.users.findFirst({
      where: eq(users.id, req.session.userId)
    });

    if (!user || user.role !== "admin") {
      return res.status(403).json({ error: "Keine Berechtigung" });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Admin middleware error:", error);
    return res.status(500).json({ error: "Serverfehler" });
  }
};

export function registerRoutes(app: Express) {
  // Auth routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { email, password, firstName, lastName } = req.body;

      // Check if user already exists
      const existingUser = await db.query.users.findFirst({
        where: eq(users.email, email)
      });

      if (existingUser) {
        return res.status(400).json({ error: "E-Mail bereits registriert" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      const [user] = await db.insert(users)
        .values({
          email,
          password: hashedPassword,
          firstName,
          lastName,
          role: "customer",
          assignedAdmin: "admin@nextmove.de",
          isApproved: false,
          onboardingCompleted: false
        })
        .returning();

      res.status(201).json({ message: "Registrierung erfolgreich" });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ error: "Registrierung fehlgeschlagen" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;

      const user = await db.query.users.findFirst({
        where: eq(users.email, email)
      }) as User | undefined;

      if (!user || user.role !== "customer") {
        return res.status(401).json({ error: "Ungültige Anmeldedaten" });
      }

      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ error: "Ungültige Anmeldedaten" });
      }

      // Set session
      req.session.userId = user.id;
      await req.session.save();

      // Return user without password
      const { password: _, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Serverfehler" });
    }
  });

  // Admin seed route (nur für Entwicklung)
  app.post("/api/auth/admin/seed", async (req, res) => {
    try {
      const { email, password } = req.body;

      // Überprüfen Sie, ob bereits ein Admin existiert
      const existingAdmin = await db.query.users.findFirst({
        where: eq(users.email, email)
      });

      if (existingAdmin) {
        return res.status(400).json({ error: "Admin existiert bereits" });
      }

      // Admin-Benutzer erstellen
      const hashedPassword = await bcrypt.hash(password, 10);
      const [admin] = await db.insert(users)
        .values({
          email,
          password: hashedPassword,
          firstName: "Admin",
          lastName: "User",
          role: "admin",
          isApproved: true,
          onboardingCompleted: true,
          currentPhase: "Complete",
          progress: 100
        })
        .returning();

      res.status(201).json({ message: "Admin erfolgreich erstellt", admin: { ...admin, password: undefined } });
    } catch (error) {
      console.error("Admin seed error:", error);
      res.status(500).json({ error: "Fehler beim Erstellen des Admins" });
    }
  });

  app.post("/api/auth/admin/login", async (req, res) => {
    try {
      const { email, password } = req.body;

      const user = await db.query.users.findFirst({
        where: and(
          eq(users.email, email),
          eq(users.role, "admin")
        )
      });

      if (!user) {
        return res.status(401).json({ error: "Ungültige Anmeldedaten" });
      }

      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ error: "Ungültige Anmeldedaten" });
      }

      // Session setzen
      req.session.userId = user.id;
      await req.session.save();

      // Benutzer ohne Passwort zurückgeben
      const { password: _, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword });
    } catch (error) {
      console.error("Admin login error:", error);
      res.status(500).json({ error: "Serverfehler" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Abmeldung fehlgeschlagen" });
      }
      res.json({ message: "Erfolgreich abgemeldet" });
    });
  });

  app.get("/api/auth/session", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Nicht authentifiziert" });
      }

      const user = await db.query.users.findFirst({
        where: eq(users.id, req.session.userId)
      });

      if (!user) {
        req.session.destroy(() => {});
        return res.status(401).json({ error: "Nicht authentifiziert" });
      }

      res.json({ user: { ...user, password: undefined } });
    } catch (error) {
      console.error("Session check error:", error);
      res.status(500).json({ error: "Serverfehler" });
    }
  });

  // User approval routes
  app.get("/api/admin/users/pending", requireAdmin, async (req, res) => {
    try {
      const pendingUsers = await db.query.users.findMany({
        where: and(
          eq(users.role, "customer"),
          eq(users.isApproved, false)
        )
      });

      res.json(pendingUsers.map(user => ({ ...user, password: undefined })));
    } catch (error) {
      console.error("Error fetching pending users:", error);
      res.status(500).json({ error: "Failed to fetch pending users" });
    }
  });

  app.post("/api/admin/users/:id/approve", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;

      await db.update(users)
        .set({ isApproved: true })
        .where(eq(users.id, parseInt(id)));

      res.json({ message: "User approved successfully" });
    } catch (error) {
      console.error("Error approving user:", error);
      res.status(500).json({ error: "Failed to approve user" });
    }
  });

  // Customer tracking routes
  app.get("/api/admin/customers/tracking", requireAdmin, async (req, res) => {
    try {
      // Get the admin's email
      const userId = req.session.userId as number;
      const adminUser = await db.query.users.findFirst({
        where: eq(users.id, userId)
      });

      if (!adminUser) {
        return res.status(404).json({ error: "Admin not found" });
      }

      // Get customers assigned to this admin
      const customers = await db.query.users.findMany({
        where: and(
          eq(users.role, "customer"),
          eq(users.assignedAdmin, adminUser.email)
        ),
        columns: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          createdAt: true,
          lastActive: true,
          progress: true,
          currentPhase: true,
          completedPhases: true,
          onboardingCompleted: true,
          assignedAdmin: true
        }
      });

      res.json(customers);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch customer tracking" });
    }
  });

  // Onboarding routes
  app.post("/api/onboarding/checklist", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ error: "Nicht authentifiziert" });
      }

      const checklistData = req.body;

      // Update user's onboarding status
      const result = await db
        .update(users)
        .set({
          onboardingCompleted: true,
          currentPhase: "Abgeschlossen",
          completedPhases: ["Willkommen", "Einführungsvideo", "Checkliste"],
          progress: 100,
        })
        .where(eq(users.id, Number(userId)))
        .returning({ updated: users.onboardingCompleted });

      if (!result?.[0]?.updated) {
        return res.status(500).json({ error: "Fehler beim Aktualisieren des Benutzerstatus" });
      }
      
      res.json({ success: true, message: "Onboarding erfolgreich abgeschlossen" });
    } catch (error) {
      console.error("Error saving checklist:", error);
      res.status(500).json({ error: "Fehler beim Speichern der Checkliste" });
    }
  });

  app.post("/api/customer/onboarding/complete", requireAuth, async (req, res) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      await db.update(users)
        .set({ 
          onboardingCompleted: true,
          currentPhase: "Setup",
          progress: 25
        })
        .where(eq(users.id, req.user.id));

      res.json({ message: "Onboarding completed successfully" });
    } catch (error) {
      console.error("Error completing onboarding:", error);
      res.status(500).json({ error: "Failed to complete onboarding" });
    }
  });

  // Admin settings routes
  app.get("/api/admin/settings", requireAdmin, async (req, res) => {
    try {
      const settings = await db.query.companySettings.findFirst({
        orderBy: desc(companySettings.updatedAt)
      });

      res.json(settings);
    } catch (error) {
      console.error("Error fetching settings:", error);
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  app.post("/api/admin/settings", requireAdmin, async (req, res) => {
    try {
      const { companyName, email, phone, address } = req.body;

      let existingSettings = await db.query.companySettings.findFirst({
        orderBy: desc(companySettings.updatedAt)
      });

      if (existingSettings) {
        await db.update(companySettings)
          .set({
            companyName,
            email,
            phone,
            address,
            updatedAt: new Date()
          })
          .where(eq(companySettings.id, existingSettings.id));
      } else {
        [existingSettings] = await db.insert(companySettings)
          .values({
            companyName,
            email,
            phone,
            address
          })
          .returning();
      }

      // Update admin user
      await db.update(users)
        .set({ 
          companyId: existingSettings.id 
        })
        .where(eq(users.email, "admin@nextmove.de"));

      res.json({ message: "Einstellungen aktualisiert" });
    } catch (error) {
      console.error("Error updating settings:", error);
      res.status(500).json({ error: "Failed to update settings" });
    }
  });

  // Logo upload route
  const upload = multer({
    storage: multer.diskStorage({
      destination: "uploads/",
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
      }
    }),
    fileFilter: (req, file, cb) => {
      const allowedTypes = ["image/jpeg", "image/png", "image/gif"];
      if (!allowedTypes.includes(file.mimetype)) {
        cb(new Error("Invalid file type"));
        return;
      }
      cb(null, true);
    },
    limits: {
      fileSize: 10 * 1024 * 1024 // 10MB
    }
  });

  app.post("/api/admin/logo", requireAdmin, upload.single("logo"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const file = await uploadFile(req.file);

      let existingSettings = await db.query.companySettings.findFirst({
        orderBy: desc(companySettings.updatedAt)
      });

      if (existingSettings) {
        await db.update(companySettings)
          .set({
            logoUrl: file.url,
            updatedAt: new Date()
          })
          .where(eq(companySettings.id, existingSettings.id));
      }

      res.json({ logoUrl: file.url });
    } catch (error) {
      console.error("Error uploading logo:", error);
      res.status(500).json({ error: "Failed to upload logo" });
    }
  });

  // Admin profile route
  app.get("/api/admin/profile", requireAdmin, async (req, res) => {
    try {
      const settings = await db.query.companySettings.findFirst({
        orderBy: desc(companySettings.updatedAt)
      });

      const adminUser = await db.query.users.findFirst({
        where: eq(users.email, "admin@nextmove.de")
      });

      res.json({ 
        profileImage: adminUser?.profileImage,
        companyName: settings?.companyName || "Admin Portal" 
      });
    } catch (error) {
      console.error("Error fetching admin profile:", error);
      res.status(500).json({ error: "Failed to fetch admin profile" });
    }
  });

  // Customer dashboard route
  app.get("/api/customer/dashboard", requireAuth, async (req, res) => {
    try {
      const user = await db.query.users.findFirst({
        where: eq(users.id, req.session.userId as number)
      });

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      if (!user.onboardingCompleted) {
        return res.json({ 
          showOnboarding: true,
          user: { ...user, password: undefined }
        });
      }

      // Get company information if the user belongs to a company
      let company = null;
      if (user.companyId) {
        company = await db.query.companies.findFirst({
          where: eq(companies.id, user.companyId)
        });
      }

      res.json({ 
        showOnboarding: false,
        user: { ...user, password: undefined },
        company
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch dashboard data" });
    }
  });

  // Customer routes
  app.get("/api/customer/admin-info", requireAuth, async (req, res) => {
    try {
      const user = await db.query.users.findFirst({
        where: eq(users.id, req.session.userId as number)
      });

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Get admin user's company settings
      const adminSettings = await db.query.companySettings.findFirst({
        where: eq(companySettings.email, user.assignedAdmin)
      });

      if (!adminSettings) {
        return res.status(404).json({ error: "Admin settings not found" });
      }

      res.json({
        companyName: adminSettings.companyName,
        email: adminSettings.email,
        logoUrl: adminSettings.logoUrl
      });
    } catch (error) {
      console.error("Error fetching admin info:", error);
      res.status(500).json({ error: "Failed to fetch admin info" });
    }
  });

  // Multi-company customer management routes
  app.get("/api/admin/customers", requireAdmin, async (req, res) => {
    try {
      const customers = await db.query.users.findMany({
        where: eq(users.role, "customer"),
        orderBy: (users, { desc }) => [desc(users.createdAt)]
      });

      const customersWithCompanies = await Promise.all(
        customers.map(async (customer) => {
          let companyName = "No Company";
          if (customer.companyId) {
            const company = await db.query.companies.findFirst({
              where: eq(companies.id, customer.companyId)
            });
            if (company) {
              companyName = company.name;
            }
          }
          return {
            ...customer,
            companyName,
            password: undefined
          };
        })
      );

      res.json(customersWithCompanies);
    } catch (error) {
      console.error("Error fetching customers:", error);
      res.status(500).json({ error: "Failed to fetch customers" });
    }
  });

  app.post("/api/admin/customers/:id/company", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { companyId } = req.body;

      await db.update(users)
        .set({ companyId })
        .where(eq(users.id, parseInt(id)));

      res.json({ message: "Customer company updated successfully" });
    } catch (error) {
      console.error("Error updating customer company:", error);
      res.status(500).json({ error: "Failed to update customer company" });
    }
  });

  app.post("/api/admin/companies", requireAdmin, async (req, res) => {
    try {
      const { name } = req.body;

      const newCompany = await db.insert(companies)
        .values({ name })
        .returning();

      res.json(newCompany[0]);
    } catch (error) {
      console.error("Error creating company:", error);
      res.status(500).json({ error: "Failed to create company" });
    }
  });

  app.get("/api/admin/companies", requireAdmin, async (req, res) => {
    try {
      const allCompanies = await db.query.companies.findMany({
        orderBy: (companies, { desc }) => [desc(companies.createdAt)]
      });

      res.json(allCompanies);
    } catch (error) {
      console.error("Error fetching companies:", error);
      res.status(500).json({ error: "Failed to fetch companies" });
    }
  });

  // Get admin dashboard stats
  app.get("/api/admin/stats", requireAdmin, async (req, res) => {
    try {
      const pendingApprovals = await db.query.users.findMany({
        where: and(
          eq(users.role, "customer"),
          eq(users.isApproved, false)
        )
      });

      const activeUsers = await db.query.users.findMany({
        where: and(
          eq(users.role, "customer"),
          eq(users.isApproved, true),
          gte(users.lastActive, new Date(Date.now() - 24 * 60 * 60 * 1000))
        )
      });

      const totalCustomers = await db.query.users.findMany({
        where: eq(users.role, "customer")
      });

      const completedOnboarding = await db.query.users.findMany({
        where: and(
          eq(users.role, "customer"),
          eq(users.isApproved, true)
        )
      });

      res.json({
        pendingApprovals: pendingApprovals.length,
        activeUsers: activeUsers.length,
        totalCustomers: totalCustomers.length,
        completedOnboarding: completedOnboarding.length
      });
    } catch (error) {
      console.error("Error fetching admin stats:", error);
      res.status(500).json({ error: "Failed to fetch admin stats" });
    }
  });

  // Customer Settings Routes
  app.put("/api/customer/settings", requireAuth, async (req, res) => {
    try {
      const { firstName, lastName, email } = req.body;
      const userId = req.session.userId;

      if (!userId) {
        return res.status(401).json({ message: "Nicht autorisiert" });
      }

      // Update user in database
      await db.update(users)
        .set({
          firstName,
          lastName,
          email,
        })
        .where(eq(users.id, userId));

      res.json({ success: true });
    } catch (error) {
      console.error("Error updating user settings:", error);
      res.status(500).json({ message: "Fehler beim Aktualisieren der Einstellungen" });
    }
  });

  app.post("/api/customer/profile-image", requireAuth, upload.single("profileImage"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "Kein Bild hochgeladen" });
      }

      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ message: "Nicht autorisiert" });
      }

      const imageUrl = `/uploads/${req.file.filename}`;

      // Update user profile image in database
      await db.update(users)
        .set({
          profileImage: imageUrl,
        })
        .where(eq(users.id, userId));

      res.json({ success: true, imageUrl });
    } catch (error) {
      console.error("Error uploading profile image:", error);
      res.status(500).json({ message: "Fehler beim Hochladen des Profilbilds" });
    }
  });
}
"
Das ist mein schema.ts für db: "import { pgTable, text, integer, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
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
  currentPhase: text("current_phase").default("Checkliste").notNull(),
  completedPhases: jsonb("completed_phases").default([]).notNull(),
  progress: integer("progress").default(0).notNull(),
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
export const adminCustomerRelations = pgTable("admin_customer_relations", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  adminId: integer("admin_id").references(() => users.id).notNull(),
  customerId: integer("customer_id").references(() => users.id).notNull(),
  assignedAt: timestamp("assigned_at").defaultNow().notNull(),
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

export const companySettings = pgTable("company_settings", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  companyName: text("company_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  address: text("address").notNull(),
  logoUrl: text("logo_url"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertCompanySettingsSchema = createInsertSchema(companySettings);
export const selectCompanySettingsSchema = createSelectSchema(companySettings);
export type CompanySettings = z.infer<typeof selectCompanySettingsSchema>;
" das ist mein index.ts in /server: "import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic } from "./vite";
import { createServer } from "http";
import cors from "cors";
import session from "express-session";
import path from "path";
import dotenv from "dotenv";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables with absolute path
dotenv.config({ path: path.resolve(__dirname, "../.env") });

function log(message: string) {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [express] ${message}`);
}

const app = express();

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === "production" ? false : ["http://localhost:5000", "http://localhost:5173"],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Session configuration
const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || "your-secret-key",
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax"
  }
});

app.use((req: Request, res: Response, next: NextFunction) => {
  sessionMiddleware(req, res, (err) => {
    if (err) {
      console.error("Session middleware error:", err);
      return res.status(500).json({ error: "Serverfehler" });
    }
    next();
  });
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  registerRoutes(app);
  const server = createServer(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client
  const PORT = 5000;
  server.listen(PORT, "0.0.0.0", () => {
    log(`serving on port ${PORT}`);
  });
})();
" das sit mein types.ts: "import { Request } from "express";
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
"das ist mein Login.tsx: "import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "../lib/auth.tsx";
import { Shield, Globe } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Ungültige E-Mail-Adresse"),
  password: z.string().min(1, "Passwort ist erforderlich"),
});

export default function Login() {
  const [, navigate] = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof loginSchema>) {
    try {
      setIsLoading(true);
      await login(values.email, values.password, "customer");
      
      // Check onboarding status after login
      const res = await fetch("/api/auth/session", {
        credentials: 'include'
      });
      const data = await res.json();
      
      if (data.user && !data.user.onboardingCompleted) {
        navigate("/onboarding");
      } else {
        navigate("/dashboard");
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Anmeldung fehlgeschlagen",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-[#1a1b1e] to-[#2d2e32]">
      {/* Left side */}
      <div className="flex-1 flex flex-col px-16 py-16">
        <div className="flex items-center space-x-3 mb-20">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <span className="text-primary text-2xl font-bold tracking-tight">
            NextMove Solution
          </span>
        </div>

        <div className="mb-20">
          <h1 className="text-4xl font-bold text-foreground mb-4 leading-tight">
            Willkommen zum Kundenportal
          </h1>
          <p className="text-lg text-muted-foreground">
            Melden Sie sich an, um fortzufahren
          </p>
        </div>

        <div className="space-y-6">
          <div className="flex items-center space-x-5 bg-[#25262b]/50 p-5 rounded-xl border border-border hover:bg-[#25262b]/70 transition-all duration-300">
            <div className="flex-shrink-0 p-3 bg-primary/10 rounded-lg">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="text-base font-medium text-foreground mb-1">
                Sicherer Zugang
              </h3>
              <p className="text-sm text-muted-foreground">
                Ihre Daten sind bei uns sicher
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-5 bg-[#25262b]/50 p-5 rounded-xl border border-border hover:bg-[#25262b]/70 transition-all duration-300">
            <div className="flex-shrink-0 p-3 bg-primary/10 rounded-lg">
              <Globe className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="text-base font-medium text-foreground mb-1">
                24/7 Verfügbar
              </h3>
              <p className="text-sm text-muted-foreground">
                Zugriff rund um die Uhr
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="flex-1 flex flex-col justify-center px-12">
        <div className="w-full max-w-md mx-auto">
          <div className="bg-[#25262b] rounded-xl p-8 shadow-2xl border border-border">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>E-Mail</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="name@firma.de" 
                          className="bg-[#1a1b1e] border-border" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Passwort</FormLabel>
                      <FormControl>
                        <Input 
                          type="password" 
                          className="bg-[#1a1b1e] border-border"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full bg-primary hover:bg-primary/90"
                  disabled={isLoading}
                >
                  {isLoading ? "Wird geladen..." : "Anmelden"}
                </Button>

                <div className="space-y-4 text-center">
                  <Button
                    variant="link"
                    className="text-muted-foreground hover:text-primary"
                    onClick={() => navigate("/forgot-password")}
                  >
                    Passwort vergessen?
                  </Button>
                  <div>
                    <Button
                      variant="link"
                      onClick={() => navigate("/register")}
                      className="text-muted-foreground hover:text-primary"
                    >
                      Noch kein Konto? Jetzt registrieren
                    </Button>
                  </div>
                  <div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate("/admin/login")}
                      className="text-muted-foreground hover:text-primary text-sm"
                    >
                      Zum Adminportal
                    </Button>
                  </div>
                </div>
              </form>
            </Form>
          </div>
        </div>
      </div>
    </div>
  );
}
" wo sich Kunden anmelden können mit ihren Zugangsdaten. 
Die Anwendung soll sowohl Kunden als auch Admins betreiben.
Das ist mein Register.tsx: "import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Shield, Globe } from "lucide-react";

const registerSchema = z.object({
  email: z.string().email("Ungültige E-Mail-Adresse"),
  password: z.string().min(8, "Passwort muss mindestens 8 Zeichen lang sein"),
  firstName: z.string().min(1, "Vorname ist erforderlich"),
  lastName: z.string().min(1, "Nachname ist erforderlich"),
  companyName: z.string().min(1, "Firmenname ist erforderlich"),
});

export default function Register() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      password: "",
      firstName: "",
      lastName: "",
      companyName: "",
    },
  });

  async function onSubmit(values: z.infer<typeof registerSchema>) {
    try {
      setIsLoading(true);
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!res.ok) throw new Error();

      toast({
        title: "Registrierung erfolgreich!",
        description: "Warten Sie die Freigabe vom Admin",
        className: "bg-primary text-primary-foreground",
      });
      navigate("/");
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Registrierung fehlgeschlagen",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-[#1a1b1e] to-[#2d2e32]">
      {/* Left side */}
      <div className="flex-1 flex flex-col px-16 py-16">
        <div className="flex items-center space-x-3 mb-20">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <span className="text-primary text-2xl font-bold tracking-tight">
            NextMove Solution
          </span>
        </div>

        <div className="mb-20">
          <h1 className="text-4xl font-bold text-foreground mb-4 leading-tight">
            Willkommen zum Kundenportal
          </h1>
          <p className="text-lg text-muted-foreground">
            Erstellen Sie einen neuen Account
          </p>
        </div>

        <div className="space-y-6">
          <div className="flex items-center space-x-5 bg-[#25262b]/50 p-5 rounded-xl border border-border hover:bg-[#25262b]/70 transition-all duration-300">
            <div className="flex-shrink-0 p-3 bg-primary/10 rounded-lg">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="text-base font-medium text-foreground mb-1">
                Sicherer Zugang
              </h3>
              <p className="text-sm text-muted-foreground">
                Ihre Daten sind bei uns sicher
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-5 bg-[#25262b]/50 p-5 rounded-xl border border-border hover:bg-[#25262b]/70 transition-all duration-300">
            <div className="flex-shrink-0 p-3 bg-primary/10 rounded-lg">
              <Globe className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="text-base font-medium text-foreground mb-1">
                24/7 Verfügbar
              </h3>
              <p className="text-sm text-muted-foreground">
                Zugriff rund um die Uhr
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Registration Form */}
      <div className="flex-1 flex flex-col justify-center px-12">
        <div className="w-full max-w-md mx-auto">
          <div className="bg-[#25262b] rounded-xl p-8 shadow-2xl border border-border">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Vorname</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Max" 
                            className="bg-[#1a1b1e] border-border"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nachname</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Mustermann" 
                            className="bg-[#1a1b1e] border-border"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="companyName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Firmenname</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Musterfirma GmbH" 
                          className="bg-[#1a1b1e] border-border"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>E-Mail</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="name@firma.de" 
                          className="bg-[#1a1b1e] border-border"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Passwort</FormLabel>
                      <FormControl>
                        <Input 
                          type="password" 
                          className="bg-[#1a1b1e] border-border"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full bg-primary hover:bg-primary/90"
                  disabled={isLoading}
                >
                  {isLoading ? "Registriere..." : "Registrieren"}
                </Button>

                <div className="text-center">
                  <Button
                    variant="link"
                    onClick={() => navigate("/")}
                    className="text-muted-foreground hover:text-primary"
                  >
                    Zurück zum Login
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </div>
      </div>
    </div>
  );
}
" wo sich Kunden registrieren können. Der Admin erhält dann im Adminportal die Registrierungen und kann sie freigeben. mit: "import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { type User } from "@db/schema";
import { useToast } from "@/hooks/use-toast";
import AdminLayout from "../../components/layout/AdminLayout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { Users, UserCheck, Video, PhoneCall } from "lucide-react";

export default function AdminDashboard() {
  const [, navigate] = useLocation();

  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const res = await fetch("/api/admin/stats");
      return res.json();
    },
  });

  const { data: pendingCallbacks } = useQuery({
    queryKey: ["pending-callbacks"],
    queryFn: async () => {
      const res = await fetch("/api/callbacks/pending");
      return res.json();
    },
  });

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: pendingUsers } = useQuery({
    queryKey: ["pending-users"],
    queryFn: async () => {
      const res = await fetch("/api/admin/users/pending");
      if (!res.ok) throw new Error("Failed to fetch pending users");
      return res.json();
    }
  });

  const approveUser = useMutation({
    mutationFn: async (userId: number) => {
      const res = await fetch(`/api/admin/users/${userId}/approve`, {
        method: "POST",
        credentials: "include"
      });
      if (!res.ok) throw new Error("Failed to approve user");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      toast({
        title: "Erfolg",
        description: "Benutzer wurde freigegeben"
      });
    }
  });

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold mb-2">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Übersicht aller wichtigen Kennzahlen
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Ausstehende Freigaben
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.pendingApprovals || 0}</div>
              <Button
                variant="link"
                className="p-0"
                onClick={() => navigate("/admin/users")}
              >
                Freigaben verwalten
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Aktive Kunden
              </CardTitle>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.activeUsers || 0}</div>
              <p className="text-xs text-muted-foreground">
                Letzte 24 Stunden
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Tutorials
              </CardTitle>
              <Video className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalTutorials || 0}</div>
              <Button
                variant="link"
                className="p-0"
                onClick={() => navigate("/admin/content")}
              >
                Content verwalten
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Offene Rückrufe
              </CardTitle>
              <PhoneCall className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {pendingCallbacks?.length || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Unbearbeitete Anfragen
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8">
          <h2 className="text-lg font-semibold mb-4">Ausstehende Freigaben</h2>
          <div className="bg-card rounded-lg border shadow-sm">
            {pendingUsers?.map((user: User) => (
              <div key={user.id} className="p-4 border-b last:border-b-0 flex justify-between items-center">
                <div>
                  <p className="font-medium">{user.firstName} {user.lastName}</p>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>
                <Button 
                  onClick={() => approveUser.mutate(user.id)}
                  disabled={approveUser.isPending}
                >
                  Freigeben
                </Button>
              </div>
            ))}
            {pendingUsers?.length === 0 && (
              <div className="p-4 text-sm text-muted-foreground text-center">
                Keine ausstehenden Freigaben
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
" Dashbaord.tsx in /admin/Dashboard.tsx

das ist mein auth.ts in /lib: "import { createContext, useContext, type ReactNode } from "react";
import { useLocation } from "wouter";
import type { User } from "@db/schema";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface AuthContextType {
  user: User | null;
  isAdmin: boolean;
  isLoading: boolean;
  login: (email: string, password: string, portal: "admin" | "customer") => Promise<void>;
  logout: () => Promise<void>;
  refetchUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAdmin: false,
  isLoading: true,
  login: async () => {},
  logout: async () => {},
  refetchUser: async () => {},
});

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();

  const { data: session, isLoading } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const res = await fetch("/api/auth/session", {
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error("Failed to fetch session");
      }
      return res.json();
    },
  });

  const login = async (email: string, password: string, portal: "admin" | "customer") => {
    const endpoint = portal === "admin" ? "/api/auth/admin/login" : "/api/auth/login";
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      credentials: "include",
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Login failed");
    }

    const data = await res.json();
    if (!data.user) {
      throw new Error("No user data received");
    }

    await queryClient.invalidateQueries({ queryKey: ["session"] });
    if (portal === "admin") {
      navigate("/admin");
    } else {
      navigate("/dashboard");
    }
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
      queryClient.clear();
      navigate("/");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const refetchUser = async () => {
    await queryClient.refetchQueries({ queryKey: ["session"] });
    await queryClient.refetchQueries({ queryKey: ["user"] });
  };

  const value: AuthContextType = {
    user: session?.user ?? null,
    isAdmin: session?.user?.role === "admin",
    isLoading,
    login,
    logout,
    refetchUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();

  if (isLoading) {
    return null;
  }

  if (!user) {
    navigate("/");
    return null;
  }

  return <>{children}</>;
}

export function RequireAdmin({ children }: { children: ReactNode }) {
  const { user, isAdmin, isLoading } = useAuth();
  const [, navigate] = useLocation();

  if (isLoading) {
    return null;
  }

  if (!user || !isAdmin) {
    navigate("/admin/login");
    return null;
  }

  return <>{children}</>;
}

export const useAuth = () => useContext(AuthContext);
" 

AUFGABE EMAIL-Benachrichtigung:
Ich möchte dass du jetzt für mich eine Email-Benachrichtigungssystem baust, dass wenn sich Kunden registrieren, eine Email erhalten ,dass die Registrierung erfolgreich abgeschlossen wurde das kann sowas wie-> "Vielen Dank für die Registrierung, Kunden.name, Der Admin wird sie in kürze Zeit freigeben. "
und der Admin kriegt auch gleichzeitung wenn sich Kunden registrieren eine Email erhalten dass sich der Kunde.name registriert hat. Du kannst auch den Kunden per Mail die Registrierung freigeben. der Kunde erhalten dann eine Email dass die Registrierung freigeschaltet wurde. und somit der Kunde kann sich einloggen. das würde dann auf dem Adminportal bei benutzerfreigabe nicht mehr sichtbar sein und automatisch gehen da es per Mail freigeschaltet wurde. Die Benutzerfreigabe kann sowohl im Adminportal als auch per Mail erfolgen. Wichtig ist dass der Kunde erstmal mit erfolgreicher registrierung eine mail bekommt und auch wenn die Registrierung freigeschaltet wurde. bitte implementiere diese funktion ohne etwas zu zerstörten oder kaputt zu machen.

