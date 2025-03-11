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
    console.log("[DEBUG] Starting resume parsing process...");

    if (!req.file) {
      console.error("[DEBUG] No file uploaded");
      return res.status(400).json({ error: "No file uploaded" });
    }

    console.log("[DEBUG] File info:", {
      filename: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size
    });

    // Extract text content based on file type
    let fileContent = "";
    try {
      const buffer = req.file.buffer;
      const fileType = await fileTypeFromBuffer(buffer);

      console.log("[DEBUG] Detected file type:", fileType?.mime);

      if (fileType?.mime === 'application/pdf') {
        console.log("[DEBUG] Processing PDF file...");
        const pdfData = await pdfParse(buffer);
        fileContent = pdfData.text;
      } else if (
        fileType?.mime === 'application/msword' ||
        fileType?.mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ) {
        console.log("[DEBUG] Processing Word document...");
        const result = await mammoth.extractRawText({ buffer });
        fileContent = result.value;
      } else {
        console.log("[DEBUG] Processing as text file...");
        fileContent = buffer.toString('utf8');
      }

      if (!fileContent || fileContent.trim().length === 0) {
        throw new Error("No text content could be extracted from the file");
      }

      console.log("[DEBUG] Extracted content length:", fileContent.length);
      console.log("[DEBUG] First 200 chars of content:", fileContent.substring(0, 200));

    } catch (extractError) {
      console.error("[DEBUG] Error extracting file content:", extractError);
      throw extractError;
    }

    // Truncate content if too long (increased limit)
    if (fileContent.length > 20000) {
      fileContent = fileContent.substring(0, 20000);
      console.log("[DEBUG] Content truncated to 20000 characters");
    }

    console.log("[DEBUG] Calling OpenAI API...");

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are a resume parser. Extract the exact content from the resume and format it according to the specified structure. Preserve all original text and formatting."
        },
        {
          role: "user",
          content: `Parse this resume and return a JSON object that exactly matches this structure:

{
  "name": "",           // Full name from the resume
  "email": "",         // Email address
  "phone": "",         // Phone number
  "location": "",      // Location/address
  "linkedin": "",      // LinkedIn URL
  "sections": [
    {
      "id": "summary",
      "title": "Professional Summary",
      "content": ""    // The exact summary text from the resume
    },
    {
      "id": "experience",
      "title": "Work Experience",
      "items": [
        {
          "title": "",       // Job title exactly as written
          "subtitle": "",    // Company name
          "date": "",        // Employment dates as written
          "description": "", // Role description
          "bullets": []      // Achievement bullet points as written
        }
      ]
    },
    {
      "id": "education",
      "title": "Education",
      "items": [
        {
          "title": "",       // Degree/qualification
          "subtitle": "",    // Institution name
          "date": "",        // Education dates
          "description": "", // Program description
          "bullets": []      // Achievements/courses
        }
      ]
    },
    {
      "id": "skills",
      "title": "Skills",
      "content": ""    // Skills list exactly as written
    },
    {
      "id": "projects",
      "title": "Projects",
      "items": [
        {
          "title": "",       // Project name
          "subtitle": "",    // Technologies used
          "date": "",        // Project dates/duration
          "description": "", // Project description
          "bullets": []      // Project achievements
        }
      ]
    },
    {
      "id": "certifications",
      "title": "Certifications",
      "items": [
        {
          "title": "",       // Certification name
          "subtitle": "",    // Issuing organization
          "date": "",        // Date obtained
          "description": "", // Description
          "bullets": []      // Additional details
        }
      ]
    }
  ]
}

Resume content to parse:
${fileContent}`
        }
      ],
      temperature: 0.1,
      max_tokens: 4000
    });

    if (!completion.choices[0].message.content) {
      throw new Error("No content in OpenAI response");
    }

    console.log("[DEBUG] OpenAI response received");
    console.log("[DEBUG] Raw response:", completion.choices[0].message.content);

    let parsedData;
    try {
      parsedData = JSON.parse(completion.choices[0].message.content);
      console.log("[DEBUG] Successfully parsed JSON response");
      console.log("[DEBUG] Parsed data structure:", JSON.stringify(parsedData, null, 2));
    } catch (parseError) {
      console.error("[DEBUG] Error parsing OpenAI response:", parseError);
      throw new Error("Failed to parse OpenAI response into JSON");
    }

    // Validate the parsed data structure
    if (!parsedData.name || !parsedData.sections || !Array.isArray(parsedData.sections)) {
      console.error("[DEBUG] Invalid data structure:", parsedData);
      throw new Error("Invalid data structure in parsed response");
    }

    // Log the final data structure being sent to frontend
    console.log("[DEBUG] Sending parsed data to frontend:", {
      personalInfo: {
        name: parsedData.name,
        email: parsedData.email,
        phone: parsedData.phone,
        location: parsedData.location,
        linkedin: parsedData.linkedin
      },
      sectionsCount: parsedData.sections.length,
      sections: parsedData.sections.map(s => ({
        id: s.id,
        title: s.title,
        hasContent: !!s.content,
        itemsCount: s.items?.length || 0
      }))
    });

    res.json(parsedData);

  } catch (error) {
    console.error("[DEBUG] Resume parsing error:", error);
    res.status(500).json({
      error: "Failed to parse resume",
      details: error instanceof Error ? error.message : "Unknown error",
      message: "Please try again or enter details manually."
    });
  }
});

export default router;