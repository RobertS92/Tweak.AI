import { Router } from "express";
import multer from "multer";
import { fileTypeFromBuffer } from "file-type";
import pdfParse from "pdf-parse-fork";
import mammoth from "mammoth";
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const router = Router();

// Configure multer for file uploads
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

// Helper function to chunk text while preserving structure
function chunkText(text: string, maxLength: number = 3000): string[] {
  const sections = text.split(/\n\n+/);
  const chunks: string[] = [];
  let currentChunk = '';

  for (const section of sections) {
    if ((currentChunk + section).length > maxLength && currentChunk) {
      chunks.push(currentChunk.trim());
      currentChunk = section;
    } else {
      currentChunk = currentChunk ? `${currentChunk}\n\n${section}` : section;
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

// Main resume parsing endpoint
router.post("/resume-parser", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    console.log("[DEBUG] Starting resume parsing process...");
    console.log("[DEBUG] File info:", {
      filename: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size
    });

    let fileContent = "";
    try {
      const buffer = req.file.buffer;
      const fileType = await fileTypeFromBuffer(buffer);
      const mime = fileType?.mime || req.file.mimetype;

      if (mime === "application/pdf") {
        console.log("[DEBUG] Processing PDF file...");
        const pdfData = await pdfParse(buffer);
        fileContent = pdfData.text;
      } else if (mime.includes("word")) {
        console.log("[DEBUG] Processing Word document...");
        const result = await mammoth.extractRawText({ buffer });
        fileContent = result.value;
      } else {
        console.log("[DEBUG] Processing as text file...");
        fileContent = buffer.toString('utf8');
      }

      // Clean up the extracted text while preserving structure
      fileContent = fileContent
        .replace(/[\r\n]{3,}/g, '\n\n')  // Normalize multiple line breaks
        .replace(/[^\x20-\x7E\n]/g, '')  // Remove non-printable characters
        .replace(/[ \t]+/g, ' ')         // Normalize spaces
        .trim();

      console.log("[DEBUG] Extracted text length:", fileContent.length);
      console.log("[DEBUG] First 200 chars:", fileContent.substring(0, 200));

    } catch (error) {
      console.error("[DEBUG] Text extraction error:", error);
      throw new Error(`Failed to extract text: ${error.message}`);
    }

    // Split into manageable chunks
    const chunks = chunkText(fileContent);
    console.log("[DEBUG] Split content into", chunks.length, "chunks");

    let parsedData;
    try {
      // Process first chunk to get structure
      const firstChunkResponse = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: `You are a resume parsing expert. Extract all information into a structured format, focusing on:
1. Contact information (name, email, phone, location)
2. Work experience entries (must include job titles, companies, dates)
3. Education history (must include degrees, institutions, dates)
4. Skills and other relevant sections

If the information is partial or unclear:
- Create entries with available data
- Use empty strings for missing fields
- Maintain consistent structure

Format all dates as strings in a consistent format.
Return complete JSON structure even if sections are empty.`
          },
          {
            role: "user",
            content: `Parse this resume into the exact JSON structure below. Pay special attention to work experience and education sections:

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
          "title": "",      // Job title
          "subtitle": "",   // Company name
          "date": "",      // Employment dates
          "description": "", // Role description
          "bullets": []    // Achievement bullets
        }
      ]
    },
    {
      "id": "education",
      "title": "Education",
      "items": [
        {
          "title": "",      // Degree/Program
          "subtitle": "",   // Institution
          "date": "",      // Dates
          "description": "", // Additional details
          "bullets": []    // Achievements/coursework
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
      "items": []
    },
    {
      "id": "certifications",
      "title": "Certifications",
      "items": []
    }
  ]
}

Resume text:
${chunks[0]}`
          }
        ],
        temperature: 0.1,
        response_format: { type: "json_object" }
      });

      parsedData = JSON.parse(firstChunkResponse.choices[0].message.content);
      console.log("[DEBUG] Successfully parsed first chunk");

      // Process remaining chunks
      if (chunks.length > 1) {
        for (let i = 1; i < chunks.length; i++) {
          console.log(`[DEBUG] Processing chunk ${i + 1} of ${chunks.length}`);
          const chunkResponse = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [
              {
                role: "system",
                content: "Extract additional entries from this resume chunk, focusing on work experience and education sections. Add them to the existing structure."
              },
              {
                role: "user",
                content: `Parse this additional chunk:\n\n${chunks[i]}`
              }
            ],
            temperature: 0.1,
            response_format: { type: "json_object" }
          });

          const chunkData = JSON.parse(chunkResponse.choices[0].message.content);

          // Merge additional items into existing sections
          for (const section of parsedData.sections) {
            const additionalSection = chunkData.sections?.find(s => s.id === section.id);
            if (additionalSection) {
              if (section.items && additionalSection.items) {
                section.items.push(...additionalSection.items);
              } else if (additionalSection.content && !section.content) {
                section.content = additionalSection.content;
              }
            }
          }
        }
      }

      // Ensure required sections exist
      const requiredSections = ['experience', 'education'];
      for (const sectionId of requiredSections) {
        if (!parsedData.sections.find(s => s.id === sectionId)) {
          parsedData.sections.push({
            id: sectionId,
            title: sectionId === 'experience' ? 'Work Experience' : 'Education',
            items: []
          });
        }
      }

    } catch (error) {
      console.error("[DEBUG] OpenAI parsing error:", error);
      throw new Error("Failed to parse resume content: " + error.message);
    }

    // Sanitize and validate the parsed data
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
          bullets: Array.isArray(item.bullets) ?
            item.bullets.filter(bullet => bullet && bullet.trim()) : []
        }))
      }))
    };

    console.log("[DEBUG] Resume parsed successfully. Structure:", {
      personalInfo: {
        name: sanitizedData.name,
        email: sanitizedData.email
      },
      sections: sanitizedData.sections.map(s => ({
        id: s.id,
        itemCount: s.items?.length || 0,
        hasContent: !!s.content
      }))
    });

    return res.json(sanitizedData);
  } catch (err) {
    console.error("[DEBUG] Resume parsing error:", err);
    return res.status(500).json({
      error: "Failed to parse resume",
      details: err instanceof Error ? err.message : String(err)
    });
  }
});

export { router as default };