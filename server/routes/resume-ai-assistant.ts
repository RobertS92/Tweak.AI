import { Router } from "express";
import OpenAI from "openai";

const router = Router();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

router.post("/api/resume-ai-assistant", async (req, res) => {
  try {
    const { sectionId, sectionContent, userQuery } = req.body;

    console.log("[DEBUG] AI Assistant request:", {
      sectionId,
      contentLength: sectionContent?.length,
      userQuery
    });

    const messages = [
      {
        role: "system",
        content: "You are an AI resume assistant helping improve resume content. Provide specific, actionable suggestions to enhance the selected section. Be constructive and professional."
      },
      {
        role: "user",
        content: `I'm working on the "${sectionId}" section of my resume. Here's the current content:

${sectionContent}

${userQuery ? `User request: ${userQuery}` : "Please suggest improvements for this section."}`
      }
    ];

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages,
      temperature: 0.7,
      max_tokens: 500
    });

    const suggestions = completion.choices[0].message.content;
    console.log("[DEBUG] AI suggestions generated");

    res.json({
      suggestions,
      improvements: [] // For future enhancement buttons
    });

  } catch (error) {
    console.error("[DEBUG] AI Assistant error:", error);
    res.status(500).json({
      error: "Failed to get AI suggestions",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

export default router;
