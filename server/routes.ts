import type { Express, Request, Response, NextFunction } from "express";
import { db } from "../db";
import { users, tutorials, userProgress, metrics, referrals, callbacks, companySettings } from "@db/schema";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import { eq, and } from "drizzle-orm";
import bcrypt from "bcrypt";
import { z } from "zod";
import session from "express-session";

declare module "express-session" {
  interface SessionData {
    userId: number;
  }
}

// Admin middleware
async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.userId) {
    return res.status(401).json({ error: "Nicht authentifiziert" });
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, req.session.userId)
  });

  if (!user || user.role !== "admin") {
    return res.status(403).json({ error: "Keine Administratorrechte" });
  }

  next();
}

export function registerRoutes(app: Express) {
  // Configure session middleware
  app.use(session({
    secret: "your-secret-key",
    resave: true,
    saveUninitialized: true,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
      sameSite: "lax",
      path: "/"
    }
  }));

  // Auth Routes
  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    
    const user = await db.query.users.findFirst({
      where: eq(users.email, email)
    });

    if (!user || !await bcrypt.compare(password, user.password)) {
      return res.status(401).json({ error: "Ungültige Anmeldedaten" });
    }

    if (!user.isApproved && user.role === "customer") {
      return res.status(403).json({ error: "Account wartet auf Freigabe" });
    }

    req.session.userId = user.id;
    await new Promise<void>((resolve) => req.session!.save(() => resolve()));

    res.json({ user: { ...user, password: undefined } });
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Fehler beim Abmelden" });
      }
      res.json({ message: "Erfolgreich abgemeldet" });
    });
  });

  app.get("/api/auth/session", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "Nicht authentifiziert" });
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, req.session.userId)
    });

    if (!user) {
      return res.status(401).json({ error: "Benutzer nicht gefunden" });
    }

    res.json({ user: { ...user, password: undefined } });
  });

  app.post("/api/auth/register", async (req, res) => {
    const schema = z.object({
      email: z.string().email(),
      password: z.string().min(8),
      firstName: z.string(),
      lastName: z.string(),
      companyName: z.string().optional(),
    });

    const data = schema.parse(req.body);
    const hashedPassword = await bcrypt.hash(data.password, 10);

    const newUser = await db.insert(users).values({
      ...data,
      password: hashedPassword,
      role: "customer",
    }).returning();

    res.json({ message: "Registrierung erfolgreich" });
  });

  // Admin Routes
  app.get("/api/admin/stats", requireAdmin, async (req, res) => {
    const [pendingApprovals, activeUsers, totalTutorials] = await Promise.all([
      db.query.users.findMany({
        where: and(
          eq(users.role, "customer"),
          eq(users.isApproved, false)
        )
      }).then(users => users.length),
      db.query.users.findMany({
        where: and(
          eq(users.role, "customer"),
          eq(users.isApproved, true)
        )
      }).then(users => users.length),
      db.query.tutorials.findMany().then(tutorials => tutorials.length)
    ]);

    res.json({ pendingApprovals, activeUsers, totalTutorials });
  });

  // User Routes
  app.get("/api/users/pending", requireAdmin, async (req, res) => {
    const pendingUsers = await db.query.users.findMany({
      where: and(
        eq(users.role, "customer"),
        eq(users.isApproved, false)
      )
    });
    res.json(pendingUsers);
  });

  app.post("/api/users/:id/approve", requireAdmin, async (req, res) => {
    const { id } = req.params;
    await db.update(users)
      .set({ isApproved: true })
      .where(eq(users.id, parseInt(id)));
    res.json({ message: "Benutzer freigegeben" });
  });

  // Tutorial Routes
  app.post("/api/tutorials", requireAdmin, async (req, res) => {
    const newTutorial = await db.insert(tutorials).values(req.body).returning();
    res.json(newTutorial[0]);
  });

  app.get("/api/tutorials", async (req, res) => {
    const allTutorials = await db.query.tutorials.findMany();
    res.json(allTutorials);
  });

  // Metrics Routes
  app.get("/api/metrics/:userId", async (req, res) => {
    const { userId } = req.params;
    const userMetrics = await db.query.metrics.findMany({
      where: eq(metrics.userId, parseInt(userId))
    });
    res.json(userMetrics);
  });

  // Callback Routes
  app.post("/api/callbacks", async (req, res) => {
    const newCallback = await db.insert(callbacks).values(req.body).returning();
    res.json(newCallback[0]);
  });

  // Progress Routes
  app.post("/api/progress", async (req, res) => {
    const progress = await db.insert(userProgress).values(req.body).returning();
    res.json(progress[0]);
  });

  // Referral Routes
  app.post("/api/referrals", async (req, res) => {
    const newReferral = await db.insert(referrals).values(req.body).returning();
    res.json(newReferral[0]);
  });

  // Ensure uploads directory exists with proper permissions
  const uploadsDir = path.join(process.cwd(), "uploads");
  (async () => {
    try {
      await fs.access(uploadsDir);
      console.log("Uploads directory exists");
    } catch {
      console.log("Creating uploads directory");
      await fs.mkdir(uploadsDir, { recursive: true });
      // Ensure directory has proper permissions (755)
      await fs.chmod(uploadsDir, 0o755);
    }
    
    // Verify directory permissions
    const stats = await fs.stat(uploadsDir);
    console.log("Uploads directory permissions:", {
      mode: stats.mode,
      uid: stats.uid,
      gid: stats.gid
    });
  })();

  // Configure multer for logo uploads
  const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
      try {
        await fs.access(uploadsDir);
        cb(null, uploadsDir);
      } catch (error) {
        cb(error as Error, uploadsDir);
      }
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
      cb(null, "company-logo-" + uniqueSuffix + path.extname(file.originalname));
    }
  });

  const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
      const allowedTypes = ["image/jpeg", "image/png", "image/gif"];
      if (!allowedTypes.includes(file.mimetype)) {
        cb(new Error("Ungültiger Dateityp. Erlaubt sind nur JPG, PNG und GIF."));
        return;
      }
      cb(null, true);
    }
  });

  // Settings Routes
  app.get("/api/admin/settings", requireAdmin, async (req, res) => {
    const settings = await db.query.companySettings.findFirst();
    res.json(settings || {
      companyName: "",
      email: "admin@nextmove.de",
      phone: "",
      address: "",
      logoUrl: ""
    });
  });

  app.post("/api/admin/settings", requireAdmin, async (req, res) => {
    try {
      const schema = z.object({
        companyName: z.string().min(1, "Firmenname ist erforderlich"),
        email: z.string().email("Ungültige E-Mail-Adresse"),
        phone: z.string().min(1, "Telefonnummer ist erforderlich"),
        address: z.string().min(1, "Adresse ist erforderlich"),
      });

      const validatedData = schema.parse(req.body);
      const existingSettings = await db.query.companySettings.findFirst();
      
      if (existingSettings) {
        await db.update(companySettings)
          .set({
            ...validatedData,
            updatedAt: new Date(),
          })
          .where(eq(companySettings.id, existingSettings.id));
      } else {
        await db.insert(companySettings).values({
          ...validatedData,
          updatedAt: new Date(),
        });
      }

      res.json({ message: "Einstellungen aktualisiert", success: true });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ 
          error: "Validierungsfehler", 
          details: error.errors 
        });
      } else {
        console.error("Settings update error:", error);
        res.status(500).json({ 
          error: "Einstellungen konnten nicht gespeichert werden" 
        });
      }
    }
  });

  app.post("/api/admin/logo", requireAdmin, upload.single("logo"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "Keine Datei hochgeladen" });
      }

      // Validate file and generate URL
      const filename = req.file.filename;
      const absolutePath = path.join(process.cwd(), "uploads", filename);
      const logoUrl = `/uploads/${filename}`;

      console.log("Logo Upload - Processing:", {
        filename,
        absolutePath,
        logoUrl,
        mimeType: req.file.mimetype,
        fileSize: req.file.size
      });

      // Validate file exists and is accessible
      try {
        const stats = await fs.stat(absolutePath);
        console.log("Logo Upload - File stats:", {
          size: stats.size,
          permissions: stats.mode,
          created: stats.birthtime,
          modified: stats.mtime
        });
      } catch (error) {
        console.error("Logo Upload - File validation error:", error);
        throw new Error("Uploaded file validation failed");
      }

      // Verify uploaded file exists
      try {
        await fs.access(absolutePath);
      } catch (error) {
        console.error("Logo Upload - File access error:", error);
        throw new Error("Hochgeladene Datei konnte nicht gefunden werden");
      }

      // Fetch existing settings
      const existingSettings = await db.query.companySettings.findFirst();
      console.log("Logo Upload - Existing settings:", existingSettings);

      // Delete old logo if exists
      if (existingSettings?.logoUrl) {
        try {
          const oldLogoPath = path.join(process.cwd(), existingSettings.logoUrl);
          await fs.access(oldLogoPath);
          await fs.unlink(oldLogoPath);
          console.log("Logo Upload - Deleted old logo:", oldLogoPath);
        } catch (error) {
          console.error("Logo Upload - Error deleting old logo:", error);
        }
      }

      // Update or create settings with transaction
      try {
        if (existingSettings) {
          await db.update(companySettings)
            .set({
              logoUrl,
              updatedAt: new Date(),
            })
            .where(eq(companySettings.id, existingSettings.id));
        } else {
          await db.insert(companySettings).values({
            logoUrl,
            companyName: "",
            email: "admin@nextmove.de",
            phone: "",
            address: "",
            updatedAt: new Date(),
          });
        }

        // Verify settings were updated
        const updatedSettings = await db.query.companySettings.findFirst();
        console.log("Logo Upload - Updated settings:", updatedSettings);

        if (!updatedSettings || updatedSettings.logoUrl !== logoUrl) {
          throw new Error("Logo-URL wurde nicht korrekt in der Datenbank gespeichert");
        }

        res.json({ 
          logoUrl,
          message: "Logo erfolgreich hochgeladen",
          settings: updatedSettings
        });
      } catch (error) {
        console.error("Logo Upload - Database error:", error);
        throw new Error("Fehler beim Speichern des Logos in der Datenbank");
      }
    } catch (error) {
      console.error("Logo Upload - Fatal error:", error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Fehler beim Hochladen des Logos",
        details: process.env.NODE_ENV === "development" ? error : undefined
      });
    }
  });
}
