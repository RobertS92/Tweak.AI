import { Router } from "express";
import multer from "multer";
import { fileTypeFromBuffer } from "file-type";
import pdfParse from "pdf-parse-fork";
import mammoth from "mammoth";
import OpenAI from "openai";

const router = Router();

/** 1. Multer in-memory storage + 10MB file size limit */
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
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
      cb(
        new Error(
          `Invalid file type: ${file.mimetype}. Only PDF, DOC, DOCX, and TXT allowed.`
        )
      );
    }
  },
});

/** 2. Initialize OpenAI client */
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/** 3. The main resume parsing route */
router.post("/api/resume-parser", upload.single("file"), async (req, res) => {
  try {
    console.log("[DEBUG] Resume parsing route called.");

    // Ensure user uploaded a file
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    console.log("[DEBUG] File info:", {
      filename: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size
    });

    /** 4. Extract text content from the uploaded file */
    let fileContent = "";
    try {
      const { buffer } = req.file;
      const fileType = await fileTypeFromBuffer(buffer);
      console.log("[DEBUG] Detected file type:", fileType?.mime);

      if (fileType?.mime === 'application/pdf') {
        console.log("[DEBUG] Processing PDF file...");
        const pdfData = await pdfParse(buffer, {
          pagerender: function(pageData) {
            return pageData.getTextContent().then(function(textContent) {
              return textContent.items.map(item => item.str).join(' ');
            });
          }
        });
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

      console.log("[DEBUG] Extracted content length:", fileContent.length);
      console.log("[DEBUG] First 200 chars of content:", fileContent.substring(0, 200));

      if (!fileContent.trim()) {
        throw new Error("No text content could be extracted from the file");
      }

      // Clean up the extracted text
      fileContent = fileContent
        .replace(/[\r\n]+/g, '\n')          // Normalize line endings
        .replace(/\s+/g, ' ')               // Normalize spaces
        .replace(/[^\x20-\x7E\n]/g, '')     // Remove non-printable characters
        .trim();

    } catch (extractError) {
      console.error("[DEBUG] Error extracting file content:", extractError);
      throw new Error("Failed to extract content from file: " + extractError.message);
    }

    // Truncate content if too long (about 6000 tokens)
    if (fileContent.length > 12000) {
      fileContent = fileContent.substring(0, 12000);
      console.log("[DEBUG] Content truncated to 12000 characters");
    }

    console.log("[DEBUG] Calling OpenAI API...");

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "Extract the exact content from the resume and format it according to the form fields structure. Keep the original text intact."
        },
        {
          role: "user",
          content: `Parse this resume and extract the content into this exact format:

{
  "name": "",         // Person's full name
  "email": "",       // Email address
  "phone": "",       // Phone number
  "location": "",    // Location/address
  "linkedin": "",    // LinkedIn URL if present
  "sections": [
    {
      "id": "summary",
      "title": "Professional Summary",
      "content": ""  // Professional summary paragraph
    },
    {
      "id": "experience",
      "title": "Work Experience",
      "items": [
        {
          "title": "",      // Job title
          "subtitle": "",   // Company name
          "date": "",      // Employment dates
          "description": "", // Role description
          "bullets": []    // Achievement bullet points
        }
      ]
    },
    {
      "id": "education",
      "title": "Education",
      "items": [
        {
          "title": "",      // Degree name
          "subtitle": "",   // School name
          "date": "",      // Education dates
          "description": "", // Program description
          "bullets": []    // Achievements/coursework
        }
      ]
    },
    {
      "id": "skills",
      "title": "Skills",
      "content": ""  // Skills list
    },
    {
      "id": "projects",
      "title": "Projects",
      "items": [
        {
          "title": "",      // Project name
          "subtitle": "",   // Technologies used
          "date": "",      // Project timeframe
          "description": "", // Project description
          "bullets": []    // Project highlights
        }
      ]
    },
    {
      "id": "certifications",
      "title": "Certifications",
      "items": [
        {
          "title": "",      // Certification name
          "subtitle": "",   // Issuing organization
          "date": "",      // Date obtained
          "description": "", // Certification details
          "bullets": []    // Additional information
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
      max_tokens: 3000,
      response_format: { type: "json_object" }
    });

    let parsedData;
    try {
      parsedData = JSON.parse(completion.choices[0].message.content);
      console.log("[DEBUG] Successfully parsed JSON response");
    } catch (parseError) {
      console.error("[DEBUG] Error parsing OpenAI response:", parseError);
      throw new Error("Failed to parse OpenAI response into JSON");
    }

    // Validate and sanitize the data
    const sanitizedData = {
      name: parsedData.name || "",
      email: parsedData.email || "",
      phone: parsedData.phone || "",
      location: parsedData.location || "",
      linkedin: parsedData.linkedin || "",
      sections: (parsedData.sections || []).map(section => ({
        id: section.id || "",
        title: section.title || "",
        content: section.content || "",
        items: section.items?.map(item => ({
          title: item.title || "",
          subtitle: item.subtitle || "",
          date: item.date || "",
          description: item.description || "",
          bullets: Array.isArray(item.bullets) ? item.bullets : []
        })) || undefined
      }))
    };

    console.log("[DEBUG] Resume parsed successfully");
    return res.json(sanitizedData);

  } catch (err: any) {
    console.error("[DEBUG] Unexpected error in resume parsing route:", err);
    return res.status(500).json({
      error: "An unexpected error occurred during resume parsing.",
      details: err.message || String(err),
    });
  }
});

export default router;