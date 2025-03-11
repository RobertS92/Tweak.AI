import { Router } from "express";
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const router = Router();

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Define the /api/resume-ai-assistant route
router.post("/api/resume-ai-assistant", async (req, res) => {
  try {
    const { sectionId, sectionContent, userQuery } = req.body || {};

    console.log("[DEBUG] AI Assistant request:", {
      sectionId,
      contentLength: sectionContent?.length,
      userQuery,
    });

    // Enhanced system prompt for better section analysis
    const messages = [
      {
        role: "system",
        content: `You are a professional resume writing assistant. Analyze resume sections and provide specific, actionable feedback.
For work experience entries:
- Suggest stronger action verbs
- Recommend quantifiable achievements
- Point out missing important details
For education entries:
- Suggest relevant coursework to highlight
- Recommend academic achievements to include
For all sections:
- Be specific about what to improve
- Provide example improvements
- Keep suggestions concise and actionable`,
      },
      {
        role: "user",
        content: `I'm working on the "${sectionId}" section of my resume. Here's the current content:

${sectionContent}

${userQuery || "Please analyze this section and suggest specific improvements."}`
      }
    ];

    // Call OpenAI with more tokens for detailed analysis
    const completion = await openai.chat.completions.create({
      model: "gpt-4", // Using GPT-4 for better analysis
      messages: messages as any, // Type assertion to fix TypeScript error
      temperature: 0.7,
      max_tokens: 800,
    });

    // Extract AI's suggestions
    const suggestions = completion.choices[0]?.message?.content || "";

    console.log("[DEBUG] AI suggestions generated");

    // Send suggestions back as JSON
    return res.json({
      suggestions,
      improvements: [], // For future structured improvements
    });
  } catch (error) {
    console.error("[DEBUG] AI Assistant error:", error);
    return res.status(500).json({
      error: "Failed to get AI suggestions",
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

export { router as default };