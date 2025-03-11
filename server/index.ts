import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import resumeParserRouter from "./routes/resume-parser";
import resumeAiAssistantRouter from "./routes/resume-ai-assistant";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Add the resume routes
app.use(resumeParserRouter);
app.use(resumeAiAssistantRouter);

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

const startServer = async (port: number): Promise<void> => {
  try {
    const server = await registerRoutes(app);

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      res.status(status).json({ message });
      throw err;
    });

    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    return new Promise((resolve, reject) => {
      server.listen(port, "0.0.0.0", () => {
        log(`serving on port ${port}`);
        resolve();
      }).on('error', (error: NodeJS.ErrnoException) => {
        if (error.code === 'EADDRINUSE') {
          reject(new Error(`Port ${port} is in use`));
        } else {
          reject(error);
        }
      });
    });
  } catch (error) {
    throw error;
  }
};

// Try ports in sequence
const tryPorts = async () => {
  const ports = [5000, 5001, 5002, 5003];

  for (const port of ports) {
    try {
      await startServer(port);
      return; // Successfully started
    } catch (error) {
      if (error instanceof Error && error.message.includes('Port')) {
        log(`Port ${port} is busy, trying next port...`);
        continue;
      }
      throw error; // Re-throw non-port related errors
    }
  }
  throw new Error('All ports in range are busy');
};

tryPorts().catch(error => {
  log(`Failed to start server: ${error.message}`);
  process.exit(1);
});