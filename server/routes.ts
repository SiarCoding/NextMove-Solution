import { type Express, type Request, type Response } from "express";
import bcrypt from "bcryptjs";
import { eq, desc, gte, inArray, and, sql } from "drizzle-orm";
import { db } from "db";
import { 
  users,
  tutorials,
  userProgress,
  metrics,
  referrals,
  callbacks as callbacksTable,
  companySettings,
  companies,
  customerChecklist
} from "../db/schema";
import { upload, uploadFile } from "./upload";
import path from "path";
import "./types";
import { type User } from "./types";
import express from "express";
import { sendEmail } from "./services/email";
import { promises as fsPromises } from "fs";

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

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
  // Serve static files from the uploads directory
  app.use('/uploads', express.static('uploads'));

  // Auth routes
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const { email, password, firstName, lastName, companyName } = req.body;

      // Check if user already exists
      const existingUser = await db.query.users.findFirst({
        where: eq(users.email, email),
      });

      if (existingUser) {
        return res.status(400).json({ error: "E-Mail bereits registriert" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create company first
      const [company] = await db.insert(companies).values({
        name: companyName,
      }).returning();

      // Create user
      const [user] = await db.insert(users).values({
        email,
        password: hashedPassword,
        firstName,
        lastName,
        companyId: company.id,
        role: "customer",
      }).returning();

      // Send registration email
      await sendEmail(email, 'registration', { firstName });

      res.json({ message: "Registrierung erfolgreich" });
    } catch (error) {
      console.error("Register error:", error);
      res.status(500).json({ error: "Serverfehler bei der Registrierung" });
    }
  });

  app.post("/api/auth/login", async (req: Request, res: Response) => {
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
  app.post("/api/auth/admin/seed", async (req: Request, res: Response) => {
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

  app.post("/api/auth/admin/login", async (req: Request, res: Response) => {
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

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Abmeldung fehlgeschlagen" });
      }
      res.json({ message: "Erfolgreich abgemeldet" });
    });
  });

  app.get("/api/auth/session", async (req: Request, res: Response) => {
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
  app.get("/api/admin/users/pending", requireAdmin, async (req: Request, res: Response) => {
    try {
      const pendingUsers = await db
        .select({
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          companyId: users.companyId,
          createdAt: users.createdAt,
          company: {
            name: companies.name
          }
        })
        .from(users)
        .leftJoin(companies, eq(users.companyId, companies.id))
        .where(
          and(
            eq(users.role, "customer"),
            eq(users.isApproved, false)
          )
        );

      // Format the response to include company information
      const formattedUsers = pendingUsers.map(user => ({
        ...user,
        companyName: user.company?.name
      }));

      res.json(formattedUsers);
    } catch (error) {
      console.error("Error fetching pending users:", error);
      res.status(500).json({ error: "Failed to fetch pending users" });
    }
  });

  app.patch("/api/admin/users/:id/approve", requireAdmin, async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.id);
      
      // Update user approval status
      const [updatedUser] = await db
        .update(users)
        .set({ isApproved: true })
        .where(eq(users.id, userId))
        .returning();

      if (!updatedUser) {
        return res.status(404).json({ error: "Benutzer nicht gefunden" });
      }

      // Send approval email
      await sendEmail(updatedUser.email, 'accountApproved', { 
        firstName: updatedUser.firstName 
      });

      res.json({ message: "Benutzer erfolgreich freigegeben" });
    } catch (error) {
      console.error("User approval error:", error);
      res.status(500).json({ error: "Serverfehler bei der Benutzerfreigabe" });
    }
  });

  // Admin tracking route
  app.get("/api/admin/customers/tracking", requireAdmin, async (req: Request, res: Response) => {
    try {
      // Hole nur die Kunden direkt aus der Datenbank
      const result = await db.execute(
        sql`SELECT u.*, c.* 
            FROM users u 
            LEFT JOIN customer_checklist c ON u.id = c.user_id 
            WHERE u.role = 'customer'`
      );
      
      const customers = result.rows;
      
      // Formatiere die Daten
      const formattedCustomers = customers.map(customer => ({
        id: customer.id,
        firstName: customer.first_name,
        lastName: customer.last_name,
        email: customer.email,
        role: customer.role,
        progress: customer.progress,
        currentPhase: customer.current_phase,
        completedPhases: customer.completed_phases,
        onboardingCompleted: customer.onboarding_completed,
        checklistData: customer.user_id ? {
          paymentOption: customer.payment_option,
          taxId: customer.tax_id,
          domain: customer.domain,
          targetAudience: customer.target_audience,
          companyInfo: customer.company_info,
          webDesign: customer.web_design,
          marketResearch: customer.market_research,
          legalInfo: customer.legal_info,
        } : undefined
      }));

      res.json(formattedCustomers);
    } catch (error) {
      console.error("Error fetching customers:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Save customer checklist
  app.post("/api/checklist", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const {
        paymentOption,
        taxId,
        domain,
        targetAudience,
        companyInfo,
        webDesign,
        marketResearch,
        legalInfo,
      } = req.body;

      // Save to customer_checklist table
      await db.insert(customerChecklist).values({
        userId,
        paymentOption,
        taxId,
        domain,
        targetAudience,
        companyInfo,
        webDesign: JSON.stringify(webDesign),
        marketResearch: JSON.stringify(marketResearch),
        legalInfo: JSON.stringify(legalInfo),
      });

      // Update user's onboarding status
      await db.update(users)
        .set({ 
          onboardingCompleted: true,
          currentPhase: "Dashboard",
          completedPhases: sql`array_append(${users.completedPhases}, 'Checkliste')`
        })
        .where(eq(users.id, userId));

      res.json({ success: true });
    } catch (error) {
      console.error("Error saving checklist:", error);
      res.status(500).json({ error: "Fehler beim Speichern der Checkliste" });
    }
  });

  // Onboarding routes
  app.post("/api/onboarding/checklist", requireAuth, async (req: Request, res: Response) => {
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

  app.post("/api/customer/onboarding/complete", requireAuth, async (req: Request, res: Response) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Get current user to access completedPhases
      const currentUser = await db.query.users.findFirst({
        where: eq(users.id, req.user.id)
      });

      if (!currentUser) {
        return res.status(404).json({ error: "User not found" });
      }

      // Prüfe, ob das Onboarding-Tutorial bereits existiert
      let tutorial = await db.query.tutorials.findFirst({
        where: eq(tutorials.title, "Onboarding")
      });

      // Wenn nicht, erstelle es
      if (!tutorial) {
        const [newTutorial] = await db.insert(tutorials)
          .values({
            title: "Onboarding",
            description: "Erste Schritte im NextMove Portal",
            category: "onboarding",
            videoUrl: "",
            order: 1,
            isOnboarding: true
          })
          .returning();
        tutorial = newTutorial;
      }

      // Add onboarding to completedPhases
      const completedPhases: string[] = Array.isArray(currentUser.completedPhases) 
        ? currentUser.completedPhases 
        : [];

      if (!completedPhases.includes("onboarding")) {
        completedPhases.push("onboarding");
      }

      // Prüfe, ob bereits ein Fortschritt existiert
      const existingProgress = await db.query.userProgress.findFirst({
        where: and(
          eq(userProgress.userId, req.user.id),
          eq(userProgress.tutorialId, tutorial.id)
        )
      });

      // Wenn kein Fortschritt existiert, erstelle einen neuen
      if (!existingProgress) {
        await db.insert(userProgress).values({
          userId: req.user.id,
          tutorialId: tutorial.id,
          completed: true,
          completedAt: new Date(),
        });
      } else {
        // Aktualisiere den bestehenden Fortschritt
        await db.update(userProgress)
          .set({
            completed: true,
            completedAt: new Date()
          })
          .where(eq(userProgress.id, existingProgress.id));
      }

      // Update user progress
      await db.update(users)
        .set({ 
          onboardingCompleted: true,
          currentPhase: "onboarding",
          progress: 20,
          completedPhases: completedPhases
        })
        .where(eq(users.id, req.user.id));

      res.json({ message: "Onboarding completed successfully" });
    } catch (error) {
      console.error("Error completing onboarding:", error);
      res.status(500).json({ error: "Failed to complete onboarding" });
    }
  });

  // Endpoint zum Abrufen des Onboarding-Fortschritts
  app.get("/api/customer/progress", requireAuth, async (req: Request, res: Response) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Hole nur die notwendigen Daten ohne Relation
      const progress = await db.query.userProgress.findFirst({
        where: eq(userProgress.userId, req.user.id)
      });

      const user = await db.query.users.findFirst({
        where: eq(users.id, req.user.id),
        columns: {
          currentPhase: true,
          completedPhases: true
        }
      });

      res.json({
        progress: progress || null,
        currentPhase: user?.currentPhase || "onboarding",
        completedPhases: user?.completedPhases || []
      });
    } catch (error) {
      console.error("Error fetching progress:", error);
      res.status(500).json({ error: "Failed to fetch progress" });
    }
  });

  // Checklist route
  app.post("/api/customer/checklist", requireAuth, async (req: Request, res: Response) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const {
        paymentOption,
        taxId,
        domain,
        targetAudience,
        companyInfo,
        webDesign,
        marketResearch,
        legalInfo
      } = req.body;

      // Save checklist data
      await db.insert(customerChecklist)
        .values({
          userId: req.user.id,
          paymentOption,
          taxId,
          domain,
          targetAudience,
          companyInfo,
          webDesign,
          marketResearch,
          legalInfo
        });

      // Get current user to access completedPhases
      const currentUser = await db.query.users.findFirst({
        where: eq(users.id, req.user.id)
      });

      if (!currentUser) {
        return res.status(404).json({ error: "User not found" });
      }

      // Add checklist to completedPhases
      const completedPhases: string[] = Array.isArray(currentUser.completedPhases) 
        ? currentUser.completedPhases 
        : [];

      if (!completedPhases.includes("onboarding")) {
        completedPhases.push("onboarding");
      }

      // Update user progress
      await db.update(users)
        .set({
          currentPhase: "onboarding",
          progress: 20,
          completedPhases: completedPhases
        })
        .where(eq(users.id, req.user.id));

      res.json({ message: "Checklist saved successfully" });
    } catch (error) {
      console.error("Error saving checklist:", error);
      res.status(500).json({ error: "Failed to save checklist" });
    }
  });

  // Admin settings routes
  app.get("/api/admin/settings", requireAdmin, async (req: Request, res: Response) => {
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

  app.post("/api/admin/settings", requireAdmin, async (req: Request, res: Response) => {
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
  app.post("/api/admin/logo", requireAdmin, upload.single("logo"), async (req: Request, res: Response) => {
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
  app.get("/api/admin/profile", requireAdmin, async (req: Request, res: Response) => {
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
  app.get("/api/customer/dashboard", requireAuth, async (req: Request, res: Response) => {
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
  app.get("/api/customer/admin-info", requireAuth, async (req: Request, res: Response) => {
    try {
      // Get admin settings directly
      const adminSettings = await db.query.companySettings.findFirst({
        orderBy: desc(companySettings.updatedAt)
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
  app.get("/api/admin/customers", requireAdmin, async (req: Request, res: Response) => {
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

  app.post("/api/admin/customers/:id/company", requireAdmin, async (req: Request, res: Response) => {
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

  app.post("/api/admin/companies", requireAdmin, async (req: Request, res: Response) => {
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

  app.get("/api/admin/companies", requireAdmin, async (req: Request, res: Response) => {
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
  app.get("/api/admin/stats", requireAdmin, async (req: Request, res: Response) => {
    try {
      // Get timestamp for 24 hours ago
      const twentyFourHoursAgo = new Date();
      twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

      // Get active users who have completed at least onboarding in the last 24 hours
      const activeUsers = await db
        .select({ count: sql<number>`count(*)` })
        .from(users)
        .where(
          and(
            eq(users.role, "customer"),
            gte(users.lastActive, twentyFourHoursAgo),
            sql`${users.currentPhase} != 'onboarding'`
          )
        );

      // Get pending approvals count
      const pendingApprovals = await db
        .select({ count: sql<number>`count(*)` })
        .from(users)
        .where(
          and(
            eq(users.role, "customer"),
            eq(users.isApproved, false)
          )
        );

      // Get total tutorials count
      const totalTutorials = await db
        .select({ count: sql<number>`count(*)` })
        .from(tutorials);

      // Get pending callbacks count
      const pendingCallbacks = await db
        .select({ count: sql<number>`count(*)` })
        .from(callbacksTable)
        .where(eq(callbacksTable.status, "pending"));

      res.json({
        activeUsers: activeUsers[0]?.count || 0,
        pendingApprovals: pendingApprovals[0]?.count || 0,
        totalTutorials: totalTutorials[0]?.count || 0,
        pendingCallbacks: pendingCallbacks[0]?.count || 0
      });
    } catch (error) {
      console.error("Error fetching admin stats:", error);
      res.status(500).json({ error: "Failed to fetch admin stats" });
    }
  });

  // Callbacks routes
  app.get("/api/callbacks", requireAdmin, async (req: Request, res: Response) => {
    try {
      const callbacks = await db
        .select({
          id: callbacksTable.id,
          userId: callbacksTable.userId,
          phone: callbacksTable.phone,
          status: callbacksTable.status,
          createdAt: callbacksTable.createdAt,
          user: {
            firstName: users.firstName,
            lastName: users.lastName,
            email: users.email
          }
        })
        .from(callbacksTable)
        .leftJoin(users, eq(callbacksTable.userId, users.id))
        .orderBy(desc(callbacksTable.createdAt));

      res.json(callbacks);
    } catch (error) {
      console.error("Error fetching callbacks:", error);
      res.status(500).json({ error: "Failed to fetch callbacks" });
    }
  });

  // Customer Settings Routes
  app.put("/api/customer/settings", requireAuth, async (req: Request, res: Response) => {
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

  app.post("/api/customer/profile-image", requireAuth, upload.single("profileImage"), async (req: Request, res: Response) => {
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

  // Customer checklist route
  app.post("/api/customer/checklist", requireAuth, async (req: Request, res: Response) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const {
        paymentOption,
        taxId,
        domain,
        targetAudience,
        companyInfo,
        webDesign,
        marketResearch,
        legalInfo
      } = req.body;

      // Save checklist data
      await db.insert(customerChecklist)
        .values({
          userId: req.user.id,
          paymentOption,
          taxId,
          domain,
          targetAudience,
          companyInfo,
          webDesign,
          marketResearch,
          legalInfo
        });

      // Get current user to access completedPhases
      const currentUser = await db.query.users.findFirst({
        where: eq(users.id, req.user.id)
      });

      if (!currentUser) {
        return res.status(404).json({ error: "User not found" });
      }

      // Add checklist to completedPhases
      const completedPhases: string[] = Array.isArray(currentUser.completedPhases) 
        ? currentUser.completedPhases 
        : [];

      if (!completedPhases.includes("onboarding")) {
        completedPhases.push("onboarding");
      }

      // Update user progress
      await db.update(users)
        .set({
          currentPhase: "onboarding",
          progress: 20,
          completedPhases: completedPhases
        })
        .where(eq(users.id, req.user.id));

      res.json({ message: "Checklist saved successfully" });
    } catch (error) {
      console.error("Error saving checklist:", error);
      res.status(500).json({ error: "Failed to save checklist" });
    }
  });

  // Callback routes
  app.post("/api/callbacks", requireAuth, async (req: Request, res: Response) => {
    try {
      const { phone } = req.body;

      if (!req.user) {
        return res.status(401).json({ error: "Nicht authentifiziert" });
      }

      // Check if user has made a callback request in the last hour
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const recentCallbacks = await db
        .select()
        .from(callbacksTable)
        .where(
          and(
            eq(callbacksTable.userId, req.user.id),
            gte(callbacksTable.createdAt, oneHourAgo)
          )
        );

      if (recentCallbacks.length > 0) {
        return res.status(429).json({ 
          error: "Sie haben bereits einen Rückruf angefordert. Bitte warten Sie eine Stunde, bevor Sie einen weiteren Rückruf anfordern." 
        });
      }

      await db.insert(callbacksTable).values({
        userId: req.user.id,
        phone,
        status: "pending",
        createdAt: new Date(),
      });

      res.status(201).json({ message: "Rückruf erfolgreich angefordert" });
    } catch (error) {
      console.error("Error creating callback:", error);
      res.status(500).json({ error: "Interner Serverfehler" });
    }
  });

  app.get("/api/callbacks", async (req: Request, res: Response) => {
    try {
      const callbacksList = await db.select({
        id: callbacksTable.id,
        userId: callbacksTable.userId,
        phone: callbacksTable.phone,
        status: callbacksTable.status,
        createdAt: callbacksTable.createdAt,
        user: {
          name: users.firstName,
          email: users.email,
        },
      })
      .from(callbacksTable)
      .innerJoin(users, eq(callbacksTable.userId, users.id))
      .orderBy(callbacksTable.createdAt);

      res.json(callbacksList);
    } catch (error) {
      console.error("Error fetching callbacks:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.patch("/api/callbacks/:id", async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status } = req.body as { status: "completed" };

    try {
      const [callback] = await db.update(callbacksTable)
        .set({ status })
        .where(eq(callbacksTable.id, parseInt(id)))
        .returning();

      res.json(callback);
    } catch (error) {
      console.error("Error updating callback:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Referral Routes
  app.get("/api/referrals/my-link", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ error: "Nicht authentifiziert" });
      }

      // Existierenden Referral-Code abrufen oder neuen erstellen
      let referral = await db.select().from(referrals)
        .where(eq(referrals.referrerId, userId))
        .limit(1);

      if (referral.length === 0) {
        // Generiere einen einzigartigen Code
        const code = `REF${userId}${Date.now().toString(36)}`;
        
        const newReferral = await db.insert(referrals).values({
          referrerId: userId,
          code: code,
          status: "active",
        }).returning();

        referral = newReferral;
      }

      // Statistiken abrufen
      const stats = await db.select({
        status: referrals.status,
        count: sql<number>`count(*)::int`,
      })
      .from(referrals)
      .where(eq(referrals.referrerId, userId))
      .groupBy(referrals.status);

      const statsMap = {
        total: 0,
        pending: 0,
        completed: 0,
      };

      stats.forEach(({ status, count }) => {
        if (status === "completed") statsMap.completed = count;
        if (status === "pending") statsMap.pending = count;
        statsMap.total += count;
      });

      // Frontend-URL aus der Anfrage extrahieren
      const protocol = req.headers['x-forwarded-proto'] || 'http';
      const host = req.headers['x-forwarded-host'] || req.headers.host;
      const baseUrl = `${protocol}://${host}`;

      res.json({
        referralLink: `${baseUrl}/register?ref=${referral[0].code}`,
        stats: statsMap,
      });
    } catch (error) {
      console.error("Error in referral link endpoint:", error);
      res.status(500).json({ error: "Interner Serverfehler" });
    }
  });

  // Admin password change route
  app.post("/api/admin/change-password", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = req.session.userId;

      if (!userId) {
        return res.status(401).json({ error: "Nicht authentifiziert" });
      }

      const user = await db.query.users.findFirst({
        where: eq(users.id, userId)
      });

      if (!user) {
        return res.status(404).json({ error: "Benutzer nicht gefunden" });
      }

      // Verify current password
      const validPassword = await bcrypt.compare(currentPassword, user.password);
      if (!validPassword) {
        return res.status(401).json({ error: "Aktuelles Passwort ist falsch" });
      }

      // Hash and update new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await db.update(users)
        .set({ password: hashedPassword })
        .where(eq(users.id, userId));

      res.json({ message: "Passwort erfolgreich geändert" });
    } catch (error) {
      console.error("Password change error:", error);
      res.status(500).json({ error: "Fehler beim Ändern des Passworts" });
    }
  });

  // Customer password change route
  app.post("/api/customer/change-password", requireAuth, async (req: Request, res: Response) => {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = req.session.userId;

      if (!userId) {
        return res.status(401).json({ error: "Nicht authentifiziert" });
      }

      const user = await db.query.users.findFirst({
        where: eq(users.id, userId)
      });

      if (!user) {
        return res.status(404).json({ error: "Benutzer nicht gefunden" });
      }

      // Verify current password
      const validPassword = await bcrypt.compare(currentPassword, user.password);
      if (!validPassword) {
        return res.status(401).json({ error: "Aktuelles Passwort ist falsch" });
      }

      // Hash and update new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await db.update(users)
        .set({ password: hashedPassword })
        .where(eq(users.id, userId));

      res.json({ message: "Passwort erfolgreich geändert" });
    } catch (error) {
      console.error("Password change error:", error);
      res.status(500).json({ error: "Fehler beim Ändern des Passworts" });
    }
  });

  // Google Drive Integration Routes
  app.post("/api/admin/google-drive/save-tokens", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { accessToken, refreshToken, expiryDate } = req.body;
      const userId = req.session.userId;

      if (!userId) {
        return res.status(401).json({ error: "Nicht authentifiziert" });
      }

      // Validate token by making a test request to Google Drive API
      try {
        const response = await fetch('https://www.googleapis.com/drive/v3/files?pageSize=1', {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        });

        if (!response.ok) {
          throw new Error('Invalid token');
        }
      } catch (error) {
        console.error("Google Drive token validation error:", error);
        return res.status(400).json({ error: "Ungültiges Google Drive Token" });
      }

      await db.update(users)
        .set({
          googleAccessToken: accessToken,
          googleRefreshToken: refreshToken,
          googleTokenExpiry: new Date(expiryDate),
          googleDriveConnected: true
        })
        .where(eq(users.id, userId));

      res.json({ 
        message: "Google Drive erfolgreich verbunden",
        accessToken // Send back the token for the client to store
      });
    } catch (error) {
      console.error("Google Drive token save error:", error);
      res.status(500).json({ error: "Fehler beim Speichern der Google Drive Verbindung" });
    }
  });

  app.post("/api/admin/google-drive/disconnect", requireAdmin, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId;

      if (!userId) {
        return res.status(401).json({ error: "Nicht authentifiziert" });
      }

      const user = await db.query.users.findFirst({
        where: eq(users.id, userId)
      });

      if (user?.googleAccessToken) {
        // Revoke the token at Google
        try {
          await fetch(`https://oauth2.googleapis.com/revoke?token=${user.googleAccessToken}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded'
            }
          });
        } catch (error) {
          console.error("Error revoking Google token:", error);
          // Continue anyway to remove local tokens
        }
      }

      await db.update(users)
        .set({
          googleAccessToken: null,
          googleRefreshToken: null,
          googleTokenExpiry: null,
          googleDriveConnected: false
        })
        .where(eq(users.id, userId));

      res.json({ message: "Google Drive Verbindung getrennt" });
    } catch (error) {
      console.error("Google Drive disconnect error:", error);
      res.status(500).json({ error: "Fehler beim Trennen der Google Drive Verbindung" });
    }
  });

  app.get("/api/admin/google-drive/status", requireAdmin, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId;

      if (!userId) {
        return res.status(401).json({ error: "Nicht authentifiziert" });
      }

      const user = await db.query.users.findFirst({
        where: eq(users.id, userId)
      });

      // Check if token is expired
      const tokenExpiry = user?.googleTokenExpiry;
      const isExpired = tokenExpiry ? new Date(tokenExpiry) < new Date() : true;

      // If token exists but is expired, try to refresh it
      if (user?.googleAccessToken && isExpired && user?.googleRefreshToken) {
        try {
          const response = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              client_id: process.env.GOOGLE_CLIENT_ID!,
              client_secret: process.env.GOOGLE_CLIENT_SECRET!,
              refresh_token: user.googleRefreshToken,
              grant_type: 'refresh_token',
            }),
          });

          if (response.ok) {
            const data = await response.json();
            const newExpiryDate = new Date();
            newExpiryDate.setSeconds(newExpiryDate.getSeconds() + data.expires_in);

            await db.update(users)
              .set({
                googleAccessToken: data.access_token,
                googleTokenExpiry: newExpiryDate,
              })
              .where(eq(users.id, userId));

            return res.json({
              isConnected: true,
              accessToken: data.access_token,
              tokenExpiry: newExpiryDate
            });
          }
        } catch (error) {
          console.error("Token refresh error:", error);
          // If refresh fails, treat as disconnected
          await db.update(users)
            .set({
              googleAccessToken: null,
              googleRefreshToken: null,
              googleTokenExpiry: null,
              googleDriveConnected: false
            })
            .where(eq(users.id, userId));
        }
      }

      res.json({
        isConnected: user?.googleDriveConnected && !isExpired,
        accessToken: user?.googleAccessToken,
        tokenExpiry: user?.googleTokenExpiry
      });
    } catch (error) {
      console.error("Google Drive status error:", error);
      res.status(500).json({ error: "Fehler beim Abrufen des Google Drive Status" });
    }
  });

  app.post("/api/admin/google-drive/upload", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { fileId, title, description, type } = req.body;
      const userId = req.session.userId;

      if (!userId) {
        return res.status(401).json({ error: "Nicht authentifiziert" });
      }

      const user = await db.query.users.findFirst({
        where: eq(users.id, userId)
      });

      if (!user?.googleAccessToken) {
        return res.status(400).json({ error: "Keine Google Drive Verbindung" });
      }

      // Hier würde die Logik zum Speichern des Google Drive Links kommen
      // Je nachdem ob es ein Tutorial oder Onboarding Material ist

      res.json({ message: "Datei erfolgreich hochgeladen" });
    } catch (error) {
      console.error("Google Drive upload error:", error);
      res.status(500).json({ error: "Fehler beim Hochladen der Datei" });
    }
  });

  // Video Management Routes
  app.get('/api/admin/videos', async (req: Request, res: Response) => {
    try {
      const allVideos = await db.select().from(tutorials).orderBy(desc(tutorials.createdAt));
      res.status(200).json(allVideos);
    } catch (error) {
      console.error('Error fetching videos:', error);
      res.status(500).json({ error: 'Failed to fetch videos' });
    }
  });

  app.delete('/api/admin/videos/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const videoId = parseInt(id);
      
      // Get video info before deletion to remove the file
      const video = await db.query.tutorials.findFirst({
        where: eq(tutorials.id, videoId)
      });

      if (!video) {
        return res.status(404).json({ error: 'Video nicht gefunden' });
      }

      // First delete all related user progress entries
      await db.delete(userProgress).where(eq(userProgress.tutorialId, videoId));
      console.log('Deleted related user progress entries');

      // Then delete the video from database
      await db.delete(tutorials).where(eq(tutorials.id, videoId));
      console.log('Deleted video from database');

      // If it's a local file, remove it from the filesystem
      if (video.videoUrl.startsWith('/uploads/')) {
        const filePath = path.join(process.cwd(), video.videoUrl);
        try {
          await fsPromises.unlink(filePath);
          console.log('Deleted file:', filePath);
        } catch (err) {
          console.error('Error deleting file:', err);
          // Continue even if file deletion fails
        }
      }

      res.status(200).json({ message: 'Video erfolgreich gelöscht' });
    } catch (error) {
      console.error('Error deleting video:', error);
      res.status(500).json({ error: 'Failed to delete video' });
    }
  });

  app.post('/api/admin/upload', upload.single('file'), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const { title, description, type } = req.body;
      console.log('Received file:', req.file);
      console.log('Body:', { title, description, type });

      // Upload file using the upload utility
      const uploadResult = await uploadFile(req.file);

      // Save to database based on type
      const isOnboarding = type === 'onboarding';
      
      await db.insert(tutorials).values({
        title,
        description,
        videoUrl: uploadResult.url,
        category: type,
        isOnboarding,
        order: 0, // Default order, can be updated later
        createdAt: new Date(),
      });

      res.status(200).json({ 
        message: 'Video successfully uploaded',
        url: uploadResult.url
      });
    } catch (error) {
      console.error('Error uploading video:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to upload video' });
    }
  });

  app.get('/api/tutorials', async (req: Request, res: Response) => {
    try {
      const allVideos = await db.select().from(tutorials).where(eq(tutorials.isOnboarding, false));
      res.status(200).json(allVideos);
    } catch (error) {
      console.error('Error fetching tutorials:', error);
      res.status(500).json({ error: 'Failed to fetch tutorials' });
    }
  });

  app.get('/api/onboarding-videos', async (req: Request, res: Response) => {
    try {
      console.log('Fetching onboarding videos...');
      const videosList = await db.select().from(tutorials)
        .where(eq(tutorials.isOnboarding, true))
        .orderBy(desc(tutorials.createdAt));
      
      console.log('Found onboarding videos:', videosList);
      
      if (videosList.length === 0) {
        console.log('No onboarding videos found');
      }
      
      res.status(200).json(videosList);
    } catch (error) {
      console.error('Error fetching onboarding videos:', error);
      res.status(500).json({ error: 'Failed to fetch onboarding videos' });
    }
  });

  // Get all tutorials
  app.get("/api/tutorials", requireAuth, async (req: Request, res: Response) => {
    try {
      const tutorialVideos = await db.query.tutorials.findMany({
        where: eq(tutorials.isOnboarding, false),
        orderBy: [desc(tutorials.createdAt)]
      });

      const progress = await db.query.userProgress.findMany({
        where: and(
          eq(userProgress.userId, req.user!.id),
          inArray(userProgress.tutorialId, tutorialVideos.map(t => t.id))
        )
      });

      // Combine tutorial data with completion status
      const tutorialsWithProgress = tutorialVideos.map(tutorial => ({
        ...tutorial,
        completed: progress.some((p: typeof userProgress.$inferSelect) => p.tutorialId === tutorial.id && p.completed)
      }));

      res.json(tutorialsWithProgress);
    } catch (error) {
      console.error("Error fetching tutorials:", error);
      res.status(500).json({ error: "Fehler beim Laden der Tutorials" });
    }
  });

  // Mark tutorial as completed
  app.post("/api/tutorials/:id/complete", requireAuth, async (req: Request, res: Response) => {
    const tutorialId = parseInt(req.params.id);
    
    try {
      const existingProgress = await db.query.userProgress.findFirst({
        where: and(
          eq(userProgress.userId, req.user!.id),
          eq(userProgress.tutorialId, tutorialId)
        )
      });

      if (existingProgress) {
        await db.update(userProgress)
          .set({ completed: true })
          .where(eq(userProgress.id, existingProgress.id));
      } else {
        await db.insert(userProgress).values({
          userId: req.user!.id,
          tutorialId: tutorialId,
          completed: true
        });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error marking tutorial as completed:", error);
      res.status(500).json({ error: "Fehler beim Markieren des Tutorials als abgeschlossen" });
    }
  });
}
