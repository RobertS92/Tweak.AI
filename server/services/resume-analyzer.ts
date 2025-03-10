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
          content: `You are an expert resume analyzer and enhancer. 

Analyze the provided resume and enhance it to make it more effective while maintaining truthfulness.

The response should be a JSON object with this exact structure:
{
  "categoryScores": {
    "atsCompliance": { 
      "score": <number 0-100>, 
      "feedback": [<improvement points>], 
      "description": <detailed analysis>
    },
    "keywordDensity": { 
      "score": <number 0-100>, 
      "feedback": [<suggestions>], 
      "identifiedKeywords": [<found keywords>], 
      "description": <detailed analysis>
    },
    "recruiterFriendliness": { 
      "score": <number 0-100>, 
      "feedback": [<improvements>], 
      "description": <detailed analysis>
    },
    "conciseness": { 
      "score": <number 0-100>, 
      "feedback": [<suggestions>], 
      "description": <detailed analysis>
    }
  },
  "improvements": [<list of actionable improvements>],
  "formattingFixes": [<list of formatting fixes>],
  "enhancedContent": <The enhanced resume content with this exact HTML structure:
    <div class="resume">
      <div class="header">
        <h1>[Name]</h1>
        <p>[Contact Information]</p>
      </div>

      <div class="section">
        <h2>Professional Summary</h2>
        <p>[Enhanced summary]</p>
      </div>

      <div class="section">
        <h2>Experience</h2>
        [For each position:]
        <div class="job">
          <h3>[Company Name]</h3>
          <p class="job-title">[Title] | [Dates]</p>
          <ul>
            <li>[Enhanced bullet point]</li>
          </ul>
        </div>
      </div>

      <div class="section">
        <h2>Education</h2>
        <p>[Enhanced education details]</p>
      </div>

      <div class="section">
        <h2>Skills</h2>
        <ul>
          <li>[Enhanced skills]</li>
        </ul>
      </div>
    </div>
  >,
  "overallScore": <calculated overall score>
}`
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

    console.log("Raw analysis response:", response.choices[0].message.content);

    const result = JSON.parse(response.choices[0].message.content);
    const validatedResult = analysisResponseSchema.parse(result);

    return {
      ...validatedResult,
      enhancedContent: validatedResult.enhancedContent.replace(/\\n/g, '\n').replace(/\\"/g, '"')
    };
  } catch (error) {
    console.error("Resume analysis failed:", error);
    if (error instanceof z.ZodError) {
      console.error("Validation error:", error.errors);
    }
    throw new Error("Failed to analyze resume");
  }
}