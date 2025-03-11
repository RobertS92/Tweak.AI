import OpenAI from "openai";
import { Router } from "express";
import multer from "multer";
import { promises as fs } from "fs";
import path from "path";

const router = Router();
const upload = multer({ 
  dest: "uploads/",
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['text/plain', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOC, DOCX, and TXT files are allowed.'));
    }
  }
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

router.post("/api/ai-resume-parser", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    console.log("Processing file:", req.file.originalname, "Type:", req.file.mimetype);

    // Read the file content
    let fileContent = await fs.readFile(req.file.path, "utf-8");

    // Clean up the uploaded file
    await fs.unlink(req.file.path);

    // Truncate content if too long (OpenAI has token limits)
    if (fileContent.length > 12000) { // Approximate token limit
      fileContent = fileContent.substring(0, 12000);
    }

    // Clean the content
    fileContent = fileContent.replace(/[\r\n]+/g, '\n').trim();

    const systemPrompt = `You are a professional resume analyzer. Extract information from this resume and provide a response in the following JSON format:
{
  "personalInfo": {
    "name": "",
    "email": "",
    "phone": "",
    "location": "",
    "linkedin": ""
  },
  "summary": "",
  "experience": [
    {
      "title": "",
      "company": "",
      "startDate": "",
      "endDate": "",
      "description": "",
      "responsibilities": []
    }
  ],
  "education": [
    {
      "degree": "",
      "institution": "",
      "startDate": "",
      "endDate": "",
      "description": "",
      "achievements": []
    }
  ],
  "skills": [],
  "projects": [
    {
      "name": "",
      "technologies": "",
      "duration": "",
      "description": "",
      "highlights": []
    }
  ],
  "certifications": [
    {
      "name": "",
      "issuer": "",
      "date": "",
      "description": "",
      "details": []
    }
  ]
}`;

    console.log("Sending request to OpenAI...");

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: `Extract information from this resume into JSON format: \n\n${fileContent}`
        }
      ],
      temperature: 0.7,
      max_tokens: 2000
    });

    if (!completion.choices[0].message.content) {
      throw new Error("No content in OpenAI response");
    }

    // Extract JSON from response
    const content = completion.choices[0].message.content.trim();
    const jsonMatch = content.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error("No valid JSON found in response");
    }

    const parsedData = JSON.parse(jsonMatch[0]);

    console.log("Successfully parsed resume data");

    res.json(parsedData);
  } catch (error) {
    console.error("Error parsing resume:", error);

    // Send a more detailed error message
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ 
      error: "Failed to parse resume",
      details: errorMessage,
      message: "Please ensure your resume is in a supported format (PDF, DOC, DOCX, or TXT) and try again."
    });
  }
});

export default router;