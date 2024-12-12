import { type Express, type Request, type Response } from "express";
import bcrypt from "bcryptjs";
import { eq, desc, gte, inArray, and, sql, gt } from "drizzle-orm";
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
  customerChecklist,
  adminCustomerRelations,
  passwordResetTokens
} from "../db/schema";
import { upload, uploadFile } from "./upload";
import path from "path";
import "./types";
import { type User } from "./types";
import express from "express";
import { sendEmail } from "./services/email";
import { promises as fsPromises } from "fs";
import crypto from "crypto";

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
        onboardingCompleted: false,
        isApproved: false,
        currentPhase: "onboarding",
        progress: 0,
        completedPhases: []
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

      // Update isFirstLogin wenn es der erste Login ist
      let shouldRedirectToOnboarding = !user.onboardingCompleted;
      if (user.isFirstLogin) {
        await db.update(users)
          .set({ isFirstLogin: false })
          .where(eq(users.id, user.id));
      }

      req.session.userId = user.id;

      await new Promise<void>((resolve, reject) => {
        req.session.save((err) => {
          if (err) reject(err);
          else resolve();
        });
      });


      res.json({ 
        user: { 
          ...user, 
          password: undefined,
          shouldRedirectToOnboarding
        } 
      });
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
          currentPhase: "Complete",
          progress: 100,
          onboardingCompleted: true,
          isApproved: true,
          completedPhases: []
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
      await new Promise<void>((resolve, reject) => {
      req.session.save((err) => {
        if (err) reject(err);
        else resolve();
      });
    });

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
    if (!req.session.userId) {
      return res.json({ user: null });
    }

    try {
      // First get the user
      const user = await db.query.users.findFirst({
        where: eq(users.id, req.session.userId)
      });

      if (!user) {
        req.session.destroy(() => {});
        return res.json({ user: null });
      }

      // Check if user has completed onboarding
      const hasCompletedOnboarding = user.onboardingCompleted;

      // Send response with user data
      const { password: _, ...userWithoutPassword } = user;
      res.json({
        user: {
          ...userWithoutPassword,
          hasCompletedOnboarding
        }
      });
    } catch (error) {
      console.error("Session error:", error);
      res.status(500).json({ error: "Internal server error" });
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
      type CustomerWithChecklist = {
        id: number;
        firstName: string;
        lastName: string;
        email: string;
        currentPhase: string;
        completedPhases: unknown;
        progress: number;
        lastActive: Date | null;
        onboardingCompleted: boolean;
        checklistData: typeof customerChecklist.$inferSelect | null;
      };

      // Join users with their checklist data
      const customersWithChecklist = await db
        .select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          currentPhase: users.currentPhase,
          completedPhases: users.completedPhases,
          progress: users.progress,
          lastActive: users.lastActive,
          onboardingCompleted: users.onboardingCompleted,
          checklistData: customerChecklist
        })
        .from(users)
        .leftJoin(customerChecklist, eq(users.id, customerChecklist.userId))
        .where(eq(users.role, 'customer'))
        .orderBy(desc(users.createdAt));

      // Remove duplicate entries and empty fields
      const uniqueCustomers = customersWithChecklist.reduce((acc: CustomerWithChecklist[], current) => {
        const existingCustomer = acc.find(c => c.id === current.id);
        if (!existingCustomer) {
          // Filter out empty checklist fields
          if (current.checklistData) {
            const checklist = current.checklistData as Record<string, unknown>;
            Object.keys(checklist).forEach(key => {
              const value = checklist[key];
              if (value === '' || value === '{}' || value === null) {
                delete checklist[key];
              }
            });
            current.checklistData = checklist as typeof customerChecklist.$inferSelect;
          }
          acc.push(current as CustomerWithChecklist);
        }
        return acc;
      }, []);

      res.json(uniqueCustomers);
    } catch (error) {
      console.error("Error fetching customers for tracking:", error);
      res.status(500).json({ error: "Failed to fetch customers" });
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
        targetGroupGender,
        targetGroupAge,
        targetGroupLocation,
        targetGroupInterests
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
        targetGroupGender,
        targetGroupAge,
        targetGroupLocation,
        targetGroupInterests: targetGroupInterests || [],
        uniqueSellingPoint: '',
        marketSize: '',
        idealCustomerProfile: JSON.stringify({}),
        qualificationQuestions: JSON.stringify({})
      });

      // Get current user data to check onboarding status
      const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
        columns: {
          id: true,
          completedPhases: true
        }
      });

      const completedPhases = user?.completedPhases as string[] || [];

      // Only mark as complete if both onboarding videos and checklist are done
      if (user && completedPhases.includes("Einführungsvideo")) {
        await db.update(users)
          .set({ 
            onboardingCompleted: true,
            currentPhase: "Complete",
            progress: 100,
            completedPhases: ["Checkliste", "Onboarding", "Einführungsvideo"]
          })
          .where(eq(users.id, userId));
      } else {
        // Just mark the checklist as completed
        await db.update(users)
          .set({ 
            completedPhases: [...completedPhases, "Checkliste"]
          })
          .where(eq(users.id, userId));
      }

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

      // Get current user data to check checklist status
      const user = await db.query.users.findFirst({
        where: eq(users.id, Number(userId)),
        columns: {
          id: true,
          completedPhases: true
        }
      });

      const completedPhases = user?.completedPhases as string[] || [];

      // Check if checklist is already completed
      const checklistCompleted = completedPhases.includes("Checkliste");

      // Update user's onboarding status
      if (checklistCompleted) {
        // If checklist is already done, mark everything as complete
        await db.update(users)
          .set({
            onboardingCompleted: true,
            currentPhase: "Abgeschlossen",
            completedPhases: ["Willkommen", "Einführungsvideo", "Checkliste"],
            progress: 100,
          })
          .where(eq(users.id, Number(userId)));
      } else {
        // Just mark the videos as watched
        await db.update(users)
          .set({
            completedPhases: [...completedPhases, "Einführungsvideo"]
          })
          .where(eq(users.id, Number(userId)));
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error updating onboarding status:", error);
      res.status(500).json({ error: "Fehler beim Aktualisieren des Onboarding-Status" });
    }
  });

  app.post("/api/customer/onboarding/complete", requireAuth, async (req: Request, res: Response) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Update user's onboarding status
      await db.update(users)
        .set({ 
          onboardingCompleted: true,
          currentPhase: "onboarding", 
          progress: 20,
          completedPhases: ["onboarding", "Einführungsvideo", "Checkliste"] 
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
        paymentMethod,
        taxId,
        domain,
        targetAudience,
        companyInfo,
        webDesign,
        marketResearch,
        legalInfo,
        targetGroupGender,
        targetGroupAge,
        targetGroupLocation,
        targetGroupInterests,
        uniqueSellingPoint,
        marketSize
      } = req.body;

      // Prüfe, ob bereits ein Eintrag existiert
      const existingChecklist = await db.query.customerChecklist.findFirst({
        where: eq(customerChecklist.userId, req.user.id)
      });

      const checklistData = {
        paymentOption,
        paymentMethod,
        taxId,
        domain,
        targetAudience,
        companyInfo,
        webDesign: JSON.stringify(webDesign),
        marketResearch: JSON.stringify(marketResearch),
        legalInfo: JSON.stringify(legalInfo),
        targetGroupGender,
        targetGroupAge,
        targetGroupLocation,
        targetGroupInterests,
        uniqueSellingPoint,
        marketSize,
        idealCustomerProfile: JSON.stringify({}),
        qualificationQuestions: JSON.stringify({})
      };

      if (existingChecklist) {
        // Update existing checklist
        await db.update(customerChecklist)
          .set({
            ...checklistData,
            updatedAt: new Date()
          })
          .where(eq(customerChecklist.userId, req.user.id));
      } else {
        // Create new checklist
        await db.insert(customerChecklist)
          .values({
            userId: req.user.id,
            ...checklistData
          });
      }

      // Get current user to access completedPhases
      const currentUser = await db.query.users.findFirst({
        where: eq(users.id, req.user.id),
        columns: {
          id: true,
          completedPhases: true
        }
      });

      const completedPhases = currentUser?.completedPhases as string[] || [];

      if (!completedPhases.includes("Checkliste")) {
        completedPhases.push("Checkliste");
      }

      // Update user progress
      await db.update(users)
        .set({
          currentPhase: "Checkliste",
          progress: 40,
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

  app.post("/api/customer/logo", requireAuth, upload.single("logo"), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "Kein Logo hochgeladen" });
      }

      const { url } = await uploadFile(req.file);

      // Get or create user's checklist
      let currentChecklist = await db.select().from(customerChecklist)
        .where(eq(customerChecklist.userId, req.user!.id))
        .then(rows => rows[0]);

      if (!currentChecklist) {
        // Create a new checklist if one doesn't exist
        [currentChecklist] = await db.insert(customerChecklist)
          .values({
            userId: req.user!.id,
            paymentOption: '',  // Required field
            taxId: '',         // Required field
            domain: '',        // Required field
            targetAudience: '', // Required field
            companyInfo: '',    // Required field
            webDesign: JSON.stringify({ logoUrl: url }),
            marketResearch: JSON.stringify({}),
            legalInfo: JSON.stringify({}),
            targetGroupGender: '',
            targetGroupAge: '',
            targetGroupLocation: '',
            targetGroupInterests: [],
            uniqueSellingPoint: '',
            marketSize: '',
            idealCustomerProfile: JSON.stringify({}),
            qualificationQuestions: JSON.stringify({})
          })
          .returning();
      } else {
        // Update existing checklist with logo URL
        const currentWebDesign = typeof currentChecklist.webDesign === 'string' 
          ? JSON.parse(currentChecklist.webDesign) 
          : currentChecklist.webDesign;

        await db.update(customerChecklist)
          .set({
            webDesign: JSON.stringify({
              ...currentWebDesign,
              logoUrl: url
            })
          })
          .where(eq(customerChecklist.userId, req.user!.id));
      }

      res.json({ url });
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
        where: eq(users.id, req.user!.id)
      });

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Get checklist separately
      const checklist = await db.query.customerChecklist.findFirst({
        where: eq(customerChecklist.userId, user.id)
      });

      // Show onboarding if user hasn't completed it
      const showOnboarding = !user.onboardingCompleted;

      res.json({
        showOnboarding,
        user: {
          ...user,
          checklist
        }
      });
    } catch (error) {
      console.error("Dashboard error:", error);
      res.status(500).json({ error: "Internal server error" });
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
        paymentMethod,
        taxId,
        domain,
        targetGroupGender,
        targetGroupAge,
        targetGroupLocation,
        targetGroupInterests,
        webDesign,
        marketResearch,
        legalInfo,
        targetAudience,
        companyInfo
      } = req.body;

      // Save checklist data
      await db.insert(customerChecklist)
        .values({
          userId: req.user.id,
          paymentOption,
          paymentMethod,
          taxId,
          domain,
          targetAudience,
          companyInfo,
          webDesign: JSON.stringify(webDesign),
          marketResearch: JSON.stringify(marketResearch),
          legalInfo: JSON.stringify(legalInfo),
          targetGroupGender,
          targetGroupAge,
          targetGroupLocation,
          targetGroupInterests: targetGroupInterests || [],
          uniqueSellingPoint: '',
          marketSize: '',
          idealCustomerProfile: JSON.stringify({}),
          qualificationQuestions: JSON.stringify({})
        });

      // Get current user to access completedPhases
      const currentUser = await db.query.users.findFirst({
        where: eq(users.id, req.user.id),
        columns: {
          id: true,
          completedPhases: true
        }
      });

      const completedPhases = currentUser?.completedPhases as string[] || [];

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

  app.get('/api/onboarding-videos', requireAuth, async (req: Request, res: Response) => {
    try {
      const onboardingVideos = await db.select().from(tutorials)
        .where(eq(tutorials.isOnboarding, true))
        .orderBy(tutorials.order);
      res.status(200).json(onboardingVideos);
    } catch (error) {
      console.error('Error fetching onboarding videos:', error);
      res.status(500).json({ error: 'Failed to fetch onboarding videos' });
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

  app.post('/api/admin/upload', upload.fields([
    { name: 'file', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 }
  ]), async (req: Request, res: Response) => {
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      if (!files.file) {
        return res.status(400).json({ error: 'No video file uploaded' });
      }

      const { title, description, type, category } = req.body;
      console.log('Received files:', files);
      console.log('Body:', { title, description, type, category });

      // Upload video file
      const videoFile = files.file[0];
      const videoUploadResult = await uploadFile(videoFile);

      // Upload thumbnail if present
      let thumbnailUrl = null;
      if (files.thumbnail && files.thumbnail[0]) {
        const thumbnailFile = files.thumbnail[0];
        const thumbnailUploadResult = await uploadFile(thumbnailFile);
        thumbnailUrl = thumbnailUploadResult.url;
      }
      
      const insertData = {
        title,
        description,
        videoUrl: videoUploadResult.url,
        thumbnailUrl,
        category,
        isOnboarding: type === 'onboarding',
        order: 0,
        createdAt: new Date(),
      };

      await db.insert(tutorials).values(insertData);

      res.status(200).json({ 
        message: 'Video successfully uploaded',
        url: videoUploadResult.url,
        thumbnailUrl
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

  // Submit checklist
  app.post("/api/customer/checklist", requireAuth, async (req: Request, res: Response) => {
    try {
      const {
        paymentOption,
        paymentMethod,
        taxId,
        domain,
        targetGroupGender,
        targetGroupAge,
        targetGroupLocation,
        targetGroupInterests,
        webDesign,
        marketResearch,
        legalInfo,
        targetAudience,
        companyInfo
      } = req.body;

      // Filter out empty fields
      const checklistData: any = {};
      if (paymentOption) checklistData.paymentOption = paymentOption;
      if (paymentMethod) checklistData.paymentMethod = paymentMethod;
      if (taxId) checklistData.taxId = taxId;
      if (domain) checklistData.domain = domain;
      if (targetAudience) checklistData.targetAudience = targetAudience;
      if (companyInfo) checklistData.companyInfo = companyInfo;
      if (webDesign && Object.keys(webDesign).length > 0) checklistData.webDesign = JSON.stringify(webDesign);
      if (marketResearch && Object.keys(marketResearch).length > 0) checklistData.marketResearch = JSON.stringify(marketResearch);
      if (legalInfo && Object.keys(legalInfo).length > 0) checklistData.legalInfo = JSON.stringify(legalInfo);
      if (targetGroupGender) checklistData.targetGroupGender = targetGroupGender;
      if (targetGroupAge) checklistData.targetGroupAge = targetGroupAge;
      if (targetGroupLocation) checklistData.targetGroupLocation = targetGroupLocation;
      if (targetGroupInterests && Object.keys(targetGroupInterests).length > 0) {
        checklistData.targetGroupInterests = targetGroupInterests || []; // Fix: Don't stringify the array, pass it directly
      }

      // Prüfe, ob bereits ein Eintrag existiert
      const existingChecklist = await db.select()
        .from(customerChecklist)
        .where(eq(customerChecklist.userId, req.user!.id));

      if (existingChecklist.length > 0) {
        // Update existing checklist
        await db.update(customerChecklist)
          .set({
            ...checklistData,
            updatedAt: new Date()
          })
          .where(eq(customerChecklist.userId, req.user!.id));
      } else {
        // Create new checklist
        await db.insert(customerChecklist)
          .values({
            userId: req.user!.id,
            ...checklistData
          });
      }

      // Update user's onboarding status
      await db.update(users)
        .set({
          onboardingCompleted: true,
        })
        .where(eq(users.id, req.user!.id));

      res.json({ success: true });
    } catch (error) {
      console.error("Error submitting checklist:", error);
      res.status(500).json({ error: "Failed to submit checklist" });
    }
  });

  // Get customer checklist data by user ID
  app.get("/api/admin/customer-checklist/:userId", requireAdmin, async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      
      const checklistData = await db.select()
        .from(customerChecklist)
        .where(eq(customerChecklist.userId, userId))
        .orderBy(desc(customerChecklist.updatedAt))
        .limit(1);

      if (!checklistData || checklistData.length === 0) {
        return res.status(404).json({ error: "Checklist data not found" });
      }

      return res.json(checklistData[0]);
    } catch (error) {
      console.error("Error fetching customer checklist:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // Admin customer routes
  app.get("/api/admin/customers/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const customer = await db.query.users.findFirst({
        where: eq(users.id, parseInt(id))
      });

      if (!customer) {
        return res.status(404).json({ error: "Customer not found" });
      }

      res.json(customer);
    } catch (error) {
      console.error("Error fetching customer:", error);
      res.status(500).json({ error: "Failed to fetch customer" });
    }
  });

  app.get("/api/admin/customer-checklist/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const checklist = await db.query.customerChecklist.findFirst({
        where: eq(customerChecklist.userId, parseInt(id))
      });

      if (!checklist) {
        return res.status(404).json({ error: "Checklist not found" });
      }

      res.json(checklist);
    } catch (error) {
      console.error("Error fetching checklist:", error);
      res.status(500).json({ error: "Failed to fetch checklist" });
    }
  });

  app.get("/api/customer/progress/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const user = await db.query.users.findFirst({
        where: eq(users.id, parseInt(id))
      });

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json({
        currentPhase: user.currentPhase,
        completedPhases: user.completedPhases,
        progress: user.progress
      });
    } catch (error) {
      console.error("Error fetching progress:", error);
      res.status(500).json({ error: "Failed to fetch progress" });
    }
  });

  // Update user phase (Admin only)
  app.post("/api/admin/user-phase/:userId", requireAdmin, async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      const { phase } = req.body;

      if (!phase) {
        return res.status(400).json({ error: "Phase is required" });
      }

      // Get current user data
      const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
        columns: {
          id: true,
          completedPhases: true
        }
      });

      const completedPhases = user?.completedPhases as string[] || [];

      // Calculate progress based on phase
      let progress = 20; // Base progress after onboarding
      switch (phase) {
        case "landingpage":
          progress = 40;
          break;
        case "ads":
          progress = 60;
          break;
        case "whatsapp":
          progress = 80;
          break;
        case "webinar":
          progress = 100;
          break;
        case "onboarding":
          progress = 20;
          break;
      }

      // Update completedPhases array
      if (!completedPhases.includes(phase)) {
        completedPhases.push(phase);
      }

      // Update user
      await db.update(users)
        .set({
          currentPhase: phase,
          progress,
          completedPhases
        })
        .where(eq(users.id, userId));

      // Create or update user progress entry
      const tutorial = await db.query.tutorials.findFirst({
        where: eq(tutorials.category, phase)
      });

      if (tutorial) {
        const existingProgress = await db.query.userProgress.findFirst({
          where: and(
            eq(userProgress.userId, userId),
            eq(userProgress.tutorialId, tutorial.id)
          )
        });

        if (!existingProgress) {
          await db.insert(userProgress).values({
            userId,
            tutorialId: tutorial.id,
            completed: true,
            completedAt: new Date()
          });
        }
      }

      res.json({ message: "Phase updated successfully" });
    } catch (error) {
      console.error("Error updating user phase:", error);
      res.status(500).json({ error: "Failed to update user phase" });
    }
  });

  // Delete customer (admin only)
  app.delete("/api/admin/customers/:id", requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      
      // Delete all related records first
      await db.delete(userProgress).where(eq(userProgress.userId, userId));
      await db.delete(customerChecklist).where(eq(customerChecklist.userId, userId));
      await db.delete(metrics).where(eq(metrics.userId, userId));
      await db.delete(callbacksTable).where(eq(callbacksTable.userId, userId));
      await db.delete(adminCustomerRelations).where(eq(adminCustomerRelations.customerId, userId));
      
      // Delete referrals where user is either referrer or referred
      await db.delete(referrals).where(eq(referrals.referrerId, userId));
      await db.delete(referrals).where(eq(referrals.referredId, userId));
      
      // Finally delete the user
      await db.delete(users).where(eq(users.id, userId));
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting customer:", error);
      res.status(500).json({ error: "Kunde konnte nicht gelöscht werden" });
    }
  });

  // Password Reset Routes
  app.post("/api/password-reset/request", async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email || !email.trim()) {
        return res.status(400).json({ error: "Bitte geben Sie eine E-Mail-Adresse ein" });
      }

      console.log('Processing password reset request for:', email);

      // Prüfe ob der Benutzer existiert
      const user = await db.query.users.findFirst({
        where: eq(users.email, email.trim().toLowerCase()),
        columns: {
          id: true,
          firstName: true,
          role: true,
          email: true,
          isApproved: true
        }
      });

      if (!user) {
        return res.status(400).json({ 
          error: "Diese E-Mail-Adresse ist nicht registriert. Bitte überprüfen Sie die Adresse oder registrieren Sie sich." 
        });
      }

      if (user.role !== "customer") {
        return res.status(400).json({ 
          error: "Diese Funktion ist nur für Kunden verfügbar." 
        });
      }

      if (!user.isApproved) {
        return res.status(400).json({ 
          error: "Ihr Account wurde noch nicht freigegeben. Bitte warten Sie auf die Freigabe-E-Mail." 
        });
      }

      // Lösche alte Reset-Tokens für diesen Benutzer
      await db.delete(passwordResetTokens)
        .where(eq(passwordResetTokens.userId, user.id));

      // Generiere neuen Token
      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 3600000); // 1 Stunde

      console.log('Generated new reset token for user:', user.id);

      // Speichere Token in der Datenbank
      await db.insert(passwordResetTokens).values({
        userId: user.id,
        token,
        expiresAt,
        used: false
      });

      // Sende Reset-E-Mail
      const resetLink = `${process.env.CLIENT_URL}/reset-password/${token}`;
      await sendEmail(user.email, "passwordReset", { 
        firstName: user.firstName,
        resetLink
      });

      console.log('Password reset email sent successfully to:', user.email);
      res.json({ message: "Eine E-Mail mit Anweisungen zum Zurücksetzen Ihres Passworts wurde versendet." });
    } catch (error) {
      console.error("Password reset request error:", error);
      res.status(500).json({ 
        error: "Es ist ein Fehler aufgetreten. Bitte versuchen Sie es später erneut."
      });
    }
  });

  app.post("/api/password-reset/verify", async (req: Request, res: Response) => {
    try {
      const { token } = req.body;
      const resetToken = await db.query.passwordResetTokens.findFirst({
        where: and(
          eq(passwordResetTokens.token, token),
          eq(passwordResetTokens.used, false),
          gt(passwordResetTokens.expiresAt, new Date())
        ),
        with: {
          user: {
            columns: {
              id: true,
              role: true
            }
          }
        }
      });

      if (!resetToken?.user || resetToken.user.role !== "customer") {
        return res.status(400).json({ error: "Ungültiger oder abgelaufener Token" });
      }

      res.json({ valid: true });
    } catch (error) {
      console.error("Token verification error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.put("/api/password-reset/reset", async (req: Request, res: Response) => {
    try {
      const { token, newPassword } = req.body;
      const resetToken = await db.query.passwordResetTokens.findFirst({
        where: and(
          eq(passwordResetTokens.token, token),
          eq(passwordResetTokens.used, false),
          gt(passwordResetTokens.expiresAt, new Date())
        ),
        columns: {
          id: true,
          userId: true
        },
        with: {
          user: {
            columns: {
              id: true,
              role: true
            }
          }
        }
      });

      if (!resetToken?.user || resetToken.user.role !== "customer") {
        return res.status(400).json({ error: "Ungültiger oder abgelaufener Token" });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update password and mark token as used
      await db.transaction(async (tx) => {
        await tx.update(users)
          .set({ password: hashedPassword })
          .where(eq(users.id, resetToken.user.id));

        await tx.update(passwordResetTokens)
          .set({ used: true })
          .where(eq(passwordResetTokens.id, resetToken.id));
      });

      res.json({ message: "Passwort wurde erfolgreich zurückgesetzt" });
    } catch (error) {
      console.error("Password reset error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Tutorial Routes
  app.get('/api/tutorials', requireAuth, async (req: Request, res: Response) => {
    try {
      const allTutorials = await db.select().from(tutorials)
        .where(eq(tutorials.isOnboarding, false))
        .orderBy(tutorials.order);
      res.status(200).json(allTutorials);
    } catch (error) {
      console.error('Error fetching tutorials:', error);
      res.status(500).json({ error: 'Failed to fetch tutorials' });
    }
  });

  app.post('/api/tutorials/:id/complete', requireAuth, async (req: Request, res: Response) => {
    try {
      const tutorialId = parseInt(req.params.id);
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Nicht authentifiziert' });
      }

      // Add or update progress
      await db.insert(userProgress)
        .values({
          userId,
          tutorialId,
          completed: true,
          completedAt: new Date()
        })
        .onConflictDoUpdate({
          target: [userProgress.userId, userProgress.tutorialId],
          set: { completed: true, completedAt: new Date() }
        });

      res.json({ success: true });
    } catch (error) {
      console.error('Error marking tutorial as complete:', error);
      res.status(500).json({ error: 'Failed to mark tutorial as complete' });
    }
  });

  // Update checklist route
  app.put("/api/customer/checklist", requireAuth, async (req: Request, res: Response) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const {
        paymentOption,
        paymentMethod,
        taxId,
        domain,
        targetAudience,
        companyInfo,
        webDesign,
        marketResearch,
        legalInfo,
        targetGroupGender,
        targetGroupAge,
        targetGroupLocation,
        targetGroupInterests,
        uniqueSellingPoint,
        marketSize
      } = req.body;

      const checklistData = {
        paymentOption,
        paymentMethod,
        taxId,
        domain,
        targetAudience,
        companyInfo,
        webDesign: JSON.stringify(webDesign),
        marketResearch: JSON.stringify(marketResearch),
        legalInfo: JSON.stringify(legalInfo),
        targetGroupGender,
        targetGroupAge,
        targetGroupLocation,
        targetGroupInterests,
        uniqueSellingPoint,
        marketSize,
        idealCustomerProfile: JSON.stringify({}),
        qualificationQuestions: JSON.stringify({})
      };

      await db.update(customerChecklist)
        .set(checklistData)
        .where(eq(customerChecklist.userId, req.user.id));

      res.json({ message: "Checklist updated successfully" });
    } catch (error) {
      console.error("Error updating checklist:", error);
      res.status(500).json({ error: "Failed to update checklist" });
    }
  });

  // Get checklist route
  app.get("/api/customer/checklist", requireAuth, async (req: Request, res: Response) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const checklist = await db.query.customerChecklist.findFirst({
        where: eq(customerChecklist.userId, req.user.id)
      });

      if (!checklist) {
        return res.status(404).json({ error: "Checklist not found" });
      }

      res.json(checklist);
    } catch (error) {
      console.error("Error fetching checklist:", error);
      res.status(500).json({ error: "Failed to fetch checklist" });
    }
  });

  // Get customer checklist (for both admin and customer)
  app.get("/api/customer-checklist/:userId", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      console.log("Fetching checklist for userId:", userId, "Request user:", req.user?.id, "Role:", req.user?.role);

      // Ensure user can only access their own checklist unless they're admin
      if (req.user?.role !== "admin" && req.user?.id !== userId) {
        return res.status(403).json({ error: "Unauthorized access" });
      }

      const checklist = await db.query.customerChecklist.findFirst({
        where: eq(customerChecklist.userId, userId)
      });

      if (!checklist) {
        console.log("No checklist found for userId:", userId);
        return res.status(404).json({ error: "Checklist not found" });
      }

      console.log("Checklist found:", checklist);
      res.json(checklist);
    } catch (error) {
      console.error("Error fetching checklist:", error);
      res.status(500).json({ error: "Failed to fetch checklist" });
    }
  });

  app.post("/api/customer/checklist", requireAuth, async (req: Request, res: Response) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const {
        paymentOption,
        paymentMethod,
        taxId,
        domain,
        targetAudience,
        companyInfo,
        webDesign,
        marketResearch,
        legalInfo,
        targetGroupGender,
        targetGroupAge,
        targetGroupLocation,
        targetGroupInterests,
        uniqueSellingPoint,
        marketSize
      } = req.body;

      // Prüfe, ob bereits ein Eintrag existiert
      const existingChecklist = await db.query.customerChecklist.findFirst({
        where: eq(customerChecklist.userId, req.user.id)
      });

      const checklistData = {
        paymentOption,
        paymentMethod,
        taxId,
        domain,
        targetAudience,
        companyInfo,
        webDesign: JSON.stringify(webDesign),
        marketResearch: JSON.stringify(marketResearch),
        legalInfo: JSON.stringify(legalInfo),
        targetGroupGender,
        targetGroupAge,
        targetGroupLocation,
        targetGroupInterests,
        uniqueSellingPoint,
        marketSize,
        idealCustomerProfile: JSON.stringify({}),
        qualificationQuestions: JSON.stringify({})
      };

      if (existingChecklist) {
        // Update existing checklist
        await db.update(customerChecklist)
          .set({
            ...checklistData,
            updatedAt: new Date()
          })
          .where(eq(customerChecklist.userId, req.user.id));
      } else {
        // Create new checklist
        await db.insert(customerChecklist)
          .values({
            userId: req.user.id,
            ...checklistData
          });
      }

      // Get current user to access completedPhases
      const currentUser = await db.query.users.findFirst({
        where: eq(users.id, req.user.id),
        columns: {
          id: true,
          completedPhases: true
        }
      });

      const completedPhases = currentUser?.completedPhases as string[] || [];

      if (!completedPhases.includes("Checkliste")) {
        completedPhases.push("Checkliste");
      }

      // Update user progress
      await db.update(users)
        .set({
          currentPhase: "Checkliste",
          progress: 40,
          completedPhases: completedPhases
        })
        .where(eq(users.id, req.user.id));

      res.json({ message: "Checklist saved successfully" });
    } catch (error) {
      console.error("Error saving checklist:", error);
      res.status(500).json({ error: "Failed to save checklist" });
    }
  });

  // Meta connection route
  app.post("/api/meta/connect", requireAuth, async (req: Request, res: Response) => {
    try {
      const { accessToken } = req.body;
      const userId = req.user?.id;

      if (!userId || !accessToken) {
        return res.status(400).json({ error: "Missing required data" });
      }

      // Update user with Meta access token
      await db.update(users)
        .set({ 
          metaAccessToken: accessToken,
          metaConnected: true 
        })
        .where(eq(users.id, userId));

      // Fetch initial metrics from Meta API
      const metaData = await fetchMetaMetrics(accessToken);
      
      // Store metrics in database
      await db.insert(metrics).values({
        userId,
        leads: metaData.leads,
        adSpend: metaData.spend,
        clicks: metaData.clicks,
        impressions: metaData.impressions,
        date: new Date()
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Error connecting Meta account:", error);
      res.status(500).json({ error: "Failed to connect Meta account" });
    }
  });

  // Helper function to fetch Meta metrics
  async function fetchMetaMetrics(userAccessToken: string) {
    try {
      // Hole zuerst die Ad Accounts des Users
      const accountResponse = await fetch(
        'https://graph.facebook.com/v18.0/me/adaccounts?fields=name,account_id',
        {
          headers: {
            'Authorization': `Bearer ${userAccessToken}`
          }
        }
      );
      
      if (!accountResponse.ok) {
        const error = await accountResponse.json();
        console.error("Meta API Error:", error);
        throw new Error(`Failed to fetch ad accounts: ${error.error?.message || 'Unknown error'}`);
      }

      const accounts = await accountResponse.json();
      console.log('Ad Accounts Response:', accounts); // Debug log

      if (!accounts.data || accounts.data.length === 0) {
        throw new Error("No ad accounts found");
      }

      // Nutze act_ Prefix für Ad Account ID
      const adAccountId = accounts.data[0].id.startsWith('act_') 
        ? accounts.data[0].id 
        : `act_${accounts.data[0].id}`;

      console.log('Using Ad Account ID:', adAccountId); // Debug log

      // Hole dann die Insights für das Werbekonto
      const insightsResponse = await fetch(
        `https://graph.facebook.com/v18.0/${adAccountId}/insights?` +
        `fields=impressions,clicks,spend,actions,action_values&` +
        `date_preset=maximum&` + // Hole alle verfügbaren Daten
        `level=account&` + // Account-Level Metriken
        `limit=500`,  // Mehr Ergebnisse
        {
          headers: {
            'Authorization': `Bearer ${userAccessToken}`
          }
        }
      );

      if (!insightsResponse.ok) {
        const error = await insightsResponse.json();
        console.error("Meta Insights API Error:", error);
        throw new Error(`Failed to fetch insights: ${error.error?.message || 'Unknown error'}`);
      }

      const data = await insightsResponse.json();
      console.log('Insights Response:', data); // Debug log

      // Summiere alle Werte
      const insights = data.data.reduce((acc: any, curr: any) => ({
        impressions: (acc.impressions || 0) + parseInt(curr.impressions || '0'),
        clicks: (acc.clicks || 0) + parseInt(curr.clicks || '0'),
        spend: (acc.spend || 0) + parseFloat(curr.spend || '0'),
        actions: [...(acc.actions || []), ...(curr.actions || [])]
      }), {});

      // Summiere alle Leads
      const allActions = insights.actions || [];
      const leads = allActions
        .filter((a: any) => a.action_type === 'lead')
        .reduce((sum: number, action: any) => sum + parseInt(action.value || '0'), 0);

      return {
        leads,
        spend: insights.spend || 0,
        clicks: insights.clicks || 0,
        impressions: insights.impressions || 0
      };
    } catch (error) {
      console.error("Error in fetchMetaMetrics:", error);
      throw error;
    }
  }

  // Update metrics route to include Meta data
  app.get("/api/metrics/:userId", async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      
      // Hole die letzten 7 Tage Metriken
      const metricsData = await db.query.metrics.findMany({
        where: eq(metrics.userId, userId),
        orderBy: desc(metrics.date),
        limit: 7
      });

      if (!metricsData || metricsData.length === 0) {
        return res.json([]);  // Leeres Array zurückgeben, wenn keine Daten gefunden
      }

      // Sortiere die Daten nach Datum (älteste zuerst)
      const sortedMetrics = metricsData.sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      res.json(sortedMetrics);
    } catch (error) {
      console.error("Error fetching metrics:", error);
      res.status(500).json({ error: "Failed to fetch metrics" });
    }
  });

  // Facebook Data Deletion Endpoint
  app.post('/api/data-deletion', async (req, res) => {
    try {
      const { signed_request } = req.body;
      
      if (!signed_request) {
        return res.status(400).json({
          message: "Signed request is required",
          url: "http://localhost:5173/data-deletion.html",
          confirmation_code: "not_available"
        });
      }

      // TODO: Verify signed_request and extract user_id
      // For now, we'll just acknowledge the request
      
      console.log('Received data deletion request');

      // Respond to Facebook with confirmation
      res.json({
        url: "http://localhost:5173/data-deletion.html",
        confirmation_code: Date.now().toString(),
        status: "success"
      });
      
    } catch (error) {
      console.error('Error processing deletion request:', error);
      res.status(500).json({
        message: "Internal server error",
        url: "http://localhost:5173/data-deletion.html"
      });
    }
  });
}
