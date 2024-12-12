import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic } from "./vite";
import { createServer } from "http";
// CORS import entfernen oder lassen, aber nicht nutzen
// import cors from "cors";
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

// CORS configuration - Entfernen oder nur in Dev nutzen
// if (process.env.NODE_ENV !== 'production') {
//   app.use(cors({
//     origin: ["http://localhost:5000", "http://localhost:5173"],
//     credentials: true,
//     methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
//     allowedHeaders: ['Content-Type', 'Authorization']
//   }));
// }
// Im Produktionsmodus kein CORS notwendig, da Same-Origin.

const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || "your-secret-key",
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === "production", // mit HTTPS sicher
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: "strict" // Da Frontend und Backend auf derselben Domain laufen, ist strict ok
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

app.use(express.json({ limit: '1gb' }));
app.use(express.urlencoded({ extended: true, limit: '1gb' }));
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.use((req, res, next) => {
  const start = Date.now();
  const routePath = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (routePath.startsWith("/api")) {
      let logLine = `${req.method} ${routePath} ${res.statusCode} in ${duration}ms`;
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

  // Error Handling Middleware mit err: unknown
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const status = (err as any)?.status || (err as any)?.statusCode || 500;
    const message = (err as any)?.message || "Internal Server Error";
    res.status(status).json({ message });
    console.error(err);
  });

  const server = createServer(app);

  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const PORT = parseInt(process.env.PORT ?? "5000", 10);
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running on port ${PORT}`);
  });
})();
