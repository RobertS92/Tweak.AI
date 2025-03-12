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
  limits: { fileSize: 10 * 1024 * 1024 },
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

// Test endpoint with sample resume
router.get("/api/test-parser", async (req, res) => {
  try {
    const sampleResume = `
Rob Seals
AI / ML Engineer & Financial Data Analyst
Email: rseals13@gmail.com | Phone: 832-517-0329 | Location: Houston, TX

Professional Summary
Detail-oriented AI/ML Engineer and Data Analyst with 5+ years of combined experience.

Work Experience
AI / ML Engineer
Tata Consultancy Services (TCS)
Jun 2024 – Oct 2024
• Integrated NLP models to parse and classify unstructured text
• Deployed LLM-based solutions on AWS Lambda

Education
Post Graduate Degree (AI & ML)
University of Texas
Jan 2022 – Dec 2023
`;

    console.log("[DEBUG] Testing parser with sample resume");
    const chunks = chunkText(sampleResume);
    console.log("[DEBUG] Created chunks:", chunks.length);

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `Parse the resume text into sections. Focus on:
1. Personal details (name, contact)
2. Work experience (jobs, dates)
3. Education (degrees, dates)
Return in the exact JSON structure requested.`
        },
        {
          role: "user",
          content: `Parse this resume into the following JSON structure:
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
    }
  ]
}

Resume text:
${sampleResume}`
        }
      ],
      temperature: 0.1,
      response_format: { type: "json_object" }
    });

    console.log("[DEBUG] Raw OpenAI response:", completion.choices[0].message.content);
    const result = JSON.parse(completion.choices[0].message.content);
    return res.json(result);

  } catch (error) {
    console.error("[DEBUG] Test parser error:", error);
    return res.status(500).json({
      error: "Parser test failed",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// Main resume parsing endpoint
router.post("/api/resume-parser", upload.single("file"), async (req, res) => {
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

      console.log("[DEBUG] Detected file type:", mime);

      if (mime === "application/pdf") {
        console.log("[DEBUG] Processing PDF file...");
        const pdfData = await pdfParse(buffer, {
          pagerender: function(pageData) {
            return pageData.getTextContent().then(function(textContent) {
              let lastY, text = '';
              const items = textContent.items.sort((a, b) => {
                if (Math.abs(b.transform[5] - a.transform[5]) > 5) {
                  return b.transform[5] - a.transform[5];
                }
                return a.transform[4] - b.transform[4];
              });

              for (const item of items) {
                if (lastY !== item.transform[5] && text) {
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
        console.log("[DEBUG] Processing Word document...");
        const result = await mammoth.extractRawText({ buffer });
        fileContent = result.value;
      } else {
        console.log("[DEBUG] Processing as text file...");
        fileContent = buffer.toString('utf8');
      }

      fileContent = fileContent
        .replace(/[\r\n]{3,}/g, '\n\n')
        .replace(/[^\x20-\x7E\n]/g, '')
        .replace(/[ \t]+/g, ' ')
        .trim();

      console.log("[DEBUG] Extracted content length:", fileContent.length);
      console.log("[DEBUG] First 200 chars of content:", fileContent.substring(0, 200));

    } catch (error) {
      console.error("[DEBUG] Text extraction error:", error);
      throw new Error(`Failed to extract text: ${error.message}`);
    }

    // Split into smaller chunks to avoid token limits
    const chunks = chunkText(fileContent, 3000);
    console.log("[DEBUG] Split content into", chunks.length, "chunks");

    let parsedData;
    try {
      // Process first chunk to get structure
      const firstChunkResponse = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: `Extract structured information from resumes. Focus on:
1. Personal details (name, contact)
2. Work experience (jobs, dates)
3. Education (degrees, dates)
Return in the exact JSON structure requested.`
          },
          {
            role: "user",
            content: `Parse this resume chunk into the following JSON structure:
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
      "items": []
    },
    {
      "id": "education",
      "title": "Education",
      "items": []
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
      console.log("[DEBUG] Parsed first chunk successfully");

      // Process remaining chunks if any
      if (chunks.length > 1) {
        for (let i = 1; i < chunks.length; i++) {
          console.log(`[DEBUG] Processing chunk ${i + 1} of ${chunks.length}`);
          const chunkResponse = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [
              {
                role: "system",
                content: "Extract additional entries from this resume chunk to add to the existing structure."
              },
              {
                role: "user",
                content: `Parse this additional resume chunk:\n\n${chunks[i]}`
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

    console.log("[DEBUG] Sending parsed data to frontend:", {
      personalInfo: {
        name: sanitizedData.name,
        email: sanitizedData.email,
        phone: sanitizedData.phone,
        location: sanitizedData.location,
        linkedin: sanitizedData.linkedin
      },
      sectionsCount: sanitizedData.sections.length,
      sections: sanitizedData.sections.map(s => ({
        id: s.id,
        title: s.title,
        hasContent: !!s.content,
        itemsCount: s.items?.length || 0
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