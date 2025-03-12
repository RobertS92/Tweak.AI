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

router.post("/resume-parser", upload.single("file"), async (req, res) => {
  try {
    console.log("[DEBUG] Starting resume parsing process...");

    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

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
              for (const item of textContent.items) {
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

      if (!fileContent || fileContent.length === 0) {
        throw new Error("No content could be extracted from file");
      }

      console.log("[DEBUG] Extracted text length:", fileContent.length);
      console.log("[DEBUG] First 200 chars:", fileContent.substring(0, 200));

    } catch (error) {
      console.error("[DEBUG] Text extraction error:", error);
      throw new Error(`Failed to extract text: ${error instanceof Error ? error.message : String(error)}`);
    }

    const chunks = chunkText(fileContent);
    console.log("[DEBUG] Split content into", chunks.length, "chunks");

    let parsedData;
    try {
      const firstChunkResponse = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: `You are a resume parsing expert. Extract structured information focusing on:
1. Personal details (name, email, phone, location)
2. Professional summary
3. Work experience with detailed entries
4. Education history with institutions and dates
5. Skills and technical competencies

Format response as a valid JSON object with an exact structure matching the example. 
Include ALL fields even if empty.
Ensure dates and contact info are properly formatted.`
          },
          {
            role: "user",
            content: `Parse this resume text into this exact JSON structure:

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
    }
  ]
}

Resume text:
${chunks[0]}`
          }
        ],
        temperature: 0.1
      });

      if (!firstChunkResponse.choices[0].message.content) {
        throw new Error("No content in OpenAI response");
      }

      try {
        parsedData = JSON.parse(firstChunkResponse.choices[0].message.content);
        console.log("[DEBUG] Successfully parsed first chunk:", parsedData);
      } catch (parseError) {
        console.error("[DEBUG] JSON parse error:", parseError);
        console.log("[DEBUG] Raw response:", firstChunkResponse.choices[0].message.content);
        throw new Error("Failed to parse OpenAI response as JSON");
      }

      if (chunks.length > 1) {
        for (let i = 1; i < chunks.length; i++) {
          console.log(`[DEBUG] Processing chunk ${i + 1} of ${chunks.length}`);
          const chunkResponse = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [
              {
                role: "system",
                content: `Extract additional information from this resume chunk, maintaining the exact same JSON structure.
Focus on work experience and education entries.
Return only the extracted data in JSON format.`
              },
              {
                role: "user",
                content: `Additional resume text:\n${chunks[i]}`
              }
            ],
            temperature: 0.1
          });

          if (!chunkResponse.choices[0].message.content) {
            console.warn(`[DEBUG] Empty response for chunk ${i + 1}`);
            continue;
          }

          try {
            const chunkData = JSON.parse(chunkResponse.choices[0].message.content);

            // Merge additional data into existing sections
            for (const section of parsedData.sections) {
              const additionalSection = chunkData.sections?.find((s: any) => s.id === section.id);
              if (additionalSection?.items?.length) {
                section.items = [...(section.items || []), ...additionalSection.items];
              } else if (additionalSection?.content && !section.content) {
                section.content = additionalSection.content;
              }
            }
          } catch (parseError) {
            console.error(`[DEBUG] Failed to parse chunk ${i + 1}:`, parseError);
          }
        }
      }

    } catch (error) {
      console.error("[DEBUG] OpenAI parsing error:", error);
      throw new Error(`Failed to parse resume: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Add default sections if missing
    const requiredSections = ['summary', 'experience', 'education', 'skills'];
    for (const sectionId of requiredSections) {
      if (!parsedData.sections.find((s: any) => s.id === sectionId)) {
        parsedData.sections.push({
          id: sectionId,
          title: sectionId.charAt(0).toUpperCase() + sectionId.slice(1),
          content: '',
          items: []
        });
      }
    }

    // Validate and clean the data
    const cleanData = {
      name: parsedData.name || "",
      email: parsedData.email || "",
      phone: parsedData.phone || "",
      location: parsedData.location || "",
      linkedin: parsedData.linkedin || "",
      sections: parsedData.sections.map(section => ({
        id: section.id,
        title: section.title,
        content: section.content || "",
        items: (section.items || []).map(item => ({
          title: item.title || "",
          subtitle: item.subtitle || "",
          date: item.date || "",
          description: item.description || "",
          bullets: Array.isArray(item.bullets) ? item.bullets.filter(Boolean) : []
        }))
      }))
    };

    console.log("[DEBUG] Resume parsed successfully:", {
      contactInfo: {
        name: cleanData.name,
        email: cleanData.email
      },
      sectionCounts: cleanData.sections.map(s => ({
        id: s.id,
        items: s.items?.length || 0
      }))
    });

    res.json(cleanData);
  } catch (error) {
    console.error("[DEBUG] Resume parsing error:", error);
    res.status(500).json({
      error: "Failed to parse resume",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;