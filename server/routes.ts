import { type Express, type Request, type Response } from "express";
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
  type User
} from "@db/schema";
import { uploadFile } from "./upload";
import multer from "multer";
import path from "path";

// Middleware to check if user is authenticated
const requireAuth = async (req: Request, res: Response, next: Function) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Nicht authentifiziert" });
  }
  next();
};

// Middleware to check if user is admin
const requireAdmin = async (req: Request, res: Response, next: Function) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Nicht authentifiziert" });
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, req.session.userId)
  });

  if (!user || user.role !== "admin") {
    return res.status(403).json({ error: "Keine Berechtigung" });
  }

  next();
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
          role: "customer"
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
      });

      if (!user) {
        return res.status(401).json({ error: "Ungültige Anmeldedaten" });
      }

      const isMatch = await bcrypt.compare(password, user.password);

      if (!isMatch) {
        return res.status(401).json({ error: "Ungültige Anmeldedaten" });
      }

      if (!user.isApproved && user.role === "customer") {
        return res.status(403).json({ error: "Account noch nicht freigegeben" });
      }

      req.session.userId = user.id;

      // Update last active
      await db.update(users)
        .set({ lastActive: new Date() })
        .where(eq(users.id, user.id));

      res.json({ user: { ...user, password: undefined } });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Anmeldung fehlgeschlagen" });
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
        return res.status(401).json({ error: "Nicht authentifiziert" });
      }

      res.json({ user: { ...user, password: undefined } });
    } catch (error) {
      console.error("Session check error:", error);
      res.status(500).json({ error: "Sitzungsprüfung fehlgeschlagen" });
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
}
