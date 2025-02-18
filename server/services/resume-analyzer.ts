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
    keywordDensity: categoryResponseSchema.extend({
      identifiedKeywords: z.array(z.string())
    }),
    roleAlignment: categoryResponseSchema,
    recruiterFriendliness: categoryResponseSchema,
    conciseness: categoryResponseSchema
  }),
  improvements: z.array(z.string()),
  formattingFixes: z.array(z.string()),
  overallScore: z.number()
});

function preprocessResume(content: string): string {
  return content
    .replace(/\r\n/g, '\n')
    .replace(/[^\w\s,.!?:;()-]/g, ' ') // Keep only basic punctuation
    .replace(/\s+/g, ' ')
    .trim();
}

function extractRelevantSections(content: string): string {
  const sections = content.split(/\n{2,}/);
  const relevantContent = sections
    .slice(0, Math.min(sections.length, 10))
    .join('\n\n');
  return relevantContent;
}

export async function analyzeResume(content: string) {
  try {
    const processedContent = preprocessResume(content);
    const relevantContent = extractRelevantSections(processedContent);

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

            For each category, provide:
            - A score (0-100)
            - 2-3 specific feedback points
            - A brief description of what the category measures

            Additionally:
            - For Keyword Density, identify the key industry/role-specific keywords found
            - List specific improvements that could enhance the resume
            - List any formatting fixes needed

            Return JSON matching this structure:
            {
              "categoryScores": {
                "atsCompliance": { "score": number, "feedback": string[], "description": string },
                "keywordDensity": { "score": number, "feedback": string[], "description": string, "identifiedKeywords": string[] },
                "roleAlignment": { "score": number, "feedback": string[], "description": string },
                "recruiterFriendliness": { "score": number, "feedback": string[], "description": string },
                "conciseness": { "score": number, "feedback": string[], "description": string }
              },
              "improvements": string[],
              "formattingFixes": string[],
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