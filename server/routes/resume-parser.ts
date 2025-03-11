import OpenAI from "openai";
import { Router } from "express";
import multer from "multer";
import { promises as fs } from "fs";
import path from "path";

const router = Router();
const upload = multer({ dest: "uploads/" });

// Initialize OpenAI with API key
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

router.post("/api/ai-resume-parser", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // Read the file content
    const fileContent = await fs.readFile(req.file.path, "utf-8");

    // Clean up the uploaded file
    await fs.unlink(req.file.path);

    // Prepare the system prompt for GPT-4
    const prompt = `As a professional resume analyzer, extract and structure the following information from this resume. Format your response as JSON with the following structure:

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

Extract the information maintaining the exact structure. For dates, use consistent formatting. For missing information, use empty strings or arrays.`;

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: prompt },
        { role: "user", content: fileContent }
      ],
      response_format: { type: "json_object" }
    });

    if (!completion.choices[0].message.content) {
      throw new Error("No content in OpenAI response");
    }

    // Parse the response
    const parsedData = JSON.parse(completion.choices[0].message.content);

    // Send structured response
    res.json(parsedData);
  } catch (error) {
    console.error("Error parsing resume:", error);
    res.status(500).json({ 
      error: "Failed to parse resume", 
      details: error instanceof Error ? error.message : "Unknown error" 
    });
  }
});

export default router;