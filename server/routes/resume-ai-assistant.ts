import { Router } from "express";
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const router = Router();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Helper function: returns a fallback message based on section id.
function getFallbackMessage(sectionId: string): string {
  switch (sectionId) {
    case "professional-summary":
      return "No professional summary provided. Please include a brief overview of your skills, experience, and career goals.";
    case "work-experience":
      return "No work experience details provided. Please include your job title, company, employment dates (month and year), responsibilities, and achievements.";
    case "education":
      return "No education details provided. Please include your degree, institution, dates (month and year), and any relevant coursework or honors.";
    case "skills":
      return "No skills listed. Please include both technical and soft skills relevant to your career.";
    case "projects":
      return "No project details provided. Please include the project name, description, technologies used, and key achievements.";
    case "certifications":
      return "No certifications provided. Please include the certification name, issuing organization, and dates.";
    default:
      return "[No content provided]";
  }
}

router.post("/resume-ai-assistant", async (req, res) => {
  let sectionId = "unknown";
  console.log("[DEBUG] Starting AI assistant request processing");

  try {
    const {
      sectionId: incomingSectionId,
      sectionContent,
      userQuery,
    } = req.body || {};

    sectionId = incomingSectionId || "unknown";

    console.log("[DEBUG] AI Assistant request details:", {
      sectionId,
      contentLength: sectionContent?.length,
      userQuery,
    });

    // Use the provided section content if it exists; otherwise, use the fallback message.
    const effectiveSectionContent =
      sectionContent && sectionContent.trim().length > 0
        ? sectionContent
        : getFallbackMessage(sectionId);

    console.log("[DEBUG] Processing section:", sectionId);
    console.log(
      "[DEBUG] Content sample:",
      effectiveSectionContent.substring(0, 100) + "..."
    );

    const messages = [
      {
        role: "system",
        content: `You are a professional resume writing assistant. Your task is to produce a final revised version of the given resume section.

When analyzing work experience:
- Check impact and clarity of descriptions
- Suggest stronger action verbs and quantifiable achievements
- Identify missing key details (responsibilities, results, technologies)
- Provide specific examples of improvements

When analyzing education:
- Verify degree information completeness
- Suggest relevant coursework to highlight
- Recommend academic achievements to include

When analyzing technical sections:
- Ensure skills are clearly presented
- Suggest industry-standard formatting
- Recommend relevant certifications

If the section is empty, provide clear guidance on what information to include based on its category.

Return your response as plain text (no HTML or markdown tags) in the following exact format:

Revised Version:
"[Your revised text here]"

The revised version must be written as a coherent, professionally formatted paragraph exactly as it should appear on the resume so that the user can copy and paste it directly.`
      },
      {
        role: "user",
        content: `I'm working on the "${sectionId}" section of my resume. Here's the current content:

${effectiveSectionContent}

${userQuery || "Please produce a revised version for this section."}`
      }
    ];

    console.log("[DEBUG] Sending request to OpenAI");

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: messages as any,
      temperature: 0.7,
      max_tokens: 1500,
    });

    const aiResponse = completion.choices[0]?.message?.content || "";
    console.log("[DEBUG] AI Response received:", {
      length: aiResponse.length,
      sample: aiResponse.substring(0, 100) + "..."
    });

    // Extract the revised version by removing the marker if present.
    // Expected format: Revised Version: "[Your revised text here]"
    const marker = "Revised Version:";
    let revisedText = aiResponse;
    const markerIndex = aiResponse.indexOf(marker);
    if (markerIndex !== -1) {
      revisedText = aiResponse.substring(markerIndex + marker.length).trim();
      // Remove surrounding quotes if present.
      revisedText = revisedText.replace(/^"|"$/g, "");
    }

    return res.json({
      revision: revisedText,
      improvements: [],
    });
  } catch (error) {
    console.error("[DEBUG] AI Assistant error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[DEBUG] Error details:", errorMessage);
    return res.status(500).json({
      error: "Failed to get AI suggestions",
      details: errorMessage,
    });
  } finally {
    console.log("[DEBUG] AI Assistant request completed for section:", sectionId);
  }
});

export { router as default };
