import { Router } from "express";
import multer from "multer";
import { fileTypeFromBuffer } from "file-type";
import pdfParse from "pdf-parse-fork";
import mammoth from "mammoth";
import OpenAI from "openai";

const router = Router();

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type: ${file.mimetype}. Only PDF, DOC, DOCX, and TXT files are allowed.`));
    }
  }
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

router.post("/api/ai-resume-parser", upload.single("file"), async (req, res) => {
  try {
    console.log("Starting resume parsing process...");

    if (!req.file) {
      console.error("No file uploaded");
      return res.status(400).json({ error: "No file uploaded" });
    }

    // Extract text content based on file type
    let fileContent = "";
    try {
      const buffer = req.file.buffer;
      const fileType = await fileTypeFromBuffer(buffer);

      console.log("Processing file type:", fileType?.mime);

      if (fileType?.mime === 'application/pdf') {
        const pdfData = await pdfParse(buffer);
        fileContent = pdfData.text;
      } else if (
        fileType?.mime === 'application/msword' ||
        fileType?.mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ) {
        const result = await mammoth.extractRawText({ buffer });
        fileContent = result.value;
      } else {
        fileContent = buffer.toString('utf8');
      }

      if (!fileContent || fileContent.trim().length === 0) {
        throw new Error("No text content could be extracted from the file");
      }

    } catch (extractError) {
      console.error("Error extracting file content:", extractError);
      throw extractError;
    }

    // Truncate content if too long (increased limit)
    if (fileContent.length > 20000) {
      fileContent = fileContent.substring(0, 20000);
    }

    console.log("Calling OpenAI API...");

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "Extract resume information and format it exactly according to the specified structure. Preserve the original text content."
        },
        {
          role: "user",
          content: `Extract resume information into this exact format:

{
  "name": "", // Person's full name
  "email": "", // Email address
  "phone": "", // Phone number
  "location": "", // Location/address
  "linkedin": "", // LinkedIn URL
  "sections": [
    {
      "id": "summary",
      "title": "Professional Summary",
      "content": "" // Full summary text
    },
    {
      "id": "experience",
      "title": "Work Experience",
      "items": [
        {
          "title": "", // Job title
          "subtitle": "", // Company name
          "date": "", // Employment period
          "description": "", // Role overview
          "bullets": [] // List of achievements/responsibilities
        }
      ]
    },
    {
      "id": "education",
      "title": "Education",
      "items": [
        {
          "title": "", // Degree
          "subtitle": "", // Institution
          "date": "", // Study period
          "description": "", // Program details
          "bullets": [] // Achievements/coursework
        }
      ]
    },
    {
      "id": "skills",
      "title": "Skills",
      "content": "" // All skills as comma-separated text
    },
    {
      "id": "projects",
      "title": "Projects",
      "items": [
        {
          "title": "", // Project name
          "subtitle": "", // Technologies used
          "date": "", // Duration/timeframe
          "description": "", // Project overview
          "bullets": [] // Key achievements/features
        }
      ]
    },
    {
      "id": "certifications",
      "title": "Certifications",
      "items": [
        {
          "title": "", // Certification name
          "subtitle": "", // Issuing organization
          "date": "", // Date obtained
          "description": "", // Certification details
          "bullets": [] // Additional information
        }
      ]
    }
  ]
}

Resume text to parse:
${fileContent}`
        }
      ],
      temperature: 0.1,
      max_tokens: 4000,
      response_format: { type: "json_object" }
    });

    if (!completion.choices[0].message.content) {
      throw new Error("No content in OpenAI response");
    }

    console.log("OpenAI response received, parsing response...");

    const parsedData = JSON.parse(completion.choices[0].message.content);
    console.log("Successfully parsed resume into form fields");

    res.json(parsedData);

  } catch (error) {
    console.error("Resume parsing error:", error);
    res.status(500).json({
      error: "Failed to parse resume",
      details: error instanceof Error ? error.message : "Unknown error",
      message: "Please try again or enter details manually."
    });
  }
});

export default router;