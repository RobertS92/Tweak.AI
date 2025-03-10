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
          content: `You are an expert resume analyzer. Analyze the provided resume and return a JSON response with the following structure exactly:

{
  "categoryScores": {
    "atsCompliance": {
      "score": <number 0-100>,
      "feedback": ["specific improvement points"],
      "description": "detailed analysis"
    },
    "keywordDensity": {
      "score": <number 0-100>,
      "feedback": ["specific suggestions"],
      "identifiedKeywords": ["found keywords"],
      "description": "detailed analysis"
    },
    "recruiterFriendliness": {
      "score": <number 0-100>,
      "feedback": ["specific improvements"],
      "description": "detailed analysis"
    },
    "conciseness": {
      "score": <number 0-100>,
      "feedback": ["specific suggestions"],
      "description": "detailed analysis"
    }
  },
  "improvements": ["actionable improvements"],
  "formattingFixes": ["specific formatting fixes"],
  "enhancedContent": "<optimized resume content with HTML formatting>",
  "overallScore": <calculated overall score>
}

Analyze the resume based on these criteria:

1. ATS Compliance:
- Standard section headers
- Proper formatting and structure
- Machine-readable content
- Clear hierarchy
- Consistent spacing

2. Keyword Density:
- Relevant industry terms
- Technical skills presence
- Role-specific terminology
- Balanced keyword distribution
- Natural language use

3. Recruiter-Friendliness:
- Clear and concise language
- Achievement quantification
- Professional tone
- Logical flow
- Visual clarity

4. Conciseness & Impact:
- Direct and focused statements
- Strong action verbs
- Results-oriented descriptions
- No redundancy
- Efficient use of space

Calculate scores dynamically based on the resume's content. Do not use hardcoded values.`
        },
        {
          role: "user",
          content: processedContent,
        },
      ],
      temperature: 0.3,
    });

    if (!response.choices[0].message.content) {
      throw new Error("No analysis received from OpenAI");
    }

    console.log("Raw analysis response:", response.choices[0].message.content);

    const result = JSON.parse(response.choices[0].message.content);
    const validatedResult = analysisResponseSchema.parse(result);

    // Calculate overall score from category scores dynamically
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

    return {
      ...validatedResult,
      overallScore: calculatedOverallScore
    };
  } catch (error) {
    console.error("Resume analysis failed:", error);
    if (error instanceof z.ZodError) {
      console.error("Validation error:", error.errors);
    }
    throw new Error("Failed to analyze resume");
  }
}