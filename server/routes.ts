import type { Express } from "express";
import { createServer } from "http";
import multer from "multer";
import { storage } from "./storage";
import { analyzeResume } from "./lib/openai";
import { insertResumeSchema } from "@shared/schema";

// Add multer type definitions
declare module 'express-serve-static-core' {
  interface Request {
    file?: Express.Multer.File
  }
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

export async function registerRoutes(app: Express) {
  // Resume routes
  app.post("/api/resumes", upload.single("resume"), async (req, res) => {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Convert buffer to string for text-based files
      const content = file.buffer.toString('utf-8');

      console.log("File received:", {
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size
      });

      // First create the resume
      const resume = await storage.createResume({
        userId: "temp-user", // TODO: Add proper user management
        title: file.originalname,
        content,
        fileType: file.mimetype
      });

      // Then analyze it
      const analysis = await analyzeResume(content);

      // Update with analysis results
      const updatedResume = await storage.updateResume(resume.id, {
        atsScore: analysis.atsScore,
        enhancedContent: analysis.enhancedContent,
        analysis: {
          strengths: analysis.strengths,
          weaknesses: analysis.weaknesses,
        }
      });

      res.json(updatedResume);
    } catch (error: unknown) {
      console.error("Resume upload error:", error);
      const message = error instanceof Error ? error.message : "An unknown error occurred";
      res.status(500).json({ message });
    }
  });

  app.get("/api/resumes/:id", async (req, res) => {
    try {
      const resume = await storage.getResume(parseInt(req.params.id));
      if (!resume) {
        return res.status(404).json({ message: "Resume not found" });
      }
      res.json(resume);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "An unknown error occurred";
      res.status(500).json({ message });
    }
  });

  app.get("/api/resumes", async (req, res) => {
    try {
      const resumes = await storage.getUserResumes("temp-user");
      res.json(resumes);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "An unknown error occurred";
      res.status(500).json({ message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}