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

    // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a resume parser. Extract information from the resume text and format it as JSON. Follow these rules:
1. All fields must be present in the output, use empty strings or arrays for missing data
2. Dates should be in YYYY-MM format or "Present"
3. The output must be strictly valid JSON with no additional text
4. Make sure to extract full text content for each section
5. Include all achievements and bullet points`
        },
        {
          role: "user",
          content: `Parse this resume text and return a JSON object in this exact format:
{
  "personalInfo": {
    "name": "Full name",
    "email": "Email",
    "phone": "Phone",
    "location": "Location",
    "linkedin": "LinkedIn URL"
  },
  "summary": "Full professional summary text",
  "experience": [{
    "title": "Job title",
    "company": "Company name",
    "startDate": "YYYY-MM",
    "endDate": "YYYY-MM or Present",
    "description": "Full role description",
    "responsibilities": ["Detailed achievement 1", "Detailed achievement 2"]
  }],
  "education": [{
    "degree": "Degree name",
    "institution": "School name",
    "startDate": "YYYY-MM",
    "endDate": "YYYY-MM",
    "description": "Program description",
    "achievements": ["Achievement or detail 1", "Achievement or detail 2"]
  }],
  "skills": ["Skill 1", "Skill 2"],
  "projects": [{
    "name": "Project name",
    "technologies": "Tech stack used",
    "duration": "Time period",
    "description": "Project details",
    "highlights": ["Key achievement 1", "Key achievement 2"]
  }],
  "certifications": [{
    "name": "Certification name",
    "issuer": "Issuing organization",
    "date": "YYYY-MM",
    "description": "Certification details",
    "details": ["Additional detail 1", "Additional detail 2"]
  }]
}

Here's the resume text to parse:\n\n${fileContent}`
        }
      ],
      temperature: 0.1,
      max_tokens: 2048
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

    // Verify the data structure
    if (!parsedData.personalInfo || !parsedData.experience || !parsedData.education) {
      throw new Error("Invalid data structure in parsed response");
    }

    // Transform the data to match the frontend's exact expected format
    const transformedData = {
      ...parsedData.personalInfo,
      sections: [
        {
          id: "summary",
          title: "Professional Summary",
          content: parsedData.summary || "",
          items: undefined
        },
        {
          id: "experience",
          title: "Work Experience",
          items: (parsedData.experience || []).map(exp => ({
            title: exp.title || "",
            subtitle: exp.company || "",
            date: `${exp.startDate || ""} - ${exp.endDate || "Present"}`,
            description: exp.description || "",
            bullets: exp.responsibilities || []
          }))
        },
        {
          id: "education",
          title: "Education",
          items: (parsedData.education || []).map(edu => ({
            title: edu.degree || "",
            subtitle: edu.institution || "",
            date: `${edu.startDate || ""} - ${edu.endDate || ""}`,
            description: edu.description || "",
            bullets: edu.achievements || []
          }))
        },
        {
          id: "skills",
          title: "Skills",
          content: Array.isArray(parsedData.skills) ? parsedData.skills.join(", ") : "",
          items: undefined
        },
        {
          id: "projects",
          title: "Projects",
          items: (parsedData.projects || []).map(proj => ({
            title: proj.name || "",
            subtitle: proj.technologies || "",
            date: proj.duration || "",
            description: proj.description || "",
            bullets: proj.highlights || []
          }))
        },
        {
          id: "certifications",
          title: "Certifications",
          items: (parsedData.certifications || []).map(cert => ({
            title: cert.name || "",
            subtitle: cert.issuer || "",
            date: cert.date || "",
            description: cert.description || "",
            bullets: cert.details || []
          }))
        }
      ]
    };

    console.log("Successfully transformed data for frontend");
    res.json(transformedData);

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