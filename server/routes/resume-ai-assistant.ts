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

    console.log("[DEBUG] Full section content:", sectionContent);

    // Enhanced system prompt for better section analysis
    const messages = [
      {
        role: "system",
        content: `You are a professional resume writing assistant helping to improve resume sections.
For sections with entries (like Work Experience, Education, Projects):
- Analyze each entry separately
- Suggest stronger action verbs and quantifiable achievements
- Point out missing important details
- Provide specific examples of improvements

For summary and skills sections:
- Suggest ways to make the content more impactful
- Recommend better organization and presentation
- Point out any missing key elements

Keep your feedback specific, actionable, and focused on the current section.
If no content is provided, ask for the information needed to provide feedback.`
      },
      {
        role: "user",
        content: `I'm working on the "${sectionId}" section of my resume. Here's the current content:

${sectionContent || "[No content provided]"}

${userQuery || "Please analyze this section and suggest specific improvements."}`
      }
    ];

    // Call OpenAI with more tokens for detailed analysis
    const completion = await openai.chat.completions.create({
      model: "gpt-4", // Using GPT-4 for better analysis
      messages: messages as any,
      temperature: 0.7,
      max_tokens: 1000,
    });

    // Extract AI's suggestions
    const suggestions = completion.choices[0]?.message?.content || "";

    console.log("[DEBUG] AI suggestions generated:", suggestions.substring(0, 100) + "...");

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