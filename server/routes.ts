import type { Express } from "express";
import { createServer } from "http";
import express from 'express';
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
import { jobScraper } from './services/job-scraper';

// Add type definitions
declare module 'express-serve-static-core' {
  interface Request {
    file?: Express.Multer.File
  }
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Configure multer
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Helper function to truncate text
function truncateText(text: string, maxLength: number = 4000): string {
  return text.length > maxLength ? text.slice(0, maxLength) + '...' : text;
}

// Add this helper function for token estimation
function estimateTokenCount(text: string): number {
  // GPT models typically use ~4 chars per token
  return Math.ceil(text.length / 4);
}

// Update the section extraction function
function extractRelevantSections(content: string): string {
  console.log("Starting content extraction. Initial length:", content.length);

  // Split into sections
  const sections = content.split(/\n\n+/);

  // Keywords that likely indicate skills-related content
  const skillsKeywords = [
    'skills', 'technologies', 'competencies', 'expertise',
    'proficiencies', 'technical', 'tools', 'languages',
    'frameworks', 'platforms', 'software', 'certifications'
  ];

  // Find relevant sections with scoring
  const scoredSections = sections.map(section => {
    const lowerSection = section.toLowerCase();
    let score = 0;

    // Score based on keywords
    skillsKeywords.forEach(keyword => {
      if (lowerSection.includes(keyword)) score += 2;
    });

    // Score bullet points and lists
    if (section.includes('•') || section.includes('-')) score += 1;
    if (section.split(',').length > 2) score += 1;

    // Penalize very long sections
    if (section.length > 500) score -= 1;

    return { section, score };
  });

  // Sort by score and take top sections
  const relevantSections = scoredSections
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ section }) => section);

  // Combine sections and ensure we're well under token limit
  let combinedContent = relevantSections.join('\n\n');
  const maxTokens = 2000; // Conservative limit, ~8k characters

  // If still too long, take most relevant sections until under limit
  if (estimateTokenCount(combinedContent) > maxTokens) {
    console.log("Content too long, truncating sections...");
    combinedContent = '';
    for (const section of relevantSections) {
      const potentialContent = combinedContent + '\n\n' + section;
      if (estimateTokenCount(potentialContent) <= maxTokens) {
        combinedContent = potentialContent;
      } else {
        break;
      }
    }
  }

  console.log("Final content length:", combinedContent.length,
              "Estimated tokens:", estimateTokenCount(combinedContent));

  return combinedContent.trim();
}

