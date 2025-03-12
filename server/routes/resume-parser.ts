          import { Router } from "express";
          import multer from "multer";
          import { fileTypeFromBuffer } from "file-type";
          import pdfParse from "pdf-parse-fork";
          import mammoth from "mammoth";
          import OpenAI from "openai";

          const router = Router();

          /** 1. Multer setup */
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
                cb(new Error("Invalid file type. Only PDF, DOC, DOCX, and TXT allowed."));
              }
            },
          });

          /** 2. Initialize OpenAI */
          const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
          });

          /** 3. Resume parsing route */
          router.post("/api/resume-parser", upload.single("file"), async (req, res) => {
            try {
              if (!req.file) {
                return res.status(400).json({ error: "No file uploaded" });
              }

              console.log("[DEBUG] Processing file:", {
                name: req.file.originalname,
                type: req.file.mimetype,
                size: req.file.size
              });

              // Extract text content
              let fileContent = "";
              try {
                const buffer = req.file.buffer;
                const fileType = await fileTypeFromBuffer(buffer);
                const mime = fileType?.mime || req.file.mimetype;

                console.log("[DEBUG] Detected file type:", mime);

                if (mime === "application/pdf") {
                  const pdfData = await pdfParse(buffer, {
                    // Enhanced PDF text extraction
                    pagerender: function(pageData) {
                      return pageData.getTextContent().then(function(textContent) {
                        let lastY, text = '';
                        for (const item of textContent.items) {
                          if (lastY != item.transform[5] && text) {
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
                  const result = await mammoth.extractRawText({ buffer });
                  fileContent = result.value;
                } else {
                  fileContent = buffer.toString('utf8');
                }

                // Clean and normalize text while preserving section breaks
                fileContent = fileContent
                  .replace(/[\r\n]{3,}/g, '\n\n') // Normalize multiple line breaks
                  .replace(/[^\x20-\x7E\n]/g, '') // Remove non-printable characters
                  .replace(/\s+/g, ' ') // Normalize spaces
                  .trim();

                console.log("[DEBUG] Extracted content length:", fileContent.length);

              } catch (error) {
                console.error("[DEBUG] Text extraction error:", error);
                throw new Error(`Failed to extract text: ${error.message}`);
              }

              // Parse with OpenAI
              console.log("[DEBUG] Calling OpenAI...");
              const completion = await openai.chat.completions.create({
                model: "gpt-3.5-turbo",
                messages: [
                  {
                    role: "system",
                    content: `You are a resume parser that excels at identifying and extracting structured information from resumes.
          - Extract ALL information you can find, even if sections are incomplete
          - For education, work experience, and projects, create entries even with partial information
          - Preserve original text formatting and bullet points
          - If a field is truly empty, use an empty string instead of omitting it`
                  },
                  {
                    role: "user",
                    content: `Parse this resume into JSON, preserving ALL information you can find, even if incomplete:

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
                    "title": "",      // Job title, if found
                    "subtitle": "",   // Company/organization name
                    "date": "",      // Any date or date range found
                    "description": "", // Any role description found
                    "bullets": []    // Any bullet points or achievements
                  }
                ]
              },
              {
                "id": "education",
                "title": "Education",
                "items": [
                  {
                    "title": "",      // Degree or program name
                    "subtitle": "",   // School/institution name
                    "date": "",      // Dates if available
                    "description": "", // Any additional details
                    "bullets": []    // Relevant courses, achievements
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
                    "title": "",      // Project name
                    "subtitle": "",   // Technologies/tools used
                    "date": "",      // Timeline if available
                    "description": "", // Project description
                    "bullets": []    // Key features or achievements
                  }
                ]
              },
              {
                "id": "certifications",
                "title": "Certifications",
                "items": [
                  {
                    "title": "",      // Certification name
                    "subtitle": "",   // Issuing organization
                    "date": "",      // Date if available
                    "description": "", // Additional details
                    "bullets": []    // Related achievements
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
                max_tokens: 2500,
                response_format: { type: "json_object" }
              });

              // Parse and validate response
              const responseText = completion.choices[0]?.message?.content;
              if (!responseText) {
                throw new Error("Empty response from OpenAI");
              }

              console.log("[DEBUG] Parsing OpenAI response");
              let parsedData;
              try {
                parsedData = JSON.parse(responseText);
              } catch (error) {
                console.error("[DEBUG] JSON parse error:", error);
                throw new Error("Failed to parse OpenAI response");
              }

              // Validate structure
              if (!parsedData.sections || !Array.isArray(parsedData.sections)) {
                throw new Error("Invalid response structure");
              }

              // Sanitize output while preserving partial data
              const sanitizedData = {
                name: parsedData.name || "",
                email: parsedData.email || "",
                phone: parsedData.phone || "",
                location: parsedData.location || "",
                linkedin: parsedData.linkedin || "",
                sections: parsedData.sections.map(section => {
                  // Base section data
                  const sectionData = {
                    id: section.id || "",
                    title: section.title || "",
                    content: section.content || ""
                  };

                  // Handle items if present
                  if (section.items && Array.isArray(section.items)) {
                    return
