import type { Express } from "express";
import { createServer } from "http";
import multer from "multer";
import { storage } from "./storage";
import { analyzeResume } from "./services/resume-analyzer";
import { matchJob, tweakResume } from "./services/job-matcher";
import { insertResumeSchema } from "@shared/schema";
import PDFParser from 'pdf-parse-fork';
import * as fs from 'fs';
import * as path from 'path';
import OpenAI from "openai";
import puppeteer from 'puppeteer';
import { db } from "./db";

// Add multer type definitions
declare module 'express-serve-static-core' {
  interface Request {
    file?: Express.Multer.File
  }
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

async function extractTextFromImage(buffer: Buffer): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4-vision-preview",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Extract and return only the text content from this job description image. Include all details but remove any irrelevant text or formatting."
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${buffer.toString('base64')}`
              }
            }
          ],
        },
      ],
      max_tokens: 1000,
    });

    return response.choices[0].message.content || '';
  } catch (error) {
    console.error('Image text extraction error:', error);
    throw new Error('Failed to extract text from image');
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

  // Add new route for job description file upload
  app.post("/api/jobs/upload", upload.single("jobDescription"), async (req, res) => {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      let content: string;

      // Extract text based on file type
      if (file.mimetype === 'application/pdf') {
        content = await extractTextFromPDF(file.buffer);
      } else if (file.mimetype === 'text/plain') {
        content = file.buffer.toString('utf-8');
      } else if (file.mimetype.startsWith('image/')) {
        content = await extractTextFromImage(file.buffer);
      } else if (file.mimetype === 'application/msword' ||
                 file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        // For Word documents, we'll need a conversion library
        // For now, return an error
        return res.status(400).json({
          message: "Word document support coming soon. Please copy and paste the content for now."
        });
      } else {
        return res.status(400).json({
          message: "Unsupported file type. Please upload a PDF, text file, or image."
        });
      }

      res.json({ content });
    } catch (error: unknown) {
      console.error("Job description upload error:", error);
      const message = error instanceof Error ? error.message : "An unknown error occurred";
      res.status(500).json({ message });
    }
  });

  // Add new PDF download route
  app.post("/api/resumes/:id/download-pdf", async (req, res) => {
    try {
      const resumeId = parseInt(req.params.id);
      const resume = await storage.getResume(resumeId);

      if (!resume) {
        return res.status(404).json({ message: "Resume not found" });
      }

      // Launch browser
      const browser = await puppeteer.launch({
        headless: 'new',
      });
      const page = await browser.newPage();

      // Set content with proper styling
      await page.setContent(`
        <html>
          <head>
            <meta charset="UTF-8">
            <style>
              body {
                font-family: 'Arial', sans-serif;
                line-height: 1.6;
                padding: 40px;
                max-width: 800px;
                margin: 0 auto;
              }
              .section { margin-bottom: 24px; }
              h2 {
                font-size: 18px;
                color: #333;
                border-bottom: 1px solid #ddd;
                padding-bottom: 4px;
                margin-bottom: 12px;
              }
              h3 { 
                font-size: 16px;
                color: #444;
                margin-bottom: 6px;
              }
              .job-title {
                font-style: italic;
                color: #666;
                margin-bottom: 8px;
              }
              ul {
                margin: 8px 0;
                padding-left: 20px;
              }
              li {
                margin: 6px 0;
              }
              p { margin: 8px 0; }
            </style>
          </head>
          <body>
            ${resume.enhancedContent || resume.content}
          </body>
        </html>
      `);

      // Generate PDF
      const pdf = await page.pdf({
        format: 'A4',
        margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' },
        printBackground: true,
        displayHeaderFooter: false,
      });

      await browser.close();

      // Send PDF with proper headers
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=${resume.title.replace(/\s+/g, '-')}.pdf`);
      res.send(pdf);
    } catch (error) {
      console.error('PDF generation failed:', error);
      res.status(500).json({ message: 'Failed to generate PDF' });
    }
  });

  // Add this to the existing route handlers in registerRoutes
  app.post("/api/resumes/analyze", async (req, res) => {
    try {
      const { content, sectionType } = req.body;

      if (sectionType === "skills") {
        // Use OpenAI to extract skills from resume content
        const response = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: "You are an expert at analyzing resumes and extracting technical and professional skills. Extract all relevant skills and return them as a JSON array."
            },
            {
              role: "user",
              content: `Extract all technical and professional skills from this resume content: ${content}`
            }
          ],
          response_format: { type: "json_object" }
        });

        const skills = JSON.parse(response.choices[0].message.content);
        res.json({ skills: skills.skills || [] });
        return;
      }

      // Prepare the prompt based on section type
      let prompt = `Analyze and improve the following ${sectionType} section of a resume:\n\n${content}\n\n`;
      prompt += "Provide specific suggestions for improvements in JSON format with the following structure:\n";
      prompt += "{\n  'enhancedContent': 'improved version',\n  'suggestions': ['specific suggestion 1', 'specific suggestion 2'],\n  'explanation': 'detailed explanation of improvements'\n}";

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an expert resume writer and career coach. Analyze the resume content and provide specific, actionable improvements."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" }
      });

      const analysis = JSON.parse(response.choices[0].message.content);
      res.json(analysis);
    } catch (error: unknown) {
      console.error("Resume analysis error:", error);
      const message = error instanceof Error ? error.message : "An unknown error occurred";
      res.status(500).json({ message });
    }
  });

  // Add job search route from edited snippet
  app.post("/api/jobs/search", async (req, res) => {
    try {
      const { keywords, resumeId } = req.body;

      // First get the resume content if available
      let resumeContent = "";
      if (resumeId) {
        const resume = await storage.getResume(resumeId);
        if (resume) {
          resumeContent = resume.content;
        }
      }

      // Use OpenAI to analyze resume and create optimal search queries
      const searchAnalysisResponse = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a job search expert that creates search strategies. Return a JSON object with search terms and filters optimized for finding relevant jobs."
          },
          {
            role: "user",
            content: `Keywords: ${keywords}\nResume content: ${resumeContent}\n\nCreate a comprehensive job search strategy. Return JSON with searchQueries (array of search strings), requiredSkills (array), and niceToHaveSkills (array).`
          }
        ],
        response_format: { type: "json_object" }
      });

      const searchStrategy = JSON.parse(searchAnalysisResponse.choices[0].message.content);

      // Here we would integrate with real job boards APIs
      // For now simulate with enhanced mock data that demonstrates the functionality
      const mockJobs = [
        {
          id: 1,
          title: "Senior Machine Learning Engineer",
          company: "AI Solutions Inc",
          location: "Remote",
          description: "Looking for an experienced ML engineer with expertise in deep learning, Python, and TensorFlow. Must have experience with large language models and neural networks. Knowledge of cloud platforms (AWS/GCP) required.",
          requirements: [
            "5+ years of ML experience",
            "Python, TensorFlow, PyTorch",
            "Deep Learning expertise",
            "Cloud platforms (AWS/GCP)",
          ],
          matchScore: 92,
          skillMatch: {
            matched: ["Python", "TensorFlow", "Deep Learning"],
            missing: ["AWS"],
          },
          salary: "$150,000 - $200,000",
          remote: true,
          postedDate: new Date().toISOString(),
          url: "https://example.com/job/1"
        },
        {
          id: 2,
          title: "AI Research Scientist",
          company: "Tech Innovations Corp",
          location: "San Francisco, CA",
          description: "Join our research team working on cutting-edge AI applications. Focus on NLP and computer vision projects. PhD in Computer Science or related field preferred.",
          requirements: [
            "PhD in Computer Science or related field",
            "Publication track record",
            "Python, PyTorch",
            "NLP expertise"
          ],
          matchScore: 85,
          skillMatch: {
            matched: ["Python", "NLP", "Machine Learning"],
            missing: ["Computer Vision"],
          },
          salary: "$180,000 - $220,000",
          remote: false,
          postedDate: new Date().toISOString(),
          url: "https://example.com/job/2"
        }
      ];

      // Sort jobs by match score and recency
      const sortedJobs = mockJobs.sort((a, b) => {
        // Prioritize both match score and recency
        return (b.matchScore * 0.7 + new Date(b.postedDate).getTime() * 0.3) - 
               (a.matchScore * 0.7 + new Date(a.postedDate).getTime() * 0.3);
      });

      res.json(sortedJobs);
    } catch (error) {
      console.error("Job search error:", error);
      res.status(500).json({ message: "Failed to search for jobs" });
    }
  });

  // Enhanced resume optimization route from edited snippet
  app.post("/api/jobs/:jobId/optimize/:resumeId", async (req, res) => {
    try {
      const jobId = parseInt(req.params.jobId);
      const resumeId = parseInt(req.params.resumeId);

      const resume = await storage.getResume(resumeId);
      const job = await storage.getJob(jobId);

      if (!resume || !job) {
        return res.status(404).json({ message: "Resume or job not found" });
      }

      // Enhanced optimization using OpenAI
      const optimizationResponse = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are an expert ATS optimization specialist. Analyze the job description and resume, then provide optimized content that:
            1. Matches keywords and phrases from the job description
            2. Maintains factual accuracy of the original resume
            3. Improves ATS-friendliness
            4. Highlights relevant experience and skills
            5. Uses industry-standard formatting`
          },
          {
            role: "user",
            content: `
              Job Description: ${job.description}
              Current Resume: ${resume.content}

              Optimize this resume for ATS and human readability while maintaining truthfulness.
              Return a JSON object with:
              {
                "optimizedContent": "The ATS-optimized resume content",
                "changes": ["Detailed list of changes made"],
                "matchScore": "Score 0-100",
                "keywordMatches": ["Array of matched keywords"],
                "missingKeywords": ["Important keywords not present"],
                "formatImprovements": ["List of formatting improvements"]
              }
            `
          }
        ],
        response_format: { type: "json_object" }
      });

      const optimization = JSON.parse(optimizationResponse.choices[0].message.content);

      // Update the resume with optimized content and detailed analysis
      await storage.updateResume(resumeId, {
        enhancedContent: optimization.optimizedContent,
        analysis: {
          ...resume.analysis,
          jobOptimization: {
            jobId,
            changes: optimization.changes,
            matchScore: optimization.matchScore,
            keywordMatches: optimization.keywordMatches,
            missingKeywords: optimization.missingKeywords,
            formatImprovements: optimization.formatImprovements,
            timestamp: new Date().toISOString()
          }
        }
      });

      res.json(optimization);
    } catch (error) {
      console.error("Resume optimization error:", error);
      res.status(500).json({ message: "Failed to optimize resume" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}