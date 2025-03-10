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
          content: `You are an expert resume analyzer and enhancer. Analyze the provided resume and enhance it to make it more effective while maintaining truthfulness.

Format the enhanced resume using this exact HTML structure:
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Professional Resume</title>
</head>
<body>
  <div class="container">
    <div class="resume">
      <div class="header">
        <h1>[Full Name]</h1>
        <p class="contact-info">[Email] | [Phone] | [Location]</p>
        <p class="links">
          [Professional Links]
        </p>
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
          <p class="job-title">[Job Title] | [Month Year - Month Year]</p>
          <ul>
            [For each achievement:]
            <li>[Enhanced achievement with metrics and impact]</li>
          </ul>
        </div>
      </div>

      <div class="section">
        <h2>Education</h2>
        <div class="education-item">
          <h3>[Institution Name]</h3>
          <p>[Degree Title] | [Graduation Month Year]</p>
          <ul>
            <li>[Relevant details, honors, etc.]</li>
          </ul>
        </div>
      </div>

      <div class="section">
        <h2>Technical Skills</h2>
        <ul class="skills-list">
          <li><strong>[Category]:</strong> [Skills list]</li>
        </ul>
      </div>

      [If applicable:]
      <div class="section">
        <h2>Certifications</h2>
        <ul>
          <li>[Certification Name] - [Issuing Organization] ([Date])</li>
        </ul>
      </div>
    </div>
  </div>
</body>
</html>

Return a JSON object with:
{
  "categoryScores": {
    "atsCompliance": { 
      "score": <whole number 0-100>, 
      "feedback": [<improvement points>], 
      "description": <detailed analysis>
    },
    "keywordDensity": { 
      "score": <whole number 0-100>, 
      "feedback": [<suggestions>], 
      "identifiedKeywords": [<found keywords>], 
      "description": <detailed analysis>
    },
    "recruiterFriendliness": { 
      "score": <whole number 0-100>, 
      "feedback": [<improvements>], 
      "description": <detailed analysis>
    },
    "conciseness": { 
      "score": <whole number 0-100>, 
      "feedback": [<suggestions>], 
      "description": <detailed analysis>
    }
  },
  "improvements": [<list of actionable improvements>],
  "formattingFixes": [<list of formatting fixes>],
  "enhancedContent": <enhanced resume with HTML structure above>,
  "overallScore": <whole number 0-100>
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

    // Calculate overall score from category scores and ensure it's an integer
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

    // Return with integer scores and properly formatted content
    return {
      ...validatedResult,
      overallScore: calculatedOverallScore,
      enhancedContent: validatedResult.enhancedContent.replace(/\\n/g, '\n').replace(/\\"/g, '"'),
      categoryScores: {
        ...validatedResult.categoryScores,
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