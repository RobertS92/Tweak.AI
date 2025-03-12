import { Router } from "express";
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const router = Router();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

router.post("/api/resume-ai-assistant", async (req, res) => {
  try {
    const { sectionId, sectionContent, userQuery } = req.body || {};

    console.log("[DEBUG] AI Assistant request:", {
      sectionId,
      contentLength: sectionContent?.length,
      userQuery,
    });

    console.log("[DEBUG] Full section content:", sectionContent);

    const messages = [
      {
        role: "system",
        content: `You are a professional resume writing assistant. Your task is to analyze resume content and provide specific, actionable feedback.

When analyzing work experience:
- Check each position's description for impact and clarity
- Suggest stronger action verbs and quantifiable achievements
- Identify missing key details (responsibilities, results, technologies used)
- Provide specific examples of how to improve each bullet point

When analyzing education:
- Verify degree information is clear and complete
- Suggest relevant coursework or achievements to highlight
- Recommend academic accomplishments to include

When analyzing projects:
- Ensure technical details and impact are clear
- Suggest ways to better highlight skills and technologies
- Recommend improvements to project descriptions

Provide specific, actionable feedback for the exact content provided.
If the section is empty, ask for the basic information needed.`
      },
      {
        role: "user",
        content: `I'm working on the "${sectionId}" section of my resume. Here's the current content:

${sectionContent || "[No content provided]"}

${userQuery || "Please analyze this section and suggest specific improvements."}`
      }
    ];

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: messages as any,
      temperature: 0.7,
      max_tokens: 1000,
    });

    const suggestions = completion.choices[0]?.message?.content || "";

    console.log("[DEBUG] AI suggestions generated:", suggestions.substring(0, 100) + "...");

    return res.json({
      suggestions,
      improvements: []
    });
  } catch (error) {
    console.error("[DEBUG] AI Assistant error:", error);
    return res.status(500).json({
      error: "Failed to get AI suggestions",
      details: error instanceof Error ? error.message : String(error),
    });
  } finally {
    console.log("[DEBUG] AI Assistant request completed for section:", req.body?.sectionId || "unknown");
  }
});

export { router as default };