import type { Express } from "express";
import { createServer } from "http";
import multer from "multer";
import { storage } from "./storage";
import { analyzeResume, matchJobDescription, generateCoverLetter } from "./lib/openai";
import { insertResumeSchema, insertJobSchema } from "@shared/schema";

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
  app.post("/api/resumes", upload.single("file"), async (req, res) => {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const content = file.buffer.toString();
      const resume = await storage.createResume({
        userId: "temp-user", // TODO: Add proper user management
        title: file.originalname,
        content,
        fileType: file.mimetype
      });

      // Analyze the resume
      const analysis = await analyzeResume(content);
      await storage.updateResume(resume.id, {
        atsScore: analysis.atsScore,
        enhancedContent: analysis.enhancedContent,
        analysis
      });

      res.json(resume);
    } catch (error: unknown) {
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

  // Job matching routes
  app.post("/api/jobs", async (req, res) => {
    try {
      const job = await storage.createJob(insertJobSchema.parse(req.body));
      res.json(job);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "An unknown error occurred";
      res.status(500).json({ message });
    }
  });

  app.post("/api/jobs/:jobId/match/:resumeId", async (req, res) => {
    try {
      const job = await storage.getJob(parseInt(req.params.jobId));
      const resume = await storage.getResume(parseInt(req.params.resumeId));

      if (!job || !resume) {
        return res.status(404).json({ message: "Job or resume not found" });
      }

      const match = await matchJobDescription(resume.content, job.description);
      await storage.updateJob(job.id, {
        matchScore: match.matchScore,
        analysis: match
      });

      res.json(match);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "An unknown error occurred";
      res.status(500).json({ message });
    }
  });

  // Cover letter routes
  app.post("/api/cover-letters", async (req, res) => {
    try {
      const { resumeId, jobId } = req.body;
      const resume = await storage.getResume(resumeId);
      const job = await storage.getJob(jobId);

      if (!resume || !job) {
        return res.status(404).json({ message: "Resume or job not found" });
      }

      const content = await generateCoverLetter(resume.content, job.description);
      const coverLetter = await storage.createCoverLetter({
        resumeId,
        jobId,
        content
      });

      res.json(coverLetter);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "An unknown error occurred";
      res.status(500).json({ message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}