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
  enhancedContent: z.string().min(1), // Ensure non-empty string
  overallScore: z.number(),
});

function preprocessResume(content: string): string {
  // Only normalize line endings and remove excessive whitespace
  return content
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function analyzeResume(content: string) {
  try {
    const processedContent = preprocessResume(content);

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an expert resume analyzer and enhancer. Analyze the resume and create an enhanced version.

First, analyze these categories and provide scores and feedback:
1. ATS Compliance (0-100): Check formatting, standard sections, and machine readability
2. Keyword Density (0-100): Analyze relevant industry/role keywords and their usage
3. Recruiter-Friendliness (0-100): Assess readability, clarity, and professional presentation
4. Conciseness & Impact (0-100): Review brevity and effectiveness of descriptions

Then, create an enhanced version of the resume that:
1. Uses stronger action verbs in bullet points
2. Adds relevant keywords naturally
3. Fixes formatting issues
4. Makes achievements quantifiable
5. Improves the professional summary
6. Maintains the original structure
7. Uses clear section headers

IMPORTANT - Format the enhanced resume using this exact HTML structure:
<div class="resume">
  <div class="section">
    <h2>PROFESSIONAL SUMMARY</h2>
    <p>[Enhanced summary content]</p>
  </div>

  <div class="section">
    <h2>EXPERIENCE</h2>
    <div class="job">
      <h3>[Company Name]</h3>
      <p class="job-title">[Title] | [Dates]</p>
      <ul>
        <li>[Enhanced bullet point]</li>
        <li>[Enhanced bullet point]</li>
      </ul>
    </div>
  </div>

  <div class="section">
    <h2>EDUCATION</h2>
    <p>[Enhanced education details]</p>
  </div>

  <div class="section">
    <h2>SKILLS</h2>
    <ul>
      <li>[Enhanced skill]</li>
    </ul>
  </div>
</div>

Return a JSON object with this exact structure:
{
  "categoryScores": {
    "atsCompliance": { 
      "score": number, 
      "feedback": string[], 
      "description": string 
    },
    "keywordDensity": { 
      "score": number, 
      "feedback": string[], 
      "identifiedKeywords": string[], 
      "description": string 
    },
    "recruiterFriendliness": { 
      "score": number, 
      "feedback": string[], 
      "description": string 
    },
    "conciseness": { 
      "score": number, 
      "feedback": string[], 
      "description": string 
    }
  },
  "improvements": string[],
  "formattingFixes": string[],
  "enhancedContent": string,
  "overallScore": number
}`,
        },
        {
          role: "user",
          content: processedContent,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 4000,
    });

    // Parse and validate the response
    const result = JSON.parse(response.choices[0].message.content || "{}");

    // Log the enhanced content for debugging
    console.log(
      "Enhanced content received:",
      result.enhancedContent?.substring(0, 200) + "...",
    );

    // Validate the entire response
    const validatedResult = analysisResponseSchema.parse(result);

    // Ensure enhanced content exists and has HTML structure
    if (!validatedResult.enhancedContent.includes('<div class="resume">')) {
      console.error("Enhanced content missing required HTML structure");
      throw new Error("Invalid enhanced content format");
    }

    return validatedResult;
  } catch (error) {
    console.error("Resume analysis failed:", error);
    if (error instanceof z.ZodError) {
      console.error("Validation error:", error.errors);
    }
    throw new Error("Failed to analyze resume");
  }
}
