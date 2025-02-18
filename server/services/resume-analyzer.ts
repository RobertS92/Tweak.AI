import OpenAI from "openai";
import { z } from "zod";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const categoryResponseSchema = z.object({
  score: z.number(),
  feedback: z.array(z.string()),
  description: z.string()
});

const analysisResponseSchema = z.object({
  categoryScores: z.object({
    atsCompliance: categoryResponseSchema,
    keywordDensity: categoryResponseSchema,
    roleAlignment: categoryResponseSchema,
    recruiterFriendliness: categoryResponseSchema,
    conciseness: categoryResponseSchema
  }),
  overallScore: z.number()
});

function preprocessResume(content: string): string {
  // Remove extra whitespace, normalize line endings, and remove special characters
  return content
    .replace(/\r\n/g, '\n')
    .replace(/[^\w\s,.!?:;()-]/g, ' ') // Keep only basic punctuation
    .replace(/\s+/g, ' ')
    .trim();
}

function extractRelevantSections(content: string): string {
  // Get the most important sections of the resume
  const sections = content.split(/\n{2,}/);
  const relevantContent = sections
    .slice(0, Math.min(sections.length, 10)) // Take first 10 sections
    .join('\n\n');
  return relevantContent;
}

export async function analyzeResume(content: string) {
  try {
    // Preprocess and extract relevant content
    const processedContent = preprocessResume(content);
    const relevantContent = extractRelevantSections(processedContent);

    // Analyze the resume content
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an expert resume analyzer. Analyze this resume and provide detailed feedback in these categories:
            1. ATS Compliance: Check formatting, standard sections, and machine readability
            2. Keyword Density: Analyze relevant industry/role keywords and their usage
            3. Role Alignment: Evaluate how well experience matches common job requirements
            4. Recruiter-Friendliness: Assess readability, clarity, and professional presentation
            5. Conciseness & Impact: Review brevity and effectiveness of descriptions

            Provide scores (0-100) and 2-3 specific feedback points for each category.
            Return JSON matching this structure:
            {
              "categoryScores": {
                "atsCompliance": { "score": number, "feedback": string[], "description": string },
                "keywordDensity": { "score": number, "feedback": string[], "description": string },
                "roleAlignment": { "score": number, "feedback": string[], "description": string },
                "recruiterFriendliness": { "score": number, "feedback": string[], "description": string },
                "conciseness": { "score": number, "feedback": string[], "description": string }
              },
              "overallScore": number
            }`
        },
        {
          role: "user",
          content: relevantContent
        }
      ],
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    const validatedResult = analysisResponseSchema.parse(result);

    return validatedResult;
  } catch (error) {
    console.error('Resume analysis failed:', error);
    throw new Error('Failed to analyze resume');
  }
}