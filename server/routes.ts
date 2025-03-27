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
import chromium from '@sparticuz/chromium';
import { db } from "./db";

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

      // Input validation with detailed error messages
      if (!jobDescription || typeof jobDescription !== 'string') {
        return res.status(400).json({
          message: "Invalid job description format",
          details: "Job description must be provided as a text string"
        });
      }

      const cleanJobDescription = jobDescription.replace(/\r\n/g, '\n').trim();
      if (cleanJobDescription.length === 0) {
        return res.status(400).json({
          message: "Job description cannot be empty",
          details: "Please provide a valid job description"
        });
      }

      console.log("[DEBUG] Processing resume tweak request");
      console.log("[DEBUG] Job description length:", cleanJobDescription.length);

      const resume = await storage.getResume(resumeId);
      if (!resume) {
        return res.status(404).json({ 
          message: "Resume not found",
          details: "The requested resume could not be found" 
        });
      }

      console.log("[DEBUG] Found resume, starting optimization");

      // Enhanced optimization using OpenAI
      const response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: 'You are an expert ATS optimization specialist. Your response must be a valid JSON string that can be parsed. Use this exact format: {"optimizedContent": "...", "changes": ["..."], "matchScore": 85, "keywordMatches": ["..."], "missingKeywords": ["..."], "formatImprovements": ["..."]}. Escape special characters properly.'
          },
          {
            role: "user",
            content: `Here is the job description and resume to optimize:
Job Description:
${cleanJobDescription}
Current Resume:
${resume.content}

Return an optimized version that matches keywords and improves ATS score while maintaining truthfulness. Return ONLY valid JSON.`
          }
        ],
        temperature: 0.3
      });

      if (!response.choices[0].message.content) {
        throw new Error("No optimization response received");
      }

      console.log("[DEBUG] Received optimization response");

      try {
        const optimization = JSON.parse(response.choices[0].message.content.trim());

        if (!optimization.optimizedContent) {
          throw new Error("Missing optimized content in response");
        }

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

        res.json({
          optimizedContent: optimization.optimizedContent,
          changes: optimization.changes || [],
          keywordMatches: optimization.keywordMatches || [],
          formatImprovements: optimization.formatImprovements || []
        });
      } catch (parseError) {
        console.error("[DEBUG] Failed to parse optimization response:", parseError);
        throw new Error("Invalid response format from optimization service");
      }
    } catch (error) {
      console.error("[DEBUG] Resume optimization error:", error);
      res.status(500).json({
        message: "Failed to optimize resume",
        details: error instanceof Error ? error.message : "Unknown error occurred"
      });
    }
  });

  // Added generatePDFTemplate function
  function generatePDFTemplate(resumeData: any): string {
    if (!resumeData) {
      throw new Error('Resume data is required');
    }

    const sections = resumeData.sections || [];
    const workExperience = sections.find(s => s.id === 'work-experience')?.items || [];
    const education = sections.find(s => s.id === 'education')?.items || [];
    const skills = sections.find(s => s.id === 'skills')?.categories || [];
    const summary = sections.find(s => s.id === 'professional-summary')?.content || '';

    return `
      <div class="resume-content">
        <h1>${resumeData.personalInfo?.name || ''}</h1>
        <div class="contact-info">
          ${resumeData.personalInfo?.email || ''} | ${resumeData.personalInfo?.phone || ''} | ${resumeData.personalInfo?.location || ''}
        </div>

        <section>
          <h2>Professional Summary</h2>
          <p>${summary}</p>
        </section>

        <section>
          <h2>Experience</h2>
          ${workExperience.map(exp => `
            <div class="experience-item">
              <h3>${exp.title} at ${exp.subtitle}</h3>
              <p class="date">${exp.date}</p>
              <p>${exp.description}</p>
            </div>
          `).join('')}
        </section>

        <section>
          <h2>Education</h2>
          ${education.map(edu => `
            <div class="education-item">
              <h3>${edu.title}</h3>
              <p>${edu.subtitle}</p>
              <p class="date">${edu.date}</p>
            </div>
          `).join('')}
        </section>

        <section>
          <h2>Skills</h2>
          ${skills.map(category => `
            <h3>${category.name}</h3>
            <ul>
              ${category.skills.map(skill => `<li>${skill}</li>`).join('')}
            </ul>
          `).join('')}
        </section>
      </div>
    `;
  }

  // PDF generation moved to client-side

  // Import routes
  const resumeAiAssistant = require("./routes/resume-ai-assistant").default;
  const interview = require("./routes/interview").default;

  // Register routes
  app.use("/api/resume-ai-assistant", resumeAiAssistant);
  app.use("/api/interview", interview);

  const httpServer = createServer(app);
  return httpServer;
}