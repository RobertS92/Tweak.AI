import OpenAI from "openai";
import { z } from "zod";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const categoryResponseSchema = z.object({
  score: z.number(),
  feedback: z.array(z.string()),
  description: z.string(),
});

const analysisResponseSchema = z.object({
  categoryScores: z.object({
    atsCompliance: categoryResponseSchema,
    keywordDensity: categoryResponseSchema.extend({
      identifiedKeywords: z.array(z.string()),
    }),
    recruiterFriendliness: categoryResponseSchema,
    conciseness: categoryResponseSchema,
  }),
  improvements: z.array(z.string()),
  formattingFixes: z.array(z.string()),
  enhancedContent: z.string().min(1),
  overallScore: z.number(),
});

function preprocessResume(content: string): string {
  return content
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function analyzeResume(content: string) {
  try {
    const processedContent = preprocessResume(content);

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are an expert resume analyzer and enhancer. Analyze the provided resume and return ONLY a valid JSON response with this exact structure (no additional text or explanation):

{
  "categoryScores": {
    "atsCompliance": {
      "score": <number 0-100>,
      "feedback": ["improvement point 1", "improvement point 2"],
      "description": "analysis details"
    },
    "keywordDensity": {
      "score": <number 0-100>,
      "feedback": ["suggestion 1", "suggestion 2"],
      "identifiedKeywords": ["keyword1", "keyword2"],
      "description": "analysis details"
    },
    "recruiterFriendliness": {
      "score": <number 0-100>,
      "feedback": ["improvement 1", "improvement 2"],
      "description": "analysis details"
    },
    "conciseness": {
      "score": <number 0-100>,
      "feedback": ["suggestion 1", "suggestion 2"],
      "description": "analysis details"
    }
  },
  "improvements": ["improvement 1", "improvement 2"],
  "formattingFixes": ["fix 1", "fix 2"],
  "enhancedContent": "<HTML formatted content>",
  "overallScore": <number 0-100>
}`
        },
        {
          role: "user",
          content: processedContent,
        },
      ],
      temperature: 0.3,
      max_tokens: 4000,
      response_format: { type: "json_object" }
    });

    if (!response.choices[0].message.content) {
      throw new Error("No analysis received from OpenAI");
    }

    let parsedResponse;
    try {
      parsedResponse = JSON.parse(response.choices[0].message.content.trim());
    } catch (parseError) {
      console.error("Failed to parse OpenAI response:", parseError);
      console.error("Raw response:", response.choices[0].message.content);
      throw new Error("Invalid JSON response from analysis");
    }

    // Validate response structure
    const validatedResult = analysisResponseSchema.parse(parsedResponse);

    // Calculate overall score from category scores
    const weights = {
      atsCompliance: 0.30,
      keywordDensity: 0.25,
      recruiterFriendliness: 0.25,
      conciseness: 0.20
    };

    const calculatedOverallScore = Math.round(
      weights.atsCompliance * validatedResult.categoryScores.atsCompliance.score +
      weights.keywordDensity * validatedResult.categoryScores.keywordDensity.score +
      weights.recruiterFriendliness * validatedResult.categoryScores.recruiterFriendliness.score +
      weights.conciseness * validatedResult.categoryScores.conciseness.score
    );

    // Return with properly rounded scores
    return {
      ...validatedResult,
      overallScore: calculatedOverallScore,
      categoryScores: {
        atsCompliance: {
          ...validatedResult.categoryScores.atsCompliance,
          score: Math.round(validatedResult.categoryScores.atsCompliance.score)
        },
        keywordDensity: {
          ...validatedResult.categoryScores.keywordDensity,
          score: Math.round(validatedResult.categoryScores.keywordDensity.score)
        },
        recruiterFriendliness: {
          ...validatedResult.categoryScores.recruiterFriendliness,
          score: Math.round(validatedResult.categoryScores.recruiterFriendliness.score)
        },
        conciseness: {
          ...validatedResult.categoryScores.conciseness,
          score: Math.round(validatedResult.categoryScores.conciseness.score)
        }
      }
    };
  } catch (error) {
    console.error("Resume analysis failed:", error);
    if (error instanceof z.ZodError) {
      console.error("Validation error:", error.errors);
    }
    throw new Error("Failed to analyze resume");
  }
}