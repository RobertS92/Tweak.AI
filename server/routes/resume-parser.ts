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

async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  console.log("[DEBUG] Starting PDF text extraction");

  try {
    // First validate if it's a valid PDF by checking for PDF signature
    const pdfSignature = buffer.toString('ascii', 0, 5);
    if (pdfSignature !== '%PDF-') {
      console.error("[DEBUG] Invalid PDF signature:", pdfSignature);
      throw new Error('Invalid PDF format - missing PDF signature');
    }

    console.log("[DEBUG] PDF signature validated");

    try {
      // Try with default options first
      console.log("[DEBUG] Attempting PDF parsing with default options");
      const data = await pdfParse(buffer);
      if (!data || !data.text || data.text.trim().length === 0) {
        throw new Error('No text content extracted');
      }
      return data.text;
    } catch (firstError) {
      console.log("[DEBUG] First parsing attempt failed, trying with fallback options");

      // Fallback: Try with modified options
      const data = await pdfParse(buffer, {
        max: 0, // No page limit
        version: 'v2.0.550',
        pagerender: null // Disable rendering
      });

      if (!data || !data.text || data.text.trim().length === 0) {
        throw new Error('No text content extracted with fallback options');
      }

      return data.text;
    }
  } catch (error) {
    console.error("[DEBUG] PDF parsing error details:", error);

    // Use Vision API as last resort for PDFs that fail parsing
    try {
      console.log("[DEBUG] Attempting extraction using Vision API");
      const base64Pdf = buffer.toString('base64');
      const response = await openai.chat.completions.create({
        model: "gpt-4-vision-preview",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Extract and return only the text content from this resume PDF. Include all details but remove any irrelevant text or formatting."
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:application/pdf;base64,${base64Pdf}`
                }
              }
            ],
          },
        ],
        max_tokens: 1500,
      });

      const extractedText = response.choices[0].message.content;
      if (!extractedText) {
        throw new Error('Vision API returned no content');
      }

      console.log("[DEBUG] Successfully extracted text using Vision API");
      return extractedText;
    } catch (visionError) {
      console.error("[DEBUG] Vision API extraction failed:", visionError);
      throw new Error('Failed to extract text from PDF using all available methods');
    }
  }
}

function chunkText(text: string, maxLength: number = 3000): string[] {
  console.log("[DEBUG] Chunking text, initial length:", text.length);
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

  console.log("[DEBUG] Created", chunks.length, "chunks");
  chunks.forEach((chunk, i) => {
    console.log(`[DEBUG] Chunk ${i + 1} length:`, chunk.length);
  });

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

    let fileContent: string;
    try {
      const buffer = req.file.buffer;
      const fileType = await fileTypeFromBuffer(buffer);
      const mime = fileType?.mime || req.file.mimetype;

      console.log("[DEBUG] Detected file type:", mime);

      if (mime === "application/pdf") {
        console.log("[DEBUG] Processing PDF file...");
        fileContent = await extractTextFromPDF(buffer);
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
            content: `You are a resume parsing expert. Extract all information into a structured format, focusing on:
1. Personal details (name, contact info, location, links)
2. Professional summary
3. Work experience (jobs, dates, achievements)
4. Education (degrees, dates, details)
5. Skills (technical and soft skills)
6. Certifications and licenses
7. Projects and publications

Parse all information carefully:
- Keep section IDs consistent
- Format dates as YYYY-MM
- Include all fields even if empty
- Preserve original content structure`
          },
          {
            role: "user",
            content: `Parse this resume into the exact JSON structure below:

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
      "title": "Certifications & Licenses",
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

Resume text:
${chunks[0]}`
          }
        ],
        temperature: 0.1,
        response_format: { type: "json_object" }
      });

      if (!firstChunkResponse.choices[0].message.content) {
        throw new Error("No content in OpenAI response");
      }

      try {
        parsedData = JSON.parse(firstChunkResponse.choices[0].message.content);
        console.log("[DEBUG] Successfully parsed first chunk");
        console.log("[DEBUG] Section IDs found:", parsedData.sections.map(s => s.id));
      } catch (parseError) {
        console.error("[DEBUG] JSON parse error:", parseError);
        console.log("[DEBUG] Raw response:", firstChunkResponse.choices[0].message.content);
        throw new Error("Failed to parse OpenAI response as JSON");
      }

      // Process remaining chunks
      if (chunks.length > 1) {
        for (let i = 1; i < chunks.length; i++) {
          console.log(`[DEBUG] Processing chunk ${i + 1} of ${chunks.length}`);
          const chunkResponse = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [
              {
                role: "system",
                content: "Extract additional information from this resume chunk, maintaining the same JSON structure. Focus on work experience, education, certifications, and projects."
              },
              {
                role: "user",
                content: `Additional resume text:\n${chunks[i]}`
              }
            ],
            temperature: 0.1,
            response_format: { type: "json_object" }
          });

          try {
            const chunkData = JSON.parse(chunkResponse.choices[0].message.content);
            console.log(`[DEBUG] Successfully parsed chunk ${i + 1}`);

            // Merge sections
            for (const section of parsedData.sections) {
              const additionalSection = chunkData.sections?.find((s: any) => s.id === section.id);
              if (additionalSection) {
                if (section.items && additionalSection.items) {
                  console.log(`[DEBUG] Merging items for section: ${section.id}`);
                  section.items.push(...additionalSection.items);
                } else if (additionalSection.content && !section.content) {
                  console.log(`[DEBUG] Adding content for section: ${section.id}`);
                  section.content = additionalSection.content;
                } else if (additionalSection.categories) {
                  console.log(`[DEBUG] Merging categories for section: ${section.id}`);
                  section.categories = section.categories.map((cat: any, idx: number) => ({
                    ...cat,
                    skills: [...new Set([...cat.skills, ...(additionalSection.categories[idx]?.skills || [])])]
                  }));
                }
              }
            }
          } catch (parseError) {
            console.error(`[DEBUG] Failed to parse chunk ${i + 1}:`, parseError);
          }
        }
      }

      // Verify all required sections exist
      const requiredSections = [
        'professional-summary',
        'work-experience',
        'education',
        'skills',
        'certifications',
        'projects'
      ];

      console.log("[DEBUG] Verifying required sections...");
      for (const sectionId of requiredSections) {
        if (!parsedData.sections.find(s => s.id === sectionId)) {
          console.log(`[DEBUG] Adding missing section: ${sectionId}`);
          parsedData.sections.push({
            id: sectionId,
            title: sectionId.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
            items: [],
            content: '',
            categories: sectionId === 'skills' ? [
              { name: 'Technical Skills', skills: [] },
              { name: 'Soft Skills', skills: [] }
            ] : undefined
          });
        }
      }

      // Log section statistics
      console.log("[DEBUG] Resume parsing statistics:", {
        personalInfo: {
          fieldsFound: Object.entries(parsedData.personalInfo)
            .filter(([_, value]) => value && value.length > 0).length
        },
        sections: parsedData.sections.map(section => ({
          id: section.id,
          itemCount: section.items?.length || 0,
          contentLength: section.content?.length || 0,
          categoriesCount: section.categories?.length || 0
        }))
      });

    } catch (error) {
      console.error("[DEBUG] OpenAI parsing error:", error);
      throw new Error(`Failed to parse resume: ${error instanceof Error ? error.message : String(error)}`);
    }

    console.log("[DEBUG] Resume parsing completed successfully");
    res.json(parsedData);

  } catch (error) {
    console.error("[DEBUG] Resume parsing error:", error);
    res.status(500).json({
      error: "Failed to parse resume",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;