import type { Express } from "express";
import { createServer } from "http";
import multer from "multer";
import { storage } from "./storage";
import { analyzeResume } from "./services/resume-analyzer";
import { matchJob, tweakResume } from "./services/job-matcher";
import { insertResumeSchema } from "@shared/schema";
import PDFParser from 'pdf-parse-fork';

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

async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    const data = await PDFParser(buffer);
    return data.text;
  } catch (error) {
    console.error('PDF parsing error:', error);
    throw new Error('Failed to parse PDF file');
  }
}

export async function registerRoutes(app: Express) {
  // Resume routes
  app.post("/api/resumes", upload.single("resume"), async (req, res) => {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Extract text content from the file
      let content: string;
      if (file.mimetype === 'application/pdf') {
        content = await extractTextFromPDF(file.buffer);
      } else if (file.mimetype === 'text/plain') {
        content = file.buffer.toString('utf-8');
      } else {
        return res.status(400).json({ message: "Only PDF and TXT files are supported at this time" });
      }

      // First create the resume record
      const resume = await storage.createResume({
        userId: "temp-user", // TODO: Add proper user management
        title: file.originalname,
        content: content,
        fileType: file.mimetype,
      });

      // Analyze the resume using OpenAI
      const analysis = await analyzeResume(content);

      // Update the resume with analysis results and enhanced content
      const updatedResume = await storage.updateResume(resume.id, {
        atsScore: analysis.overallScore,
        enhancedContent: analysis.enhancedContent,
        analysis: {
          categoryScores: analysis.categoryScores,
          improvements: analysis.improvements,
          formattingFixes: analysis.formattingFixes
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

  // Add this route after the other resume routes
  app.post("/api/resumes/:id/tweak", async (req, res) => {
    try {
      const resumeId = parseInt(req.params.id);
      const { jobDescription } = req.body;

      const resume = await storage.getResume(resumeId);
      if (!resume) {
        return res.status(404).json({ message: "Resume not found" });
      }

      const { enhancedContent, improvements } = await tweakResume(resume.content, jobDescription);

      // Update the resume with the tweaked content
      const updatedResume = await storage.updateResume(resumeId, {
        enhancedContent,
        analysis: {
          ...resume.analysis,
          improvements,
        }
      });

      res.json(updatedResume);
    } catch (error: unknown) {
      console.error("Resume tweaking error:", error);
      const message = error instanceof Error ? error.message : "An unknown error occurred";
      res.status(500).json({ message });
    }
  });

  // Job routes
  app.post("/api/jobs", async (req, res) => {
    try {
      const { title, description } = req.body;
      const job = await storage.createJob({
        title,
        description,
        company: "",  // Optional field
      });
      res.json(job);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "An unknown error occurred";
      res.status(500).json({ message });
    }
  });

  // Job matching route
  app.post("/api/jobs/:jobId/match/:resumeId", async (req, res) => {
    try {
      const jobId = parseInt(req.params.jobId);
      const resumeId = parseInt(req.params.resumeId);

      const job = await storage.getJob(jobId);
      const resume = await storage.getResume(resumeId);

      if (!job || !resume) {
        return res.status(404).json({ message: "Job or resume not found" });
      }

      const analysis = await matchJob(resume.content, job.description);

      // Update job with match score and analysis
      await storage.updateJob(jobId, {
        matchScore: analysis.matchScore,
        analysis: analysis
      });

      res.json({
        matchScore: analysis.matchScore,
        missingKeywords: analysis.missingKeywords,
        suggestedEdits: analysis.suggestedEdits
      });
    } catch (error: unknown) {
      console.error("Job matching error:", error);
      const message = error instanceof Error ? error.message : "An unknown error occurred";
      res.status(500).json({ message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}