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
import { setupAuth } from "./auth";
import { debugAuthStatus } from "./utils/auth-debug";
import { enhancedAuthCheck } from "./auth-fix";

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
  
  // Setup authentication
  setupAuth(app);

  // Resume routes
  // Add the resume generation endpoint for mobile chat interface
  app.post("/api/resumes/generate", async (req, res) => {
    try {
      console.log("[DEBUG] Resume generation request received");
      const { content } = req.body;
      
      if (!content || typeof content !== 'string' || content.length < 10) {
        return res.status(400).json({ 
          message: "Invalid content format", 
          details: "Resume content must be provided as text with sufficient information" 
        });
      }
      
      // Generate a structured resume from chat content using OpenAI
      const response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: `You are a professional resume builder. Generate a well-structured resume from the information provided by the user.
            Output in JSON format with the following structure:
            {
              "personalInfo": {
                "name": "Name",
                "email": "email@example.com",
                "phone": "123-456-7890",
                "location": "City, State"
              },
              "sections": [
                {
                  "id": "professional-summary",
                  "title": "Professional Summary",
                  "content": "Professional summary text..."
                },
                {
                  "id": "work-experience",
                  "title": "Work Experience",
                  "items": [
                    {
                      "title": "Job Title",
                      "subtitle": "Company Name",
                      "date": "Start Date - End Date",
                      "description": "Job responsibilities and achievements"
                    }
                  ]
                },
                {
                  "id": "education",
                  "title": "Education",
                  "items": [
                    {
                      "title": "Degree",
                      "subtitle": "Institution",
                      "date": "Start Date - End Date"
                    }
                  ]
                },
                {
                  "id": "skills",
                  "title": "Skills",
                  "categories": [
                    {
                      "name": "Technical Skills",
                      "skills": ["Skill 1", "Skill 2"]
                    },
                    {
                      "name": "Soft Skills",
                      "skills": ["Skill 1", "Skill 2"]
                    }
                  ]
                }
              ]
            }
            If any section is missing from the user input, make reasonable inferences or add placeholders.
            Always create a complete resume structure, even if some fields are minimal.`
          },
          {
            role: "user",
            content: content
          }
        ],
        temperature: 0.7
      });
      
      if (!response.choices[0].message.content) {
        throw new Error("No response from resume generation service");
      }
      
      try {
        // Parse the JSON response
        const resumeData = JSON.parse(response.choices[0].message.content.trim());
        
        // Convert JSON structure to simplified HTML for storage and display
        const resumeContent = generatePDFTemplate(resumeData);
        
        // Determine a sensible title based on name or content
        const title = resumeData.personalInfo?.name 
          ? `${resumeData.personalInfo.name.split(' ')[0]}'s Resume` 
          : "Generated Resume";
        
        // Create resume record
        let newResume;
        if (req.isAuthenticated()) {
          // If user is logged in, associate resume with their account
          newResume = await storage.createResume({
            userId: req.user.id.toString(),
            title,
            content: resumeContent,
            fileType: "html",
            atsScore: 75, // Default score for generated resumes
            analysis: { generatedFromChat: true }
          });
        } else {
          // Otherwise create an anonymous resume
          newResume = await storage.createResume({
            title,
            content: resumeContent,
            fileType: "html",
            atsScore: 75,
            analysis: { generatedFromChat: true }
          });
        }
        
        res.status(201).json({
          id: newResume.id,
          title: newResume.title,
          content: resumeContent
        });
      } catch (parseError) {
        console.error("[ERROR] Failed to parse resume data:", parseError);
        throw new Error("Failed to process resume structure");
      }
    } catch (error: unknown) {
      console.error("[ERROR] Resume generation error:", error);
      res.status(500).json({
        message: "Failed to generate resume",
        details: error instanceof Error ? error.message : "Unknown error occurred"
      });
    }
  });

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
      } catch (extractError: unknown) {
        console.error('Content extraction error:', extractError);
        const errorMessage = extractError instanceof Error ? extractError.message : "Failed to extract content from file";
        return res.status(400).json({ 
          message: errorMessage
        });
      }
      
      // First create the resume record
      let resume;
      
      if (req.isAuthenticated()) {
        // If user is authenticated, associate resume with their account
        resume = await storage.createResume({
          userId: req.user.id.toString(), // Convert to string to match schema 
          title: file.originalname,
          content: content,
          fileType: file.mimetype,
        });
      } else {
        // If user is not authenticated, create an anonymous resume with null userId
        resume = await storage.createResume({
          title: file.originalname,
          content: content,
          fileType: file.mimetype,
        });
      }

      console.log(`[DEBUG] Starting resume analysis for ID ${resume.id}`);
      console.log(`[DEBUG] Original content length: ${content.length}`);
      
      // Analyze the resume using OpenAI
      const analysis = await analyzeResume(content);
      
      console.log(`[DEBUG] Analysis complete. Overall score: ${analysis.overallScore}`);
      console.log(`[DEBUG] Enhanced content received, length: ${analysis.enhancedContent.length}`);
      console.log(`[DEBUG] Number of improvements: ${analysis.improvements.length}`);
      
      // Sample of improvements for debugging
      if (analysis.improvements.length > 0) {
        console.log(`[DEBUG] Sample improvements:`, analysis.improvements.slice(0, 3));
      }
      
      // Compare original and enhanced content lengths
      const textContent = analysis.enhancedContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      const originalTextContent = content.replace(/\s+/g, ' ').trim();
      
      console.log(`[DEBUG] Original text length: ${originalTextContent.length}`);
      console.log(`[DEBUG] Enhanced text length: ${textContent.length}`);
      console.log(`[DEBUG] Length difference: ${textContent.length - originalTextContent.length}`);
      
      if (textContent.length < originalTextContent.length) {
        console.log(`[WARNING] Enhanced content appears to be shorter than original!`);
      }

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
      
      console.log(`[DEBUG] Resume ${resume.id} successfully updated with analysis`);

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
  
  // New route for downloading a resume that requires authentication
  app.get("/api/resumes/:id/download", async (req, res) => {
    try {
      // Check if user is authenticated
      if (!req.isAuthenticated()) {
        return res.status(401).json({ 
          message: "You must be logged in to download a resume",
          requiresAuth: true
        });
      }
      
      const resume = await storage.getResume(parseInt(req.params.id));
      if (!resume) {
        return res.status(404).json({ message: "Resume not found" });
      }
      
      // Return the resume content formatted for download
      // This can be enhanced with more formatting options later
      const formattedContent = resume.enhancedContent || resume.content;
      
      res.json({ 
        id: resume.id,
        title: resume.title,
        content: formattedContent,
        canDownload: true
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "An unknown error occurred";
      res.status(500).json({ message });
    }
  });

  app.get("/api/resumes", async (req, res) => {
    try {
      // Check if user is authenticated
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "You must be logged in to view resumes" });
      }
      
      const resumes = await storage.getUserResumes(req.user.id);
      res.json(resumes);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "An unknown error occurred";
      res.status(500).json({ message });
    }
  });
  
  // Endpoint to get all anonymous resumes (available for claiming)
  app.get("/api/resumes/anonymous", async (req, res) => {
    try {
      // Only allow authenticated users to view anonymous resumes
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "You must be logged in to view anonymous resumes" });
      }
      
      const anonymousResumes = await storage.getAnonymousResumes();
      
      // Log for debugging
      console.log(`[DEBUG] Retrieved ${anonymousResumes.length} anonymous resumes`);
      
      res.json(anonymousResumes);
    } catch (error: unknown) {
      console.error("Error fetching anonymous resumes:", error);
      const message = error instanceof Error ? error.message : "An unknown error occurred";
      res.status(500).json({ message });
    }
  });
  
  // API endpoint to claim anonymous resumes after login
  app.post("/api/resumes/claim/:id", async (req, res) => {
    try {
      // Check if user is authenticated
      if (!req.isAuthenticated()) {
        return res.status(401).json({ 
          message: "You must be logged in to claim a resume",
          requiresAuth: true
        });
      }
      
      const resumeId = parseInt(req.params.id);
      const resume = await storage.getResume(resumeId);
      
      if (!resume) {
        return res.status(404).json({ message: "Resume not found" });
      }
      
      // If resume already has a userId and it's different from current user
      if (resume.userId && resume.userId !== req.user.id.toString()) {
        return res.status(403).json({ 
          message: "This resume belongs to another user"
        });
      }
      
      // Claim the resume by assigning the user's ID to it
      const claimedResume = await storage.claimAnonymousResume(resumeId, req.user.id);
      
      res.json({ 
        message: "Resume claimed successfully", 
        resume: claimedResume 
      });
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

      // Enhanced optimization using OpenAI - with a completely revised approach to preserve ALL content
      const response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: `You are an expert ATS optimization specialist. Your task is to optimize resumes for job descriptions.

MOST IMPORTANT RULE: NEVER SHORTEN OR REDUCE THE RESUME AT ALL.

Follow these instructions exactly:
1. Keep ALL sections, bullet points, skills, and experiences from the original resume - preserve EVERYTHING
2. Simply ADD relevant keywords from the job description by enhancing existing bullet points
3. NEVER remove any skills, experiences, or projects - this is absolutely critical
4. You may rephrase/enhance existing bullets but maintain all the original information and length
5. The optimized content MUST be equal or longer than the original resume - never shorter
6. Focus only on KEYWORD MATCHING by enhancing the existing content, NEVER removing anything
7. For each skill, experience, and qualification in the original resume, find a way to enhance it with relevant keywords

Format your entire response as a single valid JSON object with these exact fields:
{"optimizedContent": "full resume text with ALL original content preserved", 
"changes": ["specific change 1", "specific change 2"], 
"matchScore": 85, 
"keywordMatches": ["keyword1", "keyword2"], 
"missingKeywords": ["missing1", "missing2"]}

Return ONLY valid JSON in your response, nothing else. Format your entire response as a single JSON object.`
          },
          {
            role: "user",
            content: `Here is the job description and resume to optimize:

*** JOB DESCRIPTION ***
${cleanJobDescription}

*** CURRENT RESUME ***
${resume.content}

Create an optimized version that matches keywords while PRESERVING ALL ORIGINAL CONTENT AND LENGTH. The optimized content MUST NOT be shorter than the original resume. DO NOT remove any experience, skills or content whatsoever - this is critical. Enhance, don't reduce. Return your entire response as a single valid JSON object.`
          }
        ],
        temperature: 0.1
      });

      if (!response.choices[0].message.content) {
        throw new Error("No optimization response received");
      }

      console.log("[DEBUG] Received optimization response");

      try {
        // Add additional sanitization to handle potential invalid JSON characters
        let rawResponse = response.choices[0].message.content.trim();
        
        // Log the raw response for debugging
        console.log("[DEBUG] Raw optimization response (first 100 chars):", 
          rawResponse.substring(0, 100) + "...");
        
        // Attempt to find and parse just the JSON portion if there are unexpected characters
        const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          rawResponse = jsonMatch[0];
        }
        
        const optimization = JSON.parse(rawResponse);
        console.log("[DEBUG] Successfully parsed optimization JSON");
        
        // Check that optimization preserves resume length
        const originalLength = resume.content.length;
        const optimizedLength = optimization.optimizedContent ? optimization.optimizedContent.length : 0;
        console.log(`[DEBUG] Original length: ${originalLength}, Optimized length: ${optimizedLength}`);
        
        // If optimized content is significantly shorter (less than 95% of original), issue a warning
        // and possibly reject the optimization
        if (optimizedLength > 0 && optimizedLength < originalLength * 0.95) {
          console.log("[WARNING] Optimized content is significantly shorter than original!");
          console.log("[WARNING] Original length:", originalLength, "Optimized length:", optimizedLength);
          
          // For significantly shortened content (less than 85%), reject the optimization
          if (optimizedLength < originalLength * 0.85) {
            throw new Error("AI produced a significantly shortened resume. Using original content instead.");
          }
        }

        if (!optimization.optimizedContent) {
          throw new Error("Missing optimized content in response");
        }

        // Create a new analysis object 
        // Using 'as any' to suppress TypeScript errors since we're dealing with dynamic data
        const analysisObject: any = {
          categoryScores: {},
          improvements: [],
          formattingFixes: [],
          jobOptimization: {
            jobId: null,
            changes: optimization.changes || [],
            matchScore: optimization.matchScore || 0,
            keywordMatches: optimization.keywordMatches || [],
            missingKeywords: optimization.missingKeywords || [],
            formatImprovements: optimization.formatImprovements || [],
            timestamp: new Date().toISOString()
          }
        };
        
        // Copy existing values using indexed access to avoid TypeScript errors
        if (resume.analysis && typeof resume.analysis === 'object') {
          const analysis = resume.analysis as Record<string, any>;
          if (analysis['categoryScores']) {
            analysisObject.categoryScores = analysis['categoryScores'];
          }
          if (analysis['improvements']) {
            analysisObject.improvements = analysis['improvements'];
          }
          if (analysis['formattingFixes']) {
            analysisObject.formattingFixes = analysis['formattingFixes'];
          }
        }
        
        // Update the resume with optimized content and detailed analysis
        await storage.updateResume(resumeId, {
          enhancedContent: optimization.optimizedContent,
          analysis: analysisObject
        });

        res.json({
          optimizedContent: optimization.optimizedContent,
          changes: optimization.changes || [],
          keywordMatches: optimization.keywordMatches || [],
          missingKeywords: optimization.missingKeywords || [],
          matchScore: optimization.matchScore || 0,
          formatImprovements: optimization.formatImprovements || []
        });
      } catch (parseError: unknown) {
        console.error("[DEBUG] Failed to parse optimization response:", parseError);
        throw new Error("Invalid response format from optimization service");
      }
    } catch (error: unknown) {
      console.error("[DEBUG] Resume optimization error:", error);
      res.status(500).json({
        message: "Failed to optimize resume",
        details: error instanceof Error ? error.message : "Unknown error occurred"
      });
    }
  });

  // Function to generate CSS styles for PDF
  function generateStyles(): string {
    return `
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
        font-family: 'Arial', sans-serif;
      }
      
      body {
        padding: 0;
        margin: 0;
        background: #fff;
        color: #333;
      }
      
      .resume {
        max-width: 800px;
        margin: 0 auto;
        padding: 20px;
      }
      
      .resume-content {
        width: 100%;
      }
      
      h1 {
        font-size: 26px;
        margin-bottom: 10px;
        color: #2463eb;
      }
      
      h2 {
        font-size: 20px;
        margin-top: 20px;
        margin-bottom: 10px;
        padding-bottom: 5px;
        border-bottom: 1px solid #ddd;
        color: #2463eb;
      }
      
      h3 {
        font-size: 16px;
        margin-top: 15px;
        margin-bottom: 5px;
        color: #444;
      }
      
      p {
        margin-bottom: 8px;
        line-height: 1.5;
      }
      
      .contact-info {
        margin-bottom: 20px;
        color: #666;
      }
      
      section {
        margin-bottom: 30px;
      }
      
      .date {
        color: #666;
        font-style: italic;
        margin-bottom: 5px;
      }
      
      .experience-item, .education-item {
        margin-bottom: 20px;
      }
      
      ul {
        margin-left: 20px;
        margin-bottom: 15px;
      }
      
      li {
        margin-bottom: 5px;
        list-style-type: disc;
      }
    `;
  }

  // Added generatePDFTemplate function
  function generatePDFTemplate(resumeData: any): string {
    if (!resumeData) {
      throw new Error('Resume data is required');
    }

    const sections = resumeData.sections || [];
    const workExperience = sections.find((s: any) => s.id === 'work-experience')?.items || [];
    const education = sections.find((s: any) => s.id === 'education')?.items || [];
    const skills = sections.find((s: any) => s.id === 'skills')?.categories || [];
    const summary = sections.find((s: any) => s.id === 'professional-summary')?.content || '';

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
          ${workExperience.map((exp: any) => `
            <div class="experience-item">
              <h3>${exp.title} at ${exp.subtitle}</h3>
              <p class="date">${exp.date}</p>
              <p>${exp.description}</p>
            </div>
          `).join('')}
        </section>

        <section>
          <h2>Education</h2>
          ${education.map((edu: any) => `
            <div class="education-item">
              <h3>${edu.title}</h3>
              <p>${edu.subtitle}</p>
              <p class="date">${edu.date}</p>
            </div>
          `).join('')}
        </section>

        <section>
          <h2>Skills</h2>
          ${skills.map((category: any) => `
            <h3>${category.name}</h3>
            <ul>
              ${category.skills.map((skill: string) => `<li>${skill}</li>`).join('')}
            </ul>
          `).join('')}
        </section>
      </div>
    `;
  }

  // Add PDF download endpoint for job-matched resumes
  app.post("/api/resumes/:id/job-match-pdf", enhancedAuthCheck, async (req, res) => {
    try {
      console.log("[DEBUG] Received job-matched PDF download request");
      const resumeId = parseInt(req.params.id);
      const { jobDescription } = req.body;
      
      if (!jobDescription) {
        return res.status(400).json({ message: "Job description is required" });
      }
      
      console.log(`[DEBUG] Processing job-matched resume ID: ${resumeId}`);
      
      // Authentication is now handled by enhancedAuthCheck middleware
      
      console.log("[DEBUG] User authenticated, fetching resume");
      const resume = await storage.getResume(resumeId);
      if (!resume) {
        console.log(`[DEBUG] Resume with ID ${resumeId} not found`);
        return res.status(404).json({ message: "Resume not found" });
      }
      
      // Optimize the resume for the job description
      console.log("[DEBUG] Optimizing resume for job description");
      
      // Clean job description
      const cleanJobDescription = jobDescription.replace(/\r\n/g, '\n').trim();
      
      // Enhanced optimization with the completely revised approach - removed response_format
      const response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: `You are an expert ATS optimization specialist. Your task is to optimize resumes for job descriptions.

MOST IMPORTANT RULE: DO NOT SHORTEN THE RESUME AT ALL.

Follow these instructions exactly:
1. Keep ALL sections, bullet points, skills, and experiences from the original resume
2. Simply ADD relevant keywords from the job description by enhancing existing bullet points
3. NEVER remove any skills, experiences, or projects - this is critical
4. You may rephrase/enhance existing bullets but maintain all the original information
5. The optimized content must be equal or longer in length than the original resume
6. Focus only on KEYWORD MATCHING, not content reduction

Your response must be VALID JSON with this exact format:
{
  "optimizedContent": "full text of optimized resume with no shortening",
  "changes": ["specific change 1", "specific change 2"],
  "matchScore": 85,
  "keywordMatches": ["keyword1", "keyword2"],
  "missingKeywords": ["missing1", "missing2"]
}

Important: Return ONLY valid JSON in your response, nothing else. Format your entire response as a single JSON object.`
          },
          {
            role: "user",
            content: `Here is the job description and resume to optimize:

*** JOB DESCRIPTION ***
${cleanJobDescription}

*** CURRENT RESUME ***
${resume.content}

Create an optimized version that matches keywords while PRESERVING ALL ORIGINAL CONTENT AND LENGTH. The optimized content should not be shorter than the original resume. Do not remove any experience, skills or content. Return your entire response as a single valid JSON object with the format specified.`
          }
        ],
        temperature: 0.1
      });
      
      if (!response.choices[0].message.content) {
        throw new Error("No optimization response received");
      }
      
      console.log("[DEBUG] Received optimization response for PDF generation");
      
      const optimization = JSON.parse(response.choices[0].message.content.trim());
      
      if (!optimization.optimizedContent) {
        throw new Error("Missing optimized content in response");
      }
      
      console.log("[DEBUG] Preparing HTML content for job-matched PDF");
      
      // Extract only the resume content, not the entire page
      const resumeContent = optimization.optimizedContent || resume.content;
      
      // Convert plain text to properly formatted HTML with appropriate styling
      const htmlContent = `
        <div class="resume-content">
          <h1>${resumeContent.split('\n')[0]}</h1>
          <div class="contact-info">
            ${resumeContent.split('\n')[1] || ''}
          </div>
          ${resumeContent
            .split('\n\n')
            .slice(1) // Skip the name and contact info we've already included
            .map((section: string) => {
              const lines = section.split('\n');
              const title = lines[0];
              const content = lines.slice(1).join('<br>');
              
              return `
                <section>
                  <h2>${title}</h2>
                  <p>${content}</p>
                </section>
              `;
            })
            .join('')}
        </div>
      `;
      
      try {
        console.log("[DEBUG] Initializing Puppeteer for PDF generation");
        // Generate PDF using Puppeteer
        const browser = await puppeteer.launch({
          args: chromium.args,
          defaultViewport: chromium.defaultViewport,
          executablePath: await chromium.executablePath(),
          headless: true,
        });
        
        console.log("[DEBUG] Creating new page in browser");
        const page = await browser.newPage();
        
        // Add styling
        console.log("[DEBUG] Preparing HTML with styling");
        const styledHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <style>${generateStyles()}</style>
          </head>
          <body>
            <div class="resume">
              ${htmlContent}
            </div>
          </body>
          </html>
        `;
        
        console.log("[DEBUG] Setting page content");
        await page.setContent(styledHtml, { waitUntil: 'networkidle0' });
        
        console.log("[DEBUG] Generating PDF buffer");
        // Generate PDF
        const pdfBuffer = await page.pdf({
          format: 'A4',
          printBackground: true,
          margin: {
            top: '20mm',
            right: '20mm',
            bottom: '20mm',
            left: '20mm'
          }
        });
        
        console.log("[DEBUG] Closing browser");
        await browser.close();
        
        console.log("[DEBUG] Job-matched PDF generated successfully, sending response");
        // Send the PDF
        res.contentType('application/pdf');
        res.send(pdfBuffer);
        
      } catch (pdfError: unknown) {
        console.error("[DEBUG] Job-matched PDF generation error:", pdfError);
        const errorMessage = pdfError instanceof Error ? pdfError.message : "Unknown error";
        return res.status(500).json({ 
          message: "Failed to generate job-matched PDF",
          details: errorMessage
        });
      }
    } catch (error: unknown) {
      console.error("[DEBUG] Job-matched resume PDF download error:", error);
      const message = error instanceof Error ? error.message : "An unknown error occurred";
      res.status(500).json({ message });
    }
  });

  // PDF generation endpoint for enhanced resumes
  app.post("/api/resumes/:id/download-pdf", enhancedAuthCheck, async (req, res) => {
    try {
      console.log("[DEBUG] Received PDF download request");
      const resumeId = parseInt(req.params.id);
      console.log(`[DEBUG] Processing resume ID: ${resumeId}`);
      
      // Authentication is now handled by enhancedAuthCheck middleware
      
      console.log("[DEBUG] User authenticated, fetching resume");
      const resume = await storage.getResume(resumeId);
      if (!resume) {
        console.log(`[DEBUG] Resume with ID ${resumeId} not found`);
        return res.status(404).json({ message: "Resume not found" });
      }
      
      console.log("[DEBUG] Resume found, preparing HTML content");
      // Extract only the resume content, not the entire page
      const resumeContent = resume.enhancedContent || resume.content;
      
      // Convert plain text to properly formatted HTML with line breaks
      const htmlContent = `<div class="resume-content">${generatePDFTemplate(JSON.parse(resumeContent))}</div>`;
      
      try {
        console.log("[DEBUG] Initializing Puppeteer for PDF generation");
        // Generate PDF using Puppeteer
        const browser = await puppeteer.launch({
          args: chromium.args,
          defaultViewport: chromium.defaultViewport,
          executablePath: await chromium.executablePath(),
          headless: true,
        });
        
        console.log("[DEBUG] Creating new page in browser");
        const page = await browser.newPage();
        
        // Add styling
        console.log("[DEBUG] Preparing HTML with styling");
        const styledHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <style>${generateStyles()}</style>
          </head>
          <body>
            <div class="resume">
              ${htmlContent}
            </div>
          </body>
          </html>
        `;
        
        console.log("[DEBUG] Setting page content");
        await page.setContent(styledHtml, { waitUntil: 'networkidle0' });
        
        console.log("[DEBUG] Generating PDF buffer");
        // Generate PDF
        const pdfBuffer = await page.pdf({
          format: 'A4',
          printBackground: true,
          margin: {
            top: '20mm',
            right: '20mm',
            bottom: '20mm',
            left: '20mm'
          }
        });
        
        console.log("[DEBUG] Closing browser");
        await browser.close();
        
        console.log("[DEBUG] PDF generated successfully, sending response");
        // Send the PDF
        res.contentType('application/pdf');
        res.send(pdfBuffer);
        
      } catch (pdfError: unknown) {
        console.error("[DEBUG] PDF generation error:", pdfError);
        const errorMessage = pdfError instanceof Error ? pdfError.message : "Unknown error";
        return res.status(500).json({ 
          message: "Failed to generate PDF",
          details: errorMessage
        });
      }
    } catch (error: unknown) {
      console.error("[DEBUG] Resume PDF download error:", error);
      const message = error instanceof Error ? error.message : "An unknown error occurred";
      res.status(500).json({ message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}