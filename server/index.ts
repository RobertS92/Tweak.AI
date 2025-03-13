import express, { type Request, Response, NextFunction } from "express";
import { createServer } from "http";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import resumeParserRouter from "./routes/resume-parser";
import resumeAiAssistant from "./routes/resume-ai-assistant";
import interviewAiRouter from "./routes/interview-ai";

// Start debug logging
log("[DEBUG] Starting server initialization...");

const app = express();

// Basic middleware setup
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Add logging middleware
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

// Add early ping endpoint for health checks
app.get("/api/ping", (_, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

const startServer = async (port: number): Promise<void> => {
  try {
    log(`[DEBUG] Attempting to start server on port ${port}...`);

    // Create HTTP server
    const server = createServer(app);

    // Register API routes first, before Vite/static middleware
    log("[DEBUG] Registering routes...");
    
    // First, register the routes with the router
    await registerRoutes(app);
    
    // Then use the routers we imported
    app.use("/api", resumeParserRouter);
    app.use("/api", resumeAiAssistant);
    app.use("/api", interviewAiRouter);

    // Error handling middleware
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      console.error("[ERROR]", err);
      res.status(status).json({ message });
    });

    // Register Vite/static middleware last
    if (app.get("env") === "development") {
      log("[DEBUG] Setting up Vite development server...");
      await setupVite(app, server);
    } else {
      log("[DEBUG] Setting up static file serving...");
      serveStatic(app);
    }

    return new Promise((resolve, reject) => {
      log(`[DEBUG] Binding to port ${port}...`);
      server.listen(port, "0.0.0.0", () => {
        log(`[DEBUG] Server successfully started on port ${port}`);
        resolve();
      }).on('error', (error: NodeJS.ErrnoException) => {
        log(`[DEBUG] Server startup error: ${error.message}`);
        reject(error);
      });
    });
  } catch (error) {
    log(`[DEBUG] Server initialization error: ${error}`);
    throw error;
  }
};

// Start server directly on port 5000
log("[DEBUG] Initiating server startup on port 5000...");
startServer(5000).catch(error => {
  log(`Failed to start server: ${error.message}`);
  process.exit(1);
});