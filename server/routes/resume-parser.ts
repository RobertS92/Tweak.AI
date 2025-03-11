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
        const options = {
          pagerender: function(pageData: any) {
            return pageData.getTextContent().then(function(textContent: any) {
              let text = "";
              for (let item of textContent.items) {
                text += item.str + " ";
              }
              return text;
            });
          }
        };
        const pdfData = await pdfParse(buffer, options);
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

      // Clean up the extracted text
      fileContent = fileContent
        .replace(/[\r\n]+/g, '\n')          // Normalize line endings
        .replace(/\s+/g, ' ')               // Normalize spaces
        .replace(/[^\x20-\x7E\n]/g, '')     // Remove non-printable characters
        .trim();

      console.log("[DEBUG] Extracted content length:", fileContent.length);
      console.log("[DEBUG] First 200 chars of content:", fileContent.substring(0, 200));

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
      model: "gpt-4",
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

Here's the resume text to parse:
${fileContent}`
        }
      ],
      temperature: 0.1,
      max_tokens: 3000,
      response_format: { type: "json_object" }
    });

    console.log("[DEBUG] OpenAI response received");

    let parsedData;
    try {
      console.log("[DEBUG] Raw OpenAI response:", completion.choices[0].message.content);
      parsedData = JSON.parse(completion.choices[0].message.content);
      console.log("[DEBUG] Successfully parsed JSON response");
    } catch (parseError) {
      console.error("[DEBUG] Error parsing OpenAI response:", parseError);
      throw new Error("Failed to parse OpenAI response into JSON");
    }

    // Validate the data structure
    if (!parsedData.name || !parsedData.sections || !Array.isArray(parsedData.sections)) {
      console.error("[DEBUG] Invalid data structure:", parsedData);
      throw new Error("Invalid data structure in parsed response");
    }

    // Log the fields that will be populated
    console.log("[DEBUG] Data to populate form fields:", {
      personalInfo: {
        name: parsedData.name,
        email: parsedData.email,
        phone: parsedData.phone,
        location: parsedData.location,
        linkedin: parsedData.linkedin
      },
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