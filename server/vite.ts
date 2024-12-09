import express, { type Express } from "express";
import fs from "fs";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import { type Server } from "http";

export async function setupVite(app: Express, server: Server) {
  if (process.env.NODE_ENV === 'production') {
    return;
  }
  
  const { createServer: createViteServer } = await import('vite');
  const { default: react } = await import('@vitejs/plugin-react');
  
  const vite = await createViteServer({
    server: {
      middlewareMode: true,
      hmr: { server },
    },
    plugins: [react()],
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        __dirname,
        "..",
        "client",
        "index.html"
      );

      // always reload the index.html file from disk incase it changes
      const template = await fs.promises.readFile(clientTemplate, "utf-8");
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const clientDist = path.resolve(__dirname, "../client/dist");

  if (!fs.existsSync(clientDist)) {
    throw new Error(
      `Could not find the client build directory: ${clientDist}, make sure to build the client first`
    );
  }

  // Serve static files
  app.use(express.static(clientDist));

  // Always return index.html for any other route to support client-side routing
  app.get("*", (req, res) => {
    // Skip API routes
    if (req.path.startsWith('/api')) {
      return res.status(404).json({ error: 'API route not found' });
    }
    res.sendFile(path.join(clientDist, "index.html"));
  });
}
