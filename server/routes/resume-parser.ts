import { Router } from "express";
import multer from "multer";
import { fileTypeFromBuffer } from "file-type";
import pdfParse from "pdf-parse-fork";
import mammoth from "mammoth";
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const router = Router();

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only PDF, DOC, DOCX, and TXT allowed."));
    }
  },
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function cleanTextContent(text: string): string {
  console.log("[DEBUG] Cleaning text content, initial length:", text.length);

  // Remove debug lines and preserve structure
  const lines = text.split('\n');
  const cleanedLines = lines
    .filter(line => !line.includes('[DEBUG]'))
    .filter(line => line.trim().length > 0);

  // Join lines with proper spacing
  text = cleanedLines.join('\n');

  // Clean up the text while preserving structure
  text = text
    .replace(/[\r\n]{3,}/g, '\n\n')  // Normalize line breaks
    .replace(/[^\x20-\x7E\n]/g, '')  // Remove non-printable characters
    .replace(/[ \t]+/g, ' ')         // Normalize spaces
    .trim();

  console.log("[DEBUG] Cleaned text length:", text.length);
  return text;
}

async function parseResume(content: string) {
  console.log("[DEBUG] Starting resume parsing with OpenAI");

  const systemPrompt = `You are a resume parsing expert. Extract ALL information into a JSON object with EXACTLY this structure, ensuring NO fields are left empty:

{
  "personalInfo": {
    "name": "Full name",
    "email": "Email address",
    "phone": "Phone number",
    "location": "City, State",
    "website": "Personal/portfolio website",
    "linkedin": "LinkedIn URL",
    "objective": "Career objective"
  },
  "sections": [
    {
      "id": "professional-summary",
      "title": "Professional Summary",
      "content": "Summary text"
    },
    {
      "id": "work-experience",
      "title": "Work Experience",
      "items": [
        {
          "title": "Job title",
          "company": "Company name",
          "location": "Job location",
          "startDate": "YYYY-MM",
          "endDate": "YYYY-MM or Present",
          "description": "Role description",
          "achievements": ["Achievement 1", "Achievement 2"]
        }
      ]
    },
    {
      "id": "education",
      "title": "Education",
      "items": [
        {
          "degree": "Degree name",
          "institution": "School name",
          "location": "School location",
          "startDate": "YYYY-MM",
          "endDate": "YYYY-MM",
          "gpa": "GPA if available",
          "courses": ["Relevant course 1", "Relevant course 2"]
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
          "skills": ["Soft skill 1", "Soft skill 2"]
        }
      ]
    }
  ]
}

IMPORTANT:
1. Return ONLY the JSON object, no additional text
2. Extract ALL contact information from the text
3. Always include all sections even if empty
4. Format dates consistently as YYYY-MM
5. Parse skills into technical and soft skills categories
6. Keep section IDs exactly as shown for frontend compatibility`;

  const response = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      {
        role: "system",
        content: systemPrompt
      },
      {
        role: "user",
        content: `Parse this resume text into the specified JSON structure. Extract ALL information and ensure each section is populated:\n\n${content}`
      }
    ],
    temperature: 0.1,
  });

  if (!response.choices[0].message.content) {
    throw new Error("No content in OpenAI response");
  }

  try {
    const parsedData = JSON.parse(response.choices[0].message.content);

    // Validate parsed data
    console.log("[DEBUG] Parsed Data Statistics:");
    console.log("[DEBUG] Personal Info Fields:", Object.entries(parsedData.personalInfo)
      .filter(([_, value]) => value && String(value).trim().length > 0)
      .map(([key]) => key));

    parsedData.sections.forEach(section => {
      console.log(`[DEBUG] Section '${section.id}':`, {
        hasContent: section.content ? "Yes" : "No",
        items: section.items?.length || 0,
        categories: section.categories?.length || 0
      });
    });

    return parsedData;
  } catch (error) {
    console.error("[DEBUG] JSON parse error:", error);
    console.log("[DEBUG] Raw response:", response.choices[0].message.content);
    throw new Error("Failed to parse OpenAI response as JSON");
  }
}

router.post("/resume-parser", upload.single("file"), async (req, res) => {
  try {
    console.log("[DEBUG] Starting resume parsing process");

    if (!req.file) {
      return res.status(400).json({ 
        error: "No file uploaded",
        details: "Please select a file to upload" 
      });
    }

    console.log("[DEBUG] File info:", {
      filename: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size
    });

    let fileContent: string;
    try {
      const buffer = req.file.buffer;
      const fileType = await fileTypeFromBuffer(buffer);
      const mime = fileType?.mime || req.file.mimetype;

      console.log("[DEBUG] Detected file type:", mime);

      if (mime === "application/pdf") {
        const pdfData = await pdfParse(buffer);
        fileContent = cleanTextContent(pdfData.text);
      } else if (mime.includes("word")) {
        const result = await mammoth.extractRawText({ buffer });
        fileContent = cleanTextContent(result.value);
      } else {
        fileContent = cleanTextContent(buffer.toString('utf8'));
      }

      if (!fileContent || fileContent.trim().length === 0) {
        throw new Error('No content could be extracted from the file');
      }

      console.log("[DEBUG] Successfully extracted content, length:", fileContent.length);
      console.log("[DEBUG] Content preview:", fileContent.substring(0, 200));

      const parsedData = await parseResume(fileContent);
      res.json(parsedData);

    } catch (error) {
      console.error("[DEBUG] Content processing error:", error);
      throw new Error(error instanceof Error ? error.message : 'Failed to process file content');
    }

  } catch (error) {
    console.error("[DEBUG] Resume parsing error:", error);
    res.status(500).json({
      error: "Unable to process your resume",
      details: error instanceof Error ? error.message : "Please try again or enter details manually"
    });
  }
});

export default router;