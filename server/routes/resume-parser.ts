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
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
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
    console.log("Starting resume parsing process...");

    if (!req.file) {
      console.error("No file uploaded");
      return res.status(400).json({ error: "No file uploaded" });
    }

    console.log("File received:", {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size
    });

    // Extract text content based on file type
    let fileContent = "";
    try {
      const buffer = req.file.buffer;
      const fileType = await fileTypeFromBuffer(buffer);

      console.log("Detected file type:", fileType?.mime);

      if (fileType?.mime === 'application/pdf') {
        console.log("Processing PDF file...");
        const pdfData = await pdfParse(buffer);
        fileContent = pdfData.text;
      } else if (
        fileType?.mime === 'application/msword' ||
        fileType?.mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ) {
        console.log("Processing Word document...");
        const result = await mammoth.extractRawText({ buffer });
        fileContent = result.value;
      } else {
        console.log("Processing as text file...");
        fileContent = buffer.toString('utf8');
      }

      if (!fileContent || fileContent.trim().length === 0) {
        throw new Error("No text content could be extracted from the file");
      }

      console.log("Successfully extracted text content:", {
        contentLength: fileContent.length,
        sampleContent: fileContent.substring(0, 200)
      });

    } catch (extractError) {
      console.error("Error extracting file content:", extractError);
      return res.status(400).json({
        error: "Failed to extract content from file",
        details: extractError.message
      });
    }

    // Truncate content if too long
    if (fileContent.length > 14000) { // Approximate token limit for GPT-4
      fileContent = fileContent.substring(0, 14000);
      console.log("Content truncated to 14000 characters due to token limit");
    }

    console.log("Calling OpenAI API...");

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are a resume parser. Extract information from the resume text into the following JSON structure. For any missing information, use empty strings or arrays. Format all dates as YYYY-MM or "Present". The output must be strictly JSON with no additional text or comments.`
        },
        {
          role: "user",
          content: `Parse this resume and return a JSON object with this exact structure:
{
  "personalInfo": {
    "name": "string",
    "email": "string",
    "phone": "string",
    "location": "string",
    "linkedin": "string"
  },
  "summary": "string",
  "experience": [{
    "title": "string",
    "company": "string",
    "startDate": "string",
    "endDate": "string",
    "description": "string",
    "responsibilities": ["string"]
  }],
  "education": [{
    "degree": "string",
    "institution": "string",
    "startDate": "string",
    "endDate": "string",
    "description": "string",
    "achievements": ["string"]
  }],
  "skills": ["string"],
  "projects": [{
    "name": "string",
    "technologies": "string",
    "duration": "string",
    "description": "string",
    "highlights": ["string"]
  }],
  "certifications": [{
    "name": "string",
    "issuer": "string",
    "date": "string",
    "description": "string",
    "details": ["string"]
  }]
}

Here's the resume content to parse:

${fileContent}`
        }
      ],
      temperature: 0.1,
      max_tokens: 2048,
      response_format: { type: "json_object" }
    });

    if (!completion.choices[0].message.content) {
      throw new Error("No content in OpenAI response");
    }

    console.log("OpenAI response received");

    let parsedData;
    try {
      console.log("Raw OpenAI response:", completion.choices[0].message.content);
      parsedData = JSON.parse(completion.choices[0].message.content);
      console.log("Successfully parsed response into JSON");
    } catch (parseError) {
      console.error("Error parsing OpenAI response:", parseError);
      throw new Error("Failed to parse OpenAI response");
    }

    // Verify the parsed data has the expected structure
    if (!parsedData.personalInfo || !parsedData.experience || !parsedData.education) {
      throw new Error("Invalid data structure in parsed response");
    }

    console.log("Sending parsed data to client");
    res.json(parsedData);

  } catch (error) {
    console.error("Resume parsing error:", error);
    res.status(500).json({
      error: "Failed to parse resume",
      details: error instanceof Error ? error.message : "Unknown error",
      message: "Please try again or enter details manually."
    });
  }
});

export default router;