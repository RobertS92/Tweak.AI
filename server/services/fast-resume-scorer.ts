import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function preprocessResume(content: string): string {
  return content
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * A fast version of resume analysis that only returns the score without enhancement
 * This is optimized for dashboard display where we just need the basic ATS score
 */
export async function fastScoreResume(content: string): Promise<number> {
  try {
    const processedContent = preprocessResume(content);
    
    console.log("[DEBUG] Fast scoring resume, length:", processedContent.length);

    // Use a smaller model with a focused prompt just for scoring
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo", // Using 3.5 for faster response and lower cost
      messages: [
        {
          role: "system",
          content: `You are an expert ATS (Applicant Tracking System) resume scorer. 
          Your only job is to evaluate how well a resume would perform in ATS systems.
          Return ONLY an integer score between 0-100 with no explanation or other text.`
        },
        {
          role: "user",
          content: `Resume Content:\n${processedContent}\n\nScore this resume on a scale of 0-100 based on ATS compatibility. Return ONLY the numeric score.`
        }
      ],
      temperature: 0.1, // Low temperature for consistency
      max_tokens: 10, // Very small response needed
    });

    // Import our validator utility
    const { ensureValidScore } = require('../utils/validators');
    
    // Extract just the score number
    const scoreText = response.choices[0].message.content?.trim() || "75";
    let score = parseInt(scoreText.replace(/\D/g, ''));
    
    // Use our common validation utility for consistency
    score = ensureValidScore(score, 75);
    
    // Additional range validation specific to ATS scores (0-100)
    if (score < 0) score = 0;
    if (score > 100) score = 100;
    
    console.log("[DEBUG] Fast resume scoring complete. Raw score:", scoreText, "Final score:", score);
    return score;
  } catch (error) {
    console.error("[ERROR] Fast resume scoring failed:", error);
    
    // Import our validator utility if not already imported
    const { ensureValidScore } = require('../utils/validators');
    
    // Use the default value from our validator (75)
    return ensureValidScore(null, 75);
  }
}