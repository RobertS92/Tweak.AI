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
          pagerender: function(pageData) {
            return pageData.getTextContent();
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

      console.log("[DEBUG] Extracted content length:", fileContent.length);
      console.log("[DEBUG] First 200 chars of content:", fileContent.substring(0, 200));

    } catch (extractError) {
      console.error("[DEBUG] Error extracting file content:", extractError);
      throw new Error("Failed to extract content from file: " + extractError.message);
    }

    // Clean up the extracted text
    fileContent = fileContent
      .replace(/[\r\n]+/g, '\n')          // Normalize line endings
      .replace(/\s+/g, ' ')               // Normalize spaces
      .replace(/[^\x20-\x7E\n]/g, '')     // Remove non-printable characters
      .trim();

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
          content: "You are a resume parser. Extract the exact content from the resume and format it according to the specified structure."
        },
        {
          role: "user",
          content: `Parse this resume and extract exactly these fields, preserving the original text:

1. Basic Information:
- Name (look for the name at the top of the resume)
- Email (look for email address)
- Phone (look for phone number)
- Location (look for city/state)
- LinkedIn (look for LinkedIn URL)

2. Professional Summary (the paragraph describing overall experience)

3. Work Experience (each position should have):
- Job title
- Company name
- Dates
- Description
- Bullet points of achievements

4. Education (each entry should have):
- Degree name
- Institution
- Dates
- Description if any
- Notable achievements

5. Skills (all technical and professional skills)

6. Projects (each project should have):
- Project name
- Technologies used
- Timeframe
- Description
- Key achievements

7. Certifications (each certification should have):
- Name
- Issuing organization
- Date
- Description
- Additional details

Return the data in this exact JSON structure:
{
  "name": "",
  "email": "",
  "phone": "",
  "location": "",
  "linkedin": "",
  "sections": [
    {
      "id": "summary",
      "title": "Professional Summary",
      "content": ""
    },
    {
      "id": "experience",
      "title": "Work Experience",
      "items": [
        {
          "title": "",
          "subtitle": "",
          "date": "",
          "description": "",
          "bullets": []
        }
      ]
    },
    {
      "id": "education",
      "title": "Education",
      "items": [
        {
          "title": "",
          "subtitle": "",
          "date": "",
          "description": "",
          "bullets": []
        }
      ]
    },
    {
      "id": "skills",
      "title": "Skills",
      "content": ""
    },
    {
      "id": "projects",
      "title": "Projects",
      "items": [
        {
          "title": "",
          "subtitle": "",
          "date": "",
          "description": "",
          "bullets": []
        }
      ]
    },
    {
      "id": "certifications",
      "title": "Certifications",
      "items": [
        {
          "title": "",
          "subtitle": "",
          "date": "",
          "description": "",
          "bullets": []
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
      max_tokens: 3000
    });

    if (!completion.choices[0].message.content) {
      throw new Error("No content in OpenAI response");
    }

    console.log("[DEBUG] OpenAI response received");

    let parsedData;
    try {
      parsedData = JSON.parse(completion.choices[0].message.content);
      console.log("[DEBUG] Successfully parsed JSON response");
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