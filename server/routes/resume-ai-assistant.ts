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

    // Compose conversation messages
    const messages = [
      {
        role: "system",
        content:
          "You are an AI resume assistant helping improve or rewrite resume sections. " +
          "Provide specific, actionable suggestions or rewrites. Be constructive and professional.",
      },
      {
        role: "user",
        content: `I'm working on the "${sectionId}" section of my resume. Here is the current content:

${sectionContent}

${userQuery ? `User request: ${userQuery}` : "Please suggest improvements for this section."}`,
      },
    ];

    // Call OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4", // or "gpt-3.5-turbo" if preferred
      messages,
      temperature: 0.7,
      max_tokens: 500,
    });

    // Extract AI's suggestions
    const suggestions = completion.choices[0]?.message?.content || "";

    console.log("[DEBUG] AI suggestions generated");

    // Send suggestions back as JSON
    return res.json({
      suggestions,
      improvements: [], // you can add more structured data here
    });
  } catch (error) {
    console.error("[DEBUG] AI Assistant error:", error);
    return res.status(500).json({
      error: "Failed to get AI suggestions",
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

export default router;