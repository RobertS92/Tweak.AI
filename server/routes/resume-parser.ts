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

  // Remove debug lines and preserve structure
  const lines = text.split('\n');
  const cleanedLines = lines
    .filter(line => !line.includes('[DEBUG]'))
    .filter(line => line.trim().length > 0);

  text = cleanedLines.join('\n');

  // Clean up the text while preserving structure
  text = text
    .replace(/[\r\n]{3,}/g, '\n\n')
    .replace(/[^\x20-\x7E\n]/g, '')
    .replace(/[ \t]+/g, ' ')
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
        content: `You are a resume parsing expert. Extract ALL information into a JSON object with exactly this structure:

{
  "name": "",
  "email": "",
  "phone": "",
  "location": "",
  "website": "",
  "linkedin": "",
  "objective": "",
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
    }
  ]
}

IMPORTANT:
1. Return ONLY the JSON object, no additional text
2. Extract ALL contact information from the text
3. Always include all sections even if empty
4. Format dates consistently as YYYY-MM
5. Parse skills into technical and soft skills categories
6. Keep section IDs exactly as shown for frontend compatibility
7. Include personal info fields ONLY in the personalInfo object
8. Do NOT include personal-info or Personal Information in the sections array - it's already handled separately
9. Return personal information only in the top-level personalInfo object
10. Ensure the sections array follows exactly this order: professional-summary, work-experience, education, skills, projects, certifications
11. Never add Personal Information as a section in the sections array`
      },
      {
        role: "user",
        content: `Parse this resume text into the specified JSON structure. Extract ALL information and ensure each section is populated:\n\n${content}`
      }
    ],
    temperature: 0.1,
  });

  if (!response.choices[0].message.content) {
    throw new Error("No content in OpenAI response");
  }

  try {
    const parsedData = JSON.parse(response.choices[0].message.content);

    // Filter out any personal-info section from the sections array
    if (parsedData.sections && Array.isArray(parsedData.sections)) {
      // Ensure we completely remove any personal-info sections 
      parsedData.sections = parsedData.sections.filter(section => 
        section.id !== 'personal-info' && 
        section.title !== 'Personal Information'
      );
      
      // Also ensure sections are in the correct order by re-ordering if needed
      const desiredOrder = [
        'professional-summary',
        'work-experience',
        'education',
        'skills',
        'projects',
        'certifications'
      ];
      
      // Sort sections based on their position in the desired order array
      parsedData.sections.sort((a, b) => {
        const indexA = desiredOrder.indexOf(a.id);
        const indexB = desiredOrder.indexOf(b.id);
        return indexA - indexB;
      });
    }

    // Debug Personal Information
    console.log("\n[DEBUG] Personal Information Parsing:");
    Object.entries(parsedData.personalInfo).forEach(([field, value]) => {
      console.log(`[DEBUG] ${field}: ${value ? '✓ Found' : '✗ Empty'} ${value ? `(${value})` : ''}`);
      // No longer copying to top level - we'll only use personalInfo
    });

    // Debug Sections
    console.log("\n[DEBUG] Sections Parsing:");
    parsedData.sections.forEach(section => {
      console.log(`\n[DEBUG] Section: ${section.id}`);
      console.log(`[DEBUG] Title: ${section.title}`);

      // Ensure each section has required fields based on type
      if (section.id === 'education' && !section.items) {
        section.items = [];
      }

      if (section.id === 'skills' && !section.categories) {
        section.categories = [
          { name: "Technical Skills", skills: [] },
          { name: "Soft Skills", skills: [] }
        ];
      }

      if (['work-experience', 'projects', 'certifications'].includes(section.id) && !section.items) {
        section.items = [];
      }

      if (['professional-summary', 'personal-info'].includes(section.id) && !section.content) {
        section.content = "";
      }

      if (section.content) {
        console.log(`[DEBUG] Content: ✓ Found (${section.content.length} chars)`);
      }

      if (section.items && section.items.length > 0) {
        console.log(`[DEBUG] Items: ${section.items.length} found`);
        section.items.forEach((item, index) => {
          console.log(`\n[DEBUG] Item ${index + 1}:`);
          Object.entries(item).forEach(([field, value]) => {
            if (Array.isArray(value)) {
              console.log(`[DEBUG]   ${field}: ${value.length} entries`);
            } else {
              console.log(`[DEBUG]   ${field}: ${value ? '✓' : '✗'} ${value || ''}`);
            }
          });
        });
      }

      if (section.categories) {
        console.log(`\n[DEBUG] Categories:`);
        section.categories.forEach(category => {
          console.log(`[DEBUG] ${category.name}: ${category.skills.length} skills`);
          console.log(`[DEBUG] Skills: ${category.skills.join(', ')}`);
        });
      }
    });

    // Overall statistics
    console.log("\n[DEBUG] Parsing Statistics:");
    console.log(`[DEBUG] Personal Info Fields: ${Object.values(parsedData.personalInfo).filter(Boolean).length}/${Object.keys(parsedData.personalInfo).length}`);
    console.log(`[DEBUG] Total Sections: ${parsedData.sections.length}`);
    console.log(`[DEBUG] Work Experience Items: ${parsedData.sections.find(s => s.id === 'work-experience')?.items?.length || 0}`);
    console.log(`[DEBUG] Education Items: ${parsedData.sections.find(s => s.id === 'education')?.items?.length || 0}`);
    console.log(`[DEBUG] Total Skills: ${parsedData.sections.find(s => s.id === 'skills')?.categories?.reduce((acc, cat) => acc + cat.skills.length, 0) || 0}`);

    return parsedData;
  } catch (error) {
    console.error("[DEBUG] JSON parse error:", error);
    console.log("[DEBUG] Raw response:", response.choices[0].message.content);
    throw new Error("Failed to parse OpenAI response as JSON");
  }
}

router.post("/resume-parser", upload.single("file"), async (req, res) => {
  console.log("[DEBUG] Resume parser request received");
  console.log("[DEBUG] Request body:", req.body);
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
        fileContent = cleanTextContent(buffer.toString('utf8'));
      }

      if (!fileContent || fileContent.trim().length === 0) {
        throw new Error('No content could be extracted from the file');
      }

      console.log("[DEBUG] Successfully extracted content, length:", fileContent.length);
      console.log("[DEBUG] Content preview:", fileContent.substring(0, 200));

      const parsedData = await parseResume(fileContent);
      const personalInfo = parsedData.personalInfo;
      const sections = parsedData.sections;


      // Make sure all expected sections exist and have proper structure
      const ensureSection = (id: string, title: string, sections: any[]) => {
        const section = sections.find(s => s.id === id);
        if (!section) {
          sections.push({ id, title, items: [] });
        } else if (id === 'education' || id === 'projects' || id === 'certifications') {
          // Ensure items array exists for these sections
          section.items = section.items || [];
        }
      };

      // Ensure all required sections exist with proper structure
      ensureSection('education', 'Education', sections);
      ensureSection('projects', 'Projects', sections);
      ensureSection('certifications', 'Certifications', sections);

      // Make sure the sections array includes all required sections in the right order for the menu
      const requiredSections = [
        'professional-summary', 
        'work-experience', 
        'education', 
        'skills', 
        'projects', 
        'certifications'
      ];

      // Sort sections according to the required order
      sections.sort((a, b) => {
        const indexA = requiredSections.indexOf(a.id);
        const indexB = requiredSections.indexOf(b.id);
        return indexA - indexB;
      });

      // Return the formatted data with only personalInfo (no top-level fields)
      return res.json({
        personalInfo,
        sections
      });

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