// Add more robust PDF handling function
async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    // First validate if it's a valid PDF by checking for PDF signature
    const pdfSignature = buffer.toString('ascii', 0, 5);
    if (pdfSignature !== '%PDF-') {
      throw new Error('Invalid PDF format');
    }

    const data = await PDFParser(buffer, {
      max: 0, // No page limit
      version: 'v2.0.550'
    });

    // Validate extracted text
    if (!data || !data.text || typeof data.text !== 'string') {
      throw new Error('No text content extracted from PDF');
    }

    const text = data.text.trim();
    if (text.length === 0) {
      throw new Error('Extracted text is empty');
    }

    return text;
  } catch (error) {
    console.error('PDF parsing error:', error);
    throw new Error('Unable to extract text from PDF. Please try uploading a different file format or copy-paste the content directly.');
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
  // Configure express middleware BEFORE routes
  app.use(express.json({ limit: '50mb', strict: false }));
  app.use(express.urlencoded({ limit: '50mb', extended: true, parameterLimit: 50000 }));
  app.use(express.text({ limit: '50mb' }));

  // Resume routes
  app.post("/api/resumes", upload.single("resume"), async (req, res) => {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Extract text content from the file
      let content: string;
      try {
        if (file.mimetype === 'application/pdf') {
          content = await extractTextFromPDF(file.buffer);
        } else if (file.mimetype === 'text/plain') {
          content = file.buffer.toString('utf-8');
        } else {
          return res.status(400).json({ 
            message: "Only PDF and TXT files are supported at this time. Please try a different file format." 
          });
        }

        // Validate content
        if (!content || content.trim().length === 0) {
          throw new Error('No content could be extracted from the file');
        }
      } catch (extractError) {
        console.error('Content extraction error:', extractError);
        return res.status(400).json({ 
          message: extractError.message || "Failed to extract content from file" 
        });
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

      // Update the resume with analysis results
      const updatedResume = await storage.updateResume(resume.id, {
        atsScore: Math.round(analysis.overallScore), // Ensure integer
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

  // Add new route for resume optimization
  app.post("/api/resumes/:id/tweak", async (req, res) => {
    try {
      const resumeId = parseInt(req.params.id);
      const { jobDescription } = req.body;

      const resume = await storage.getResume(resumeId);
      if (!resume) {
        return res.status(404).json({ message: "Resume not found" });
      }

      // Enhanced optimization using OpenAI
      const optimizationResponse = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: 'You are an expert ATS optimization specialist. Format your response as a valid JSON object with specific fields. Example format: {"optimizedContent": "...", "changes": ["..."], "matchScore": 85, "keywordMatches": ["..."], "missingKeywords": ["..."], "formatImprovements": ["..."]}. Use proper JSON escaping for any special characters in strings.'
          },
          {
            role: "user",
            content: `Here is the job description and resume to optimize:
Job Description:
${jobDescription}
Current Resume:
${resume.content}

Return an optimized version that matches keywords and improves ATS score while maintaining truthfulness.`
          }
        ],
        temperature: 0.3
      });

      if (!optimizationResponse.choices[0].message.content) {
        throw new Error("No optimization response received");
      }

      console.log("Raw optimization response:", optimizationResponse.choices[0].message.content);

      try {
        const optimization = JSON.parse(optimizationResponse.choices[0].message.content.trim());

        // Update the resume with optimized content and detailed analysis
        await storage.updateResume(resumeId, {
          enhancedContent: optimization.optimizedContent,
          analysis: {
            ...resume.analysis,
            jobOptimization: {
              jobId: null,
              changes: optimization.changes || [],
              matchScore: optimization.matchScore || 0,
              keywordMatches: optimization.keywordMatches || [],
              missingKeywords: optimization.missingKeywords || [],
              formatImprovements: optimization.formatImprovements || [],
              timestamp: new Date().toISOString()
            }
          }
        });

        res.json(optimization);
      } catch (parseError) {
        console.error("Failed to parse optimization response:", parseError);
        throw new Error("Invalid response format from optimization");
      }
    } catch (error) {
      console.error("Resume optimization error:", error);
      res.status(500).json({ message: "Failed to optimize resume" });
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

  // Update the PDF download route
  app.post("/api/resumes/download-pdf", async (req, res) => {
    if (!req.body.content) {
      return res.status(400).json({ message: "Resume content is required" });
    }

    try {
      const { content } = req.body;

      const browser = await puppeteer.launch({
        headless: 'new',
        executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      try {
        const page = await browser.newPage();

        // Set content with consistent styling
        await page.setContent(`
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Enhanced Resume</title>
            <style>
              @page {
                size: letter;
                margin: 0.75in;
              }

              body {
                margin: 0;
                padding: 0;
                font-family: 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                background: white;
              }

              .resume-content {
                max-width: 100%;
                margin: 0 auto;
              }

              h1 {
                font-size: 28px;
                margin-bottom: 8px;
                color: #2C3E50;
                font-weight: 600;
                text-align: center;
              }

              h2 {
                font-size: 18px;
                color: #2C3E50;
                margin-bottom: 10px;
                padding-bottom: 5px;
                border-bottom: 2px solid #3E7CB1;
                font-weight: 600;
              }

              h3 {
                font-size: 16px;
                color: #2C3E50;
                margin-bottom: 4px;
                font-weight: 600;
              }

              .contact-info {
                text-align: center;
                font-size: 14px;
                margin-bottom: 5px;
                color: #555;
              }

              ul {
                padding-left: 20px;
                margin-bottom: 8px;
                list-style-type: disc;
              }

              li {
                margin-bottom: 4px;
                font-size: 14px;
              }

              p {
                margin-bottom: 8px;
                font-size: 14px;
              }

              section {
                margin-bottom: 20px;
              }
            </style>
          </head>
          <body>
            <div class="resume-content">
              ${content}
            </div>
          </body>
          </html>
        `, { waitUntil: 'networkidle0' });

        // Generate PDF with consistent dimensions
        const pdf = await page.pdf({
          format: 'Letter',
          printBackground: true,
          preferCSSPageSize: true
        });

        // Set proper headers for PDF download
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=enhanced_resume_${new Date().toISOString().split('T')[0]}.pdf`);
        res.send(pdf);

      } finally {
        await browser.close();
      }
    } catch (error) {
      console.error('PDF generation failed:', error);
      res.status(500).json({ 
        message: 'Failed to generate PDF', 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Add job search route from edited snippet
  app.post("/api/jobs/search", async (req, res) => {
    try {
      const { keywords, resumeId } = req.body;

      if (!keywords || !resumeId) {
        return res.status(400).json({
          message: "Missing required parameters: keywords and resumeId"
        });
      }

      // First get the resume content if available
      let resumeContent = "";
      if (resumeId) {
        const resume = await storage.getResume(resumeId);
        if (!resume) {
          return res.status(404).json({ message: "Resume not found" });
        }
        // Truncate resume content to avoid token limits
        resumeContent = truncateText(resume.content);
      }

      console.log("Starting job search with keywords:", keywords);

      // Use OpenAI to analyze resume and create optimal search queries
      const searchAnalysisResponse = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are a job search expert that creates search strategies. Return a JSON object with search terms and filters optimized for finding relevant jobs."
          },
          {
            role: "user",
            content: `Based on these keywords: ${keywords}\nAnd this truncated resume content: ${resumeContent}\n\nCreate a focused job search strategy. Return JSON with searchQueries (array, max 5 most relevant search strings), requiredSkills (array, max 10 key skills), and niceToHaveSkills (array, max 5 skills).`
          }
        ],
        temperature: 0.7
      });

      if (!searchAnalysisResponse.choices[0].message.content) {
        throw new Error("No search strategy generated");
      }

      console.log("Generated search strategy:", searchAnalysisResponse.choices[0].message.content);

      const searchStrategy = JSON.parse(searchAnalysisResponse.choices[0].message.content);
      const searchQueries = searchStrategy.searchQueries;

      // Scrape jobs from multiple sources using all search queries
      console.log("Starting job scraping with queries:", searchQueries);

      const jobPromises = searchQueries.map(query => jobScraper.searchJobs(query));
      const jobsByQuery = await Promise.all(jobPromises);

      // Flatten and deduplicate jobs by URL
      const uniqueJobs = Array.from(
        new Map(
          jobsByQuery.flat().map(job => [job.url, job])
        ).values()
      );

      console.log(`Found ${uniqueJobs.length} unique jobs`);

      // For each job, perform detailed matching analysis
      const jobsWithAnalysis = await Promise.all(
        uniqueJobs.map(async (job) => {
          try {
            const analysis = await matchJob(resumeContent, job.description);
            return {
              ...job,
              ...analysis
            };
          } catch (error) {
            console.error('Job analysis failed:', error);
            return null;
          }
        })
      );

      // Filter out failed analyses and sort by match score
      const validJobs = jobsWithAnalysis
        .filter(Boolean)
        .sort((a, b) => (b?.matchScore || 0) - (a?.matchScore || 0));

      console.log(`Returning ${validJobs.length} analyzed jobs`);
      res.json(validJobs);
    } catch (error) {
      console.error("Job search error:", error);
      res.status(500).json({
        message: error instanceof Error ? error.message : "Failed to search for jobs"
      });
    }
  });

  // Add new route for resume optimization
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
        model: "gpt-4",
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