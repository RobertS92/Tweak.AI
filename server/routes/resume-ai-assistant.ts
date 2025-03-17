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
      return `Your Professional Summary section is empty. Here's how to write an effective summary:
• Start with your years of experience and primary field
• Highlight 2-3 key achievements or specialties
• Mention your most relevant skills and technologies
• Include your career goals or what you're seeking
• Keep it between 3-5 sentences

Example: "Results-driven software engineer with 5 years of experience in full-stack development..."`;

    case "work-experience":
      return `Your Work Experience section is empty. For each position, include:
• Job title and company name
• Employment dates (MM/YYYY - MM/YYYY)
• 3-5 bullet points of key responsibilities
• Quantifiable achievements (e.g., "Increased efficiency by 25%")
• Technologies and tools used
• Team size and project scope where relevant

Start with your most recent position and work backwards.`;

    case "education":
      return `Your Education section is empty. Include the following for each entry:
• Degree name and major
• Institution name and location
• Graduation date or expected date
• GPA (if 3.5 or above)
• Relevant coursework
• Academic honors or achievements
• Any research projects or thesis work

List your highest level of education first.`;

    case "skills":
      return `Your Skills section is empty. Organize your skills into categories:
• Technical Skills: Programming languages, frameworks, tools
• Domain Knowledge: Industry-specific expertise
• Soft Skills: Leadership, communication, problem-solving
• Certifications: Include relevant technical certifications
• Languages: List any language proficiencies

Focus on skills most relevant to your target roles.`;

    case "projects":
      return `Your Projects section is empty. For each project, include:
• Project name and timeframe
• Your role and team size
• Technologies and tools used
• Problem solved or project purpose
• Key features implemented
• Measurable outcomes or impact
• Links to live demos or repositories

Choose 2-4 projects that showcase different skills.`;

    case "certifications":
      return `Your Certifications section is empty. For each certification:
• Certification name
• Issuing organization
• Date earned and expiration (if applicable)
• Credential ID or verification link
• Relevant skills demonstrated
• Version or level (if applicable)

List most relevant or recent certifications first.`;

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
