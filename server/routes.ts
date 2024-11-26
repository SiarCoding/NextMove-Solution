import type { Express, Request, Response, NextFunction } from "express";
import { db } from "../db";
import { users, tutorials, userProgress, metrics, referrals, callbacks } from "@db/schema";
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
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
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
}
