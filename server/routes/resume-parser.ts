import OpenAI from "openai";
import { Router } from "express";
import multer from "multer";
import { promises as fs } from "fs";
import path from "path";

const router = Router();
const upload = multer({ dest: "uploads/" });

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

    // Prepare the prompt with structured output format
    const systemPrompt = `You are a professional resume analyzer. Extract information from the resume and structure it exactly as follows:
- Personal Information: name, email, phone, location, linkedin URL
- Professional Summary: brief overview
- Work Experience: for each position include title, company, dates, description, and key responsibilities
- Education: degree, institution, dates, and achievements
- Skills: list of technical and professional skills
- Projects: name, technologies used, duration, description, and key highlights
- Certifications: name, issuer, date, and details

Format the output exactly like this example:
{
  "personalInfo": {
    "name": "John Smith",
    "email": "john@example.com",
    "phone": "123-456-7890",
    "location": "New York, NY",
    "linkedin": "linkedin.com/in/johnsmith"
  },
  "summary": "Experienced software engineer...",
  "experience": [
    {
      "title": "Senior Developer",
      "company": "Tech Co",
      "startDate": "2020-01",
      "endDate": "Present",
      "description": "Led development...",
      "responsibilities": ["Led team of 5", "Improved performance by 50%"]
    }
  ]
}`;

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Parse this resume:\n\n${fileContent}` }
      ],
      temperature: 0.7,
      max_tokens: 2000
    });

    if (!completion.choices[0].message.content) {
      throw new Error("No content in OpenAI response");
    }

    // Parse the response to ensure it's valid JSON
    const responseText = completion.choices[0].message.content.trim();
    const jsonStartIndex = responseText.indexOf('{');
    const jsonEndIndex = responseText.lastIndexOf('}') + 1;
    const jsonContent = responseText.slice(jsonStartIndex, jsonEndIndex);

    const parsedData = JSON.parse(jsonContent);

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