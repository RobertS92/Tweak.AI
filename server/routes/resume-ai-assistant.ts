import { Router } from "express";
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const router = Router();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

    // Validate input
    if (!sectionContent) {
      console.log("[DEBUG] Missing section content");
      return res.status(400).json({
        error: "No content provided",
        details: "Please provide content to analyze"
      });
    }

    console.log("[DEBUG] Processing section:", sectionId);
    console.log("[DEBUG] Content sample:", sectionContent.substring(0, 100) + "...");

    const messages = [
      {
        role: "system",
        content: `You are a professional resume writing assistant. Analyze the content and provide clear, actionable feedback.

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

Format your response in a clear, readable way:
• Use bullet points for suggestions
• Include specific examples
• Group related recommendations
• Make it easy to copy and implement changes

If a section is empty, provide clear guidance on what information to include.`
      },
      {
        role: "user",
        content: `I'm working on the "${sectionId}" section of my resume. Here's the current content:

${sectionContent || "[No content provided]"}

${userQuery || "Please analyze this section and suggest specific improvements."}`
      }
    ];

    console.log("[DEBUG] Sending request to OpenAI");

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: messages as any,
      temperature: 0.7,
      max_tokens: 1000,
    });

    const suggestions = completion.choices[0]?.message?.content || "";

    console.log("[DEBUG] AI Response received:", {
      length: suggestions.length,
      sample: suggestions.substring(0, 100) + "..."
    });

    const formattedSuggestions = suggestions.split('\n').map(line => {
      if (line.startsWith('•')) {
        return `<li>${line.substring(1).trim()}</li>`;
      }
      if (line.trim().endsWith(':')) {
        return `<h3>${line.trim()}</h3>`;
      }
      return `<p>${line}</p>`;
    }).join('\n');

    return res.json({
      suggestions: formattedSuggestions,
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