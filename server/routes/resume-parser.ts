import { Router } from "express";
import multer from "multer";
import { fileTypeFromBuffer } from "file-type";
import pdfParse from "pdf-parse-fork";
import mammoth from "mammoth";
import OpenAI from "openai";

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
              // Sort items by position to maintain layout structure
              const items = textContent.items.sort((a, b) => {
                if (Math.abs(b.transform[5] - a.transform[5]) > 5) {
                  return b.transform[5] - a.transform[5];
                }
                return a.transform[4] - b.transform[4];
              });

              for (const item of items) {
                // Add line breaks between different vertical positions
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

      // Clean up the extracted text while preserving structure
      fileContent = fileContent
        .replace(/[\r\n]{3,}/g, '\n\n')  // Normalize multiple line breaks
        .replace(/[^\x20-\x7E\n]/g, '')  // Remove non-printable characters
        .replace(/[ \t]+/g, ' ')         // Normalize spaces
        .trim();

      console.log("[DEBUG] Extracted content length:", fileContent.length);
      console.log("[DEBUG] First 200 chars of content:", fileContent.substring(0, 200));

    } catch (extractError) {
      console.error("[DEBUG] Error extracting file content:", extractError);
      throw new Error("Failed to extract content from file: " + extractError.message);
    }

    console.log("[DEBUG] Calling OpenAI API...");
    const completion = await openai.chat.completions.create({
      model: "gpt-4", // Using GPT-4 for better parsing accuracy
      messages: [
        {
          role: "system",
          content: `You are a precise resume parser that excels at identifying and extracting structured information from resumes. Follow these key instructions:

1. Always identify and extract work experience and education sections, even if incomplete
2. For each work experience entry:
   - Capture job titles, company names, dates, and descriptions
   - Extract all bullet points and achievements
   - Use empty strings for truly missing fields
3. For each education entry:
   - Include degree names, institutions, and dates
   - Capture any relevant coursework or achievements
4. Preserve original text formatting where possible
5. Return a complete JSON structure with all sections, even if some are empty

If you can't find certain information, use empty strings but maintain the structure.`
        },
        {
          role: "user",
          content: `Parse this resume and extract ALL information into this exact JSON structure. Pay special attention to work experience and education sections:

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
          "title": "",      // Job title, required
          "subtitle": "",   // Company name, required
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
          "title": "",      // Degree name, required
          "subtitle": "",   // Institution name, required
          "date": "",      // Education dates
          "description": "", // Program description
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
          bullets: Array.isArray(item.bullets) ? 
            item.bullets.filter(bullet => bullet && bullet.trim()) : []
        }))
      }))
    };

    // Verify that work experience and education sections exist
    const requiredSections = ['experience', 'education'];
    for (const sectionId of requiredSections) {
      if (!sanitizedData.sections.find(s => s.id === sectionId)) {
        sanitizedData.sections.push({
          id: sectionId,
          title: sectionId === 'experience' ? 'Work Experience' : 'Education',
          items: []
        });
      }
    }

    console.log("[DEBUG] Resume parsed successfully");
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

export default router;