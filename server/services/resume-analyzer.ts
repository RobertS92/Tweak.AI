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
          content: `You are an expert resume analyzer and enhancer. You must return your analysis in a strict JSON format.

Analyze the provided resume and return a JSON object with exactly this structure:
{
  "categoryScores": {
    "atsCompliance": {
      "score": <number 0-100>,
      "feedback": ["specific improvement point", "..."],
      "description": "detailed analysis"
    },
    "keywordDensity": {
      "score": <number 0-100>,
      "feedback": ["specific suggestion", "..."],
      "identifiedKeywords": ["found keyword", "..."],
      "description": "detailed analysis"
    },
    "recruiterFriendliness": {
      "score": <number 0-100>,
      "feedback": ["specific improvement", "..."],
      "description": "detailed analysis"
    },
    "conciseness": {
      "score": <number 0-100>,
      "feedback": ["specific suggestion", "..."],
      "description": "detailed analysis"
    }
  },
  "improvements": ["actionable improvement", "..."],
  "formattingFixes": ["specific formatting fix", "..."],
  "enhancedContent": "<enhanced resume in HTML format>",
  "overallScore": <number 0-100>
}

For the enhancedContent, use this HTML structure:
<div class="resume">
  <div class="header">
    <h1>[Full Name]</h1>
    <p class="contact-info">[Email] | [Phone] | [Location]</p>
    <p class="links">[Professional Links]</p>
  </div>

  <div class="section">
    <h2>Professional Summary</h2>
    <p>[Enhanced summary]</p>
  </div>

  <div class="section">
    <h2>Professional Experience</h2>
    [For each position:]
    <div class="job">
      <h3>[Company Name]</h3>
      <p class="job-title">[Title] | [Dates]</p>
      <ul>
        <li>[Enhanced achievement with metrics]</li>
      </ul>
    </div>
  </div>

  <div class="section">
    <h2>Education</h2>
    <div class="education-item">
      <h3>[Institution]</h3>
      <p>[Degree] | [Date]</p>
      <ul>
        <li>[Details]</li>
      </ul>
    </div>
  </div>

  <div class="section">
    <h2>Skills</h2>
    <ul class="skills-list">
      <li><strong>[Category]:</strong> [Skills]</li>
    </ul>
  </div>
</div>`
        },
        {
          role: "user",
          content: processedContent,
        },
      ],
      temperature: 0.3,
      max_tokens: 4000,
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