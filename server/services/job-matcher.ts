import OpenAI from "openai";
import { z } from "zod";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const matchResponseSchema = z.object({
  matchScore: z.number(),
  missingKeywords: z.array(z.string()),
  suggestedEdits: z.array(z.string()),
  analysis: z.object({
    strengthMatches: z.array(z.string()),
    gapAreas: z.array(z.string()),
    recommendedAdditions: z.array(z.string())
  })
});

export async function matchJob(resumeContent: string, jobDescription: string) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: `You are an expert resume matcher. Analyze the resume against the job description and provide detailed matching analysis.

Analyze:
1. Match Score: Calculate overall match percentage (0-100)
2. Required Skills/Keywords: Identify missing key requirements
3. Experience Alignment: Compare experience level and relevance
4. Suggested Improvements: Specific ways to better align with the role

Return response in this exact JSON structure:
{
  "matchScore": number,
  "missingKeywords": string[],
  "suggestedEdits": string[],
  "analysis": {
    "strengthMatches": string[],
    "gapAreas": string[],
    "recommendedAdditions": string[]
  }
}`
        },
        {
          role: "user",
          content: `Resume Content:\n${resumeContent}\n\nJob Description:\n${jobDescription}`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    const validatedResult = matchResponseSchema.parse(result);

    return validatedResult;
  } catch (error) {
    console.error("Job matching analysis failed:", error);
    if (error instanceof z.ZodError) {
      console.error("Validation error:", error.errors);
    }
    throw new Error("Failed to analyze job match");
  }
}
