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
    recruiterFriendliness: categoryResponseSchema,
    conciseness: categoryResponseSchema
  }),
  improvements: z.array(z.string()),
  formattingFixes: z.array(z.string()),
  enhancedContent: z.string(),
  overallScore: z.number()
});

function preprocessResume(content: string): string {
  return content
    .replace(/\r\n/g, '\n')
    .replace(/[^\w\s,.!?:;()-]/g, ' ')
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
          content: `You are an expert resume analyzer and enhancer. Analyze this resume in detail and provide comprehensive feedback and improvements.

            Analyze these categories:
            1. ATS Compliance: Check formatting, standard sections, and machine readability
            2. Keyword Density: Analyze relevant industry/role keywords and their usage
            3. Recruiter-Friendliness: Assess readability, clarity, and professional presentation
            4. Conciseness & Impact: Review brevity and effectiveness of descriptions

            For each category, provide:
            - A score (0-100)
            - Detailed feedback points explaining issues and their impact
            - A clear description of what the category measures

            Additionally:
            1. For Keyword Density:
               - Identify all key industry/role-specific keywords found
               - Suggest additional relevant keywords to include

            2. Content Improvements:
               - List specific improvements needed for each section
               - Explain why each improvement matters
               - Suggest better phrasing or structure for weak points

            3. Formatting Fixes:
               - Detail all formatting issues found
               - Explain how each fix improves readability or ATS compatibility
               - Suggest specific formatting changes

            4. Enhanced Resume:
               - Create an improved version of the resume with all improvements applied
               - Enhance the language and structure while maintaining authenticity
               - Make it more impactful and ATS-friendly
               - Keep the same basic structure but improve phrasing and formatting
               - The enhanced version must be different from the original

            Return JSON matching this structure:
            {
              "categoryScores": {
                "atsCompliance": { "score": number, "feedback": string[], "description": string },
                "keywordDensity": { "score": number, "feedback": string[], "description": string, "identifiedKeywords": string[] },
                "recruiterFriendliness": { "score": number, "feedback": string[], "description": string },
                "conciseness": { "score": number, "feedback": string[], "description": string }
              },
              "improvements": string[],
              "formattingFixes": string[],
              "enhancedContent": string,
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