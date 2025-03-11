import { Router } from "express";
import OpenAI from "openai";

const router = Router();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * POST /api/resume-ai-assistant
 * Expects JSON body: { sectionId: string, sectionContent: string, userQuery?: string }
 */
router.post("/api/resume-ai-assistant", async (req, res) => {
  try {
    const { sectionId, sectionContent, userQuery } = req.body || {};

    console.log("[DEBUG] AI Assistant request:", {
      sectionId,
      contentLength: sectionContent?.length,
      userQuery
    });

    // Compose conversation
    const messages = [
      {
        role: "system",
        content:
          "You are an AI resume assistant helping improve or rewrite resume sections. " +
          "Provide specific, actionable suggestions or rewrites. Be constructive and professional."
      },
      {
        role: "user",
        content: `I'm working on the "${sectionId}" section of my resume. Here is the current content:

${sectionContent}

${userQuery ? `User request: ${userQuery}` : "Please suggest improvements for this section."}`
      }
    ];

    // Call the OpenAI Chat Completion (using GPT-4)
    const completion = await openai.chat.completions.create({
      model: "gpt-4", // or "gpt-3.5-turbo" if you want faster/cheaper
      messages,
      temperature: 0.7,
      max_tokens: 500
    });

    // Extract the AI's suggestions from the first choice
    const suggestions = completion.choices[0]?.message?.content || "";

    console.log("[DEBUG] AI suggestions generated");
    res.json({
      suggestions,
      // You can store more structured data here if you want
      improvements: []
    });

  } catch (error) {
    console.error("[DEBUG] AI Assistant error:", error);
    res.status(500).json({
      error: "Failed to get AI suggestions",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;
