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

  // Remove debug log lines
  text = text.split('\n')
    .filter(line => !line.includes('[DEBUG]'))
    .join('\n');

  // Clean up the text
  text = text
    .replace(/[\r\n]{3,}/g, '\n\n')  // Normalize line breaks
    .replace(/[^\x20-\x7E\n]/g, '')  // Remove non-printable characters
    .replace(/[ \t]+/g, ' ')         // Normalize spaces
    .trim();

  console.log("[DEBUG] Cleaned text length:", text.length);
  return text;
}

async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  console.log("[DEBUG] Starting PDF text extraction");

  try {
    const pdfSignature = buffer.toString('ascii', 0, 5);
    if (pdfSignature !== '%PDF-') {
      throw new Error('Invalid PDF format');
    }

    const data = await pdfParse(buffer, {
      max: 0,
      version: 'v2.0.550'
    });

    if (!data || !data.text || data.text.trim().length === 0) {
      throw new Error('No text content extracted from PDF');
    }

    return cleanTextContent(data.text);
  } catch (error) {
    console.error('PDF parsing error:', error);
    throw new Error('Unable to extract text from PDF. Please try uploading a different file format or copy-paste the content directly.');
  }
}

router.post("/resume-parser", upload.single("file"), async (req, res) => {
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
        fileContent = await extractTextFromPDF(buffer);
      } else if (mime.includes("word")) {
        const result = await mammoth.extractRawText({ buffer });
        fileContent = cleanTextContent(result.value);
      } else {
        // Handle text files
        fileContent = cleanTextContent(buffer.toString('utf8'));
      }

      if (!fileContent || fileContent.trim().length === 0) {
        throw new Error('No content could be extracted from the file');
      }

      console.log("[DEBUG] Successfully extracted content, length:", fileContent.length);
      console.log("[DEBUG] Content preview:", fileContent.substring(0, 200));

      const response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are a resume parsing expert. Extract all information into sections like contact details, summary, experience, education, skills, etc. Format all dates consistently and preserve the structure."
          },
          {
            role: "user",
            content: fileContent
          }
        ],
        temperature: 0.1
      });

      if (!response.choices[0].message.content) {
        throw new Error('Failed to analyze resume content');
      }

      const parsedContent = response.choices[0].message.content;
      res.json({ content: parsedContent });

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