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

  // Remove debug log lines
  text = text.split('\n')
    .filter(line => !line.includes('[DEBUG]'))
    .join('\n');

  // Clean up the text
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

  const response = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      {
        role: "system",
        content: `You are a resume parsing expert. Extract information into JSON format with exactly this structure:
{
  "personalInfo": {
    "name": "",
    "email": "",
    "phone": "",
    "location": "",
    "website": "",
    "linkedin": "",
    "objective": ""
  },
  "sections": [
    {
      "id": "professional-summary",
      "title": "Professional Summary",
      "content": ""
    },
    {
      "id": "work-experience",
      "title": "Work Experience",
      "items": [
        {
          "title": "",
          "company": "",
          "location": "",
          "startDate": "",
          "endDate": "",
          "description": "",
          "achievements": []
        }
      ]
    },
    {
      "id": "education",
      "title": "Education",
      "items": [
        {
          "degree": "",
          "institution": "",
          "location": "",
          "startDate": "",
          "endDate": "",
          "gpa": "",
          "courses": []
        }
      ]
    },
    {
      "id": "skills",
      "title": "Skills",
      "categories": [
        {
          "name": "Technical Skills",
          "skills": []
        },
        {
          "name": "Soft Skills",
          "skills": []
        }
      ]
    },
    {
      "id": "certifications",
      "title": "Certifications",
      "items": [
        {
          "name": "",
          "issuer": "",
          "date": "",
          "expiry": "",
          "id": "",
          "url": ""
        }
      ]
    },
    {
      "id": "projects",
      "title": "Projects",
      "items": [
        {
          "name": "",
          "description": "",
          "technologies": [],
          "url": "",
          "startDate": "",
          "endDate": ""
        }
      ]
    }
  ]
}

IMPORTANT: Return ONLY the JSON object, no additional text or explanation.
Keep section IDs exactly as shown above for frontend compatibility.
Format dates as YYYY-MM.
Include all sections even if empty.`
      },
      {
        role: "user",
        content: `Parse this resume text into the specified JSON structure:\n\n${content}`
      }
    ],
    temperature: 0.1,
  });

  if (!response.choices[0].message.content) {
    throw new Error("No content in OpenAI response");
  }

  try {
    const parsedData = JSON.parse(response.choices[0].message.content);
    console.log("[DEBUG] Successfully parsed resume");
    console.log("[DEBUG] Found sections:", parsedData.sections.map(s => s.id));
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
        // Handle text files
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