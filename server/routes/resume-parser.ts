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
  limits: { fileSize: 20 * 1024 * 1024 }, // Increased to 20MB
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

    // Truncate content if too long (increased limit)
    if (fileContent.length > 20000) {
      fileContent = fileContent.substring(0, 20000);
      console.log("Content truncated to 20000 characters");
    }

    console.log("Calling OpenAI API...");

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are a resume content extractor. Extract the exact text content from the resume into specified fields. Keep original text, don't modify content."
        },
        {
          role: "user",
          content: `Extract resume content into these fields, preserving exact text:

1. Basic Info:
- Full name
- Email address
- Phone number
- Location
- LinkedIn URL

2. Sections:
- Professional Summary (full paragraph)
- Work Experience (each position with title, company, dates, and bullet points)
- Education (each entry with degree, school, dates)
- Skills (complete list)
- Projects (each with name, technologies, dates, description)
- Certifications (each with name, issuer, date)

Resume text:
${fileContent}`
        }
      ],
      temperature: 0.1,
      max_tokens: 4000
    });

    if (!completion.choices[0].message.content) {
      throw new Error("No content in OpenAI response");
    }

    console.log("OpenAI response received, parsing response...");
    const response = completion.choices[0].message.content;

    // Structure the form data
    const formData = {
      name: extractField(response, "Full name:"),
      email: extractField(response, "Email:"),
      phone: extractField(response, "Phone:"),
      location: extractField(response, "Location:"),
      linkedin: extractField(response, "LinkedIn:"),
      sections: [
        {
          id: "summary",
          title: "Professional Summary",
          content: extractSection(response, "Professional Summary"),
        },
        {
          id: "experience",
          title: "Work Experience",
          items: extractWorkExperience(response),
        },
        {
          id: "education",
          title: "Education",
          items: extractEducation(response),
        },
        {
          id: "skills",
          title: "Skills",
          content: extractSection(response, "Skills"),
        },
        {
          id: "projects",
          title: "Projects",
          items: extractProjects(response),
        },
        {
          id: "certifications",
          title: "Certifications",
          items: extractCertifications(response),
        }
      ]
    };

    console.log("Successfully structured resume data");
    res.json(formData);

  } catch (error) {
    console.error("Resume parsing error:", error);
    res.status(500).json({
      error: "Failed to parse resume",
      details: error instanceof Error ? error.message : "Unknown error",
      message: "Please try again or enter details manually."
    });
  }
});

// Helper functions to extract content
function extractField(text: string, field: string): string {
  const regex = new RegExp(`${field}\\s*(.+)`, 'i');
  const match = text.match(regex);
  return match ? match[1].trim() : "";
}

function extractSection(text: string, section: string): string {
  const regex = new RegExp(`${section}:?\\s*([\\s\\S]*?)(?=\\n\\s*[A-Z][A-Za-z\\s]+:|$)`, 'i');
  const match = text.match(regex);
  return match ? match[1].trim() : "";
}

function extractWorkExperience(text: string): any[] {
  const experienceSection = extractSection(text, "Work Experience");
  const experiences = experienceSection.split(/\n(?=[A-Z][^a-z]*\n|$)/);

  return experiences.map(exp => {
    const lines = exp.split('\n').filter(line => line.trim());
    return {
      title: lines[0] || "",
      subtitle: lines[1] || "",
      date: lines[2] || "",
      description: lines[3] || "",
      bullets: lines.slice(4).map(line => line.trim()).filter(line => line)
    };
  }).filter(exp => exp.title || exp.subtitle);
}

function extractEducation(text: string): any[] {
  const educationSection = extractSection(text, "Education");
  const education = educationSection.split(/\n(?=[A-Z][^a-z]*\n|$)/);

  return education.map(edu => {
    const lines = edu.split('\n').filter(line => line.trim());
    return {
      title: lines[0] || "",
      subtitle: lines[1] || "",
      date: lines[2] || "",
      description: lines[3] || "",
      bullets: lines.slice(4).map(line => line.trim()).filter(line => line)
    };
  }).filter(edu => edu.title || edu.subtitle);
}

function extractProjects(text: string): any[] {
  const projectsSection = extractSection(text, "Projects");
  const projects = projectsSection.split(/\n(?=[A-Z][^a-z]*\n|$)/);

  return projects.map(proj => {
    const lines = proj.split('\n').filter(line => line.trim());
    return {
      title: lines[0] || "",
      subtitle: lines[1] || "",
      date: lines[2] || "",
      description: lines[3] || "",
      bullets: lines.slice(4).map(line => line.trim()).filter(line => line)
    };
  }).filter(proj => proj.title || proj.subtitle);
}

function extractCertifications(text: string): any[] {
  const certificationsSection = extractSection(text, "Certifications");
  const certifications = certificationsSection.split(/\n(?=[A-Z][^a-z]*\n|$)/);

  return certifications.map(cert => {
    const lines = cert.split('\n').filter(line => line.trim());
    return {
      title: lines[0] || "",
      subtitle: lines[1] || "",
      date: lines[2] || "",
      description: lines[3] || "",
      bullets: lines.slice(4).map(line => line.trim()).filter(line => line)
    };
  }).filter(cert => cert.title || cert.subtitle);
}

export default router;