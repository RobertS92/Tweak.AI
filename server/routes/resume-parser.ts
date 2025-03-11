// filename: routes/resume-parser.ts

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
  apiKey: process.env.OPENAI_API_KEY, // Ensure this is valid in your environment
});

/** 3. The main resume parsing route */
router.post("/api/ai-resume-parser", upload.single("file"), async (req, res) => {
  try {
    console.log("Resume parsing route called.");

    // Ensure user uploaded a file
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    console.log("File received:", {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
    });

    /** 4. Extract text content from the uploaded file */
    let fileContent = "";
    try {
      const { buffer } = req.file;
      const detectedType = await fileTypeFromBuffer(buffer);
      const mime = detectedType?.mime || req.file.mimetype;

      if (mime === "application/pdf") {
        console.log("Extracting text from PDF...");
        const pdfData = await pdfParse(buffer);
        fileContent = pdfData.text || "";
      } else if (
        mime === "application/msword" ||
        mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      ) {
        console.log("Extracting text from Word document...");
        const mammothResult = await mammoth.extractRawText({ buffer });
        fileContent = mammothResult.value || "";
      } else {
        console.log("Extracting text from plain text...");
        fileContent = buffer.toString("utf8");
      }

      if (!fileContent.trim()) {
        throw new Error("No text content could be extracted from the file.");
      }

      console.log("Extracted text length:", fileContent.length);
      // Debugging: log first 500 characters of extracted text
      const preview = fileContent.slice(0, 500);
      console.log("Extracted text sample:\n", preview);

    } catch (err: any) {
      console.error("Extraction error:", err);
      return res.status(400).json({
        error: "Could not extract file content",
        details: err.message,
      });
    }

    /** 5. Truncate the text to ~8k characters to keep prompt smaller */
    const MAX_LENGTH = 8000;
    if (fileContent.length > MAX_LENGTH) {
      fileContent = fileContent.slice(0, MAX_LENGTH);
      console.log(`Content truncated to ${MAX_LENGTH} characters.`);
    }

    /** 6. Call OpenAI with minimal instructions to keep it fast */
    console.log("Calling OpenAI to parse resume...");

    let completion;
    try {
      completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo", // typically faster + more accessible than gpt-4
        messages: [
          {
            role: "system",
            content: `You are a concise resume parsing assistant. 
Return ONLY valid JSON, no extra text. If missing data, leave fields empty.`,
          },
          {
            role: "user",
            content: `Please extract these fields from the resume text and format as JSON with these exact keys:
{
  "fullName": "",
  "email": "",
  "phone": "",
  "location": "",
  "linkedinUrl": "",
  "professionalSummary": "",
  "workExperience": [],
  "education": [],
  "skills": "",
  "projects": [],
  "certifications": []
}

Resume text:\n${fileContent}`,
          },
        ],
        temperature: 0.0,
        max_tokens: 2000, // Adjust if needed
      });
    } catch (apiErr: any) {
      console.error("OpenAI API error:", apiErr);
      return res.status(500).json({
        error: "OpenAI call failed",
        details: apiErr.message,
      });
    }

    // 7. Extract the raw text from OpenAI
    const rawContent = completion?.choices?.[0]?.message?.content;
    if (!rawContent) {
      return res.status(400).json({
        error: "Empty response from OpenAI",
      });
    }

    console.log("OpenAI response received, attempting JSON parse...");

    // 8. Clean up possible code fences, then parse
    const cleaned = rawContent.replace(/```/g, "").trim();

    let parsedData: any;
    try {
      parsedData = JSON.parse(cleaned);
    } catch (parseErr: any) {
      console.error("JSON parse error:", parseErr.message);
      return res.status(400).json({
        error: "Failed to parse JSON from OpenAI",
        details: parseErr.message,
        rawOpenAiText: cleaned.slice(0, 1000), // Provide partial for debugging
      });
    }

    /** 9. Build the final output structure */
    const formData = {
      name: parsedData.fullName || "",
      email: parsedData.email || "",
      phone: parsedData.phone || "",
      location: parsedData.location || "",
      linkedin: parsedData.linkedinUrl || "",
      sections: [
        {
          id: "summary",
          title: "Professional Summary",
          content: parsedData.professionalSummary || "",
        },
        {
          id: "experience",
          title: "Work Experience",
          items: parsedData.workExperience || [],
        },
        {
          id: "education",
          title: "Education",
          items: parsedData.education || [],
        },
        {
          id: "skills",
          title: "Skills",
          content: parsedData.skills || "",
        },
        {
          id: "projects",
          title: "Projects",
          items: parsedData.projects || [],
        },
        {
          id: "certifications",
          title: "Certifications",
          items: parsedData.certifications || [],
        },
      ],
    };

    // Debugging: Log the final JSON
    console.log("Final JSON about to send:\n", JSON.stringify(formData, null, 2));

    // 10. Return success
    console.log("Resume parsed successfully. Sending JSON...");
    return res.json(formData);

  } catch (err: any) {
    // Final catch-all for unexpected errors
    console.error("Unexpected error in resume parsing route:", err);
    return res.status(500).json({
      error: "An unexpected error occurred during resume parsing.",
      details: err.message || String(err),
    });
  }
});

export default router;
