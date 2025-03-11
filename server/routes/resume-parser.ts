import { Router } from "express";
import multer from "multer";
import { fileTypeFromBuffer } from "file-type";
import pdfParse from "pdf-parse-fork";
import mammoth from "mammoth";
import OpenAI from "openai";

const router = Router();

/** 1. Multer setup */
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
      cb(new Error("Invalid file type. Only PDF, DOC, DOCX, and TXT allowed."));
    }
  },
});

/** 2. Initialize OpenAI */
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/** 3. Resume parsing route */
router.post("/api/resume-parser", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    console.log("[DEBUG] Processing file:", {
      name: req.file.originalname,
      type: req.file.mimetype,
      size: req.file.size
    });

    // Extract text content
    let fileContent = "";
    try {
      const buffer = req.file.buffer;
      const fileType = await fileTypeFromBuffer(buffer);
      const mime = fileType?.mime || req.file.mimetype;

      console.log("[DEBUG] Detected file type:", mime);

      if (mime === "application/pdf") {
        const pdfData = await pdfParse(buffer, {
          // Enhanced PDF text extraction
          pagerender: function(pageData) {
            return pageData.getTextContent().then(function(textContent) {
              let lastY, text = '';
              for (const item of textContent.items) {
                if (lastY != item.transform[5] && text) {
                  text += '\n';
                }
                text += item.str + ' ';
                lastY = item.transform[5];
              }
              return text;
            });
          }
        });
        fileContent = pdfData.text;
      } else if (mime.includes("word")) {
        const result = await mammoth.extractRawText({ buffer });
        fileContent = result.value;
      } else {
        fileContent = buffer.toString('utf8');
      }

      // Clean and normalize text
      fileContent = fileContent
        .replace(/[\r\n]+/g, '\n')
        .replace(/\s+/g, ' ')
        .replace(/[^\x20-\x7E\n]/g, '')
        .trim();

      if (!fileContent.trim()) {
        throw new Error("No text content could be extracted");
      }

      console.log("[DEBUG] Extracted content length:", fileContent.length);

    } catch (error) {
      console.error("[DEBUG] Text extraction error:", error);
      throw new Error(`Failed to extract text: ${error.message}`);
    }

    // Truncate if too long
    const MAX_LENGTH = 6000;
    if (fileContent.length > MAX_LENGTH) {
      fileContent = fileContent.slice(0, MAX_LENGTH);
      console.log("[DEBUG] Content truncated to", MAX_LENGTH, "characters");
    }

    // Parse with OpenAI
    console.log("[DEBUG] Calling OpenAI...");
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "Extract resume information into the specified JSON format. Keep original text intact where possible."
        },
        {
          role: "user",
          content: `Parse this resume into this exact JSON structure:
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

Resume text:
${fileContent}`
        }
      ],
      temperature: 0.1,
      max_tokens: 2000,
      response_format: { type: "json_object" }
    });

    // Parse and validate response
    const responseText = completion.choices[0]?.message?.content;
    if (!responseText) {
      throw new Error("Empty response from OpenAI");
    }

    console.log("[DEBUG] Parsing OpenAI response");
    let parsedData;
    try {
      parsedData = JSON.parse(responseText);
    } catch (error) {
      console.error("[DEBUG] JSON parse error:", error);
      throw new Error("Failed to parse OpenAI response");
    }

    // Validate structure
    if (!parsedData.sections || !Array.isArray(parsedData.sections)) {
      throw new Error("Invalid response structure");
    }

    // Sanitize output
    const sanitizedData = {
      name: parsedData.name || "",
      email: parsedData.email || "",
      phone: parsedData.phone || "",
      location: parsedData.location || "",
      linkedin: parsedData.linkedin || "",
      sections: parsedData.sections.map(section => ({
        id: section.id || "",
        title: section.title || "",
        content: section.content || "",
        items: section.items?.map(item => ({
          title: item.title || "",
          subtitle: item.subtitle || "",
          date: item.date || "",
          description: item.description || "",
          bullets: Array.isArray(item.bullets) ? item.bullets : []
        }))
      }))
    };

    console.log("[DEBUG] Successfully parsed resume");
    return res.json(sanitizedData);

  } catch (error) {
    console.error("[DEBUG] Resume parsing error:", error);
    return res.status(500).json({
      error: "Failed to parse resume",
      details: error.message
    });
  }
});

export default router;