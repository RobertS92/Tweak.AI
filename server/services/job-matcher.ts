import OpenAI from "openai";
import { z } from "zod";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const tweakResponseSchema = z.object({
  enhancedContent: z.string(),
  improvements: z.array(z.string()),
  keywordMatches: z.array(z.string()),
  formattingImprovements: z.array(z.string())
});

export async function tweakResume(resumeContent: string, jobDescription: string) {
  try {
    console.log("Starting resume tweaking process...");

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are an expert resume optimization specialist. Analyze the resume and job description to create an enhanced version optimized for ATS systems.

Focus on:
1. Keyword Optimization: Match critical job requirements while maintaining authenticity
2. ATS-Friendly Formatting: Use clear section headers and professional structure
3. Content Enhancement: Highlight relevant achievements and use action verbs
4. Skills Alignment: Prioritize matching technical skills and competencies

Return a JSON response with:
{
  "enhancedContent": "HTML formatted enhanced resume content",
  "improvements": ["list of specific improvements made"],
  "keywordMatches": ["matched keywords from job description"],
  "formattingImprovements": ["formatting changes made"]
}

Important:
- Preserve the original information
- Do not fabricate experience
- Use proper HTML formatting
- Focus on relevant skills and experience
- Keep the professional tone`
        },
        {
          role: "user",
          content: `Resume Content:\n${resumeContent}\n\nJob Description:\n${jobDescription}`
        }
      ],
      temperature: 0.3,
    });

    if (!response.choices[0].message.content) {
      throw new Error("No response received from OpenAI");
    }

    console.log("Received OpenAI response, parsing...");
    const responseContent = response.choices[0].message.content.trim();

    try {
      const result = JSON.parse(responseContent);
      const validated = tweakResponseSchema.parse(result);

      console.log("Successfully validated response structure");
      return validated;
    } catch (parseError) {
      console.error("Failed to parse or validate response:", parseError);
      throw new Error("Invalid response format from OpenAI");
    }
  } catch (error) {
    console.error("Resume tweaking failed:", error);
    throw new Error("Failed to tweak resume: " + (error instanceof Error ? error.message : "Unknown error"));
  }
}

export async function matchJob(resumeContent: string, jobDescription: string) {
  try {
    console.log("Starting job matching analysis...");

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `Analyze the resume against the job description and provide a match score and detailed feedback.
Return a JSON object with:
{
  "matchScore": number between 0-100,
  "missingKeywords": ["important keywords not found in resume"],
  "suggestedEdits": ["specific suggestions to improve match"],
  "analysis": {
    "skillsMatch": "detailed analysis of skills match",
    "experienceMatch": "analysis of experience relevance",
    "educationMatch": "analysis of education requirements",
    "overallFit": "general assessment of candidate fit"
  }
}`
        },
        {
          role: "user",
          content: `Resume Content:\n${resumeContent}\n\nJob Description:\n${jobDescription}`
        }
      ],
      temperature: 0.3,
    });

    if (!response.choices[0].message.content) {
      throw new Error("No response received from OpenAI");
    }

    const result = JSON.parse(response.choices[0].message.content);

    return {
      matchScore: Math.min(100, Math.max(0, result.matchScore)),
      missingKeywords: Array.isArray(result.missingKeywords) ? result.missingKeywords : [],
      suggestedEdits: Array.isArray(result.suggestedEdits) ? result.suggestedEdits : [],
      analysis: result.analysis || {}
    };
  } catch (error) {
    console.error("Job matching failed:", error);
    throw new Error("Failed to analyze job match: " + (error instanceof Error ? error.message : "Unknown error"));
  }
}