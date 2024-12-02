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
      });

      if (!user) {
        return res.status(401).json({ error: "Ungültige Anmeldedaten" });
      }

      if (user.role !== "customer") {
        return res.status(401).json({ error: "Ungültige Anmeldedaten" });
      }

      if (!user.isApproved) {
        return res.status(401).json({ error: "Ihr Account wurde noch nicht freigegeben" });
      }

      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ error: "Ungültige Anmeldedaten" });
      }

      req.session.userId = user.id;
      res.json({ user: { ...user, password: undefined } });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Interner Serverfehler" });
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
