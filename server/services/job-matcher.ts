import OpenAI from "openai";
import { z } from "zod";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const matchResponseSchema = z.object({
  matchScore: z.number(),
  missingKeywords: z.array(z.string()),
  suggestedEdits: z.array(z.string()),
  suggestedRoles: z.array(z.string()).optional(),
  analysis: z.object({
    skillMatching: z.object({
      score: z.number(),
      matchedSkills: z.array(z.string()),
      missingSkills: z.array(z.string()),
      relatedSkills: z.array(z.string())
    }),
    experienceRelevance: z.object({
      score: z.number(),
      yearsMatch: z.boolean(),
      roleAlignmentScore: z.number(),
      industrySimilarity: z.number(),
      careerProgressionMatch: z.boolean()
    }),
    educationalBackground: z.object({
      score: z.number(),
      degreeMatch: z.boolean(),
      fieldRelevance: z.number(),
      certificationsValue: z.number()
    }),
    technicalProficiency: z.object({
      score: z.number(),
      toolsMatch: z.array(z.string()),
      technicalSkillsGap: z.array(z.string()),
      proficiencyLevel: z.string()
    }),
    softSkillsFit: z.object({
      score: z.number(),
      culturalAlignment: z.number(),
      communicationScore: z.number(),
      leadershipMatch: z.boolean()
    })
  })
});

export async function matchJob(resumeContent: string, jobDescription: string) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are an expert ATS and job matching specialist. Analyze the resume against the job description and provide a detailed JSON response with the following structure:
{
  "matchScore": number (0-100),
  "missingKeywords": string[],
  "suggestedEdits": string[],
  "analysis": {
    "skillMatching": {
      "score": number (0-100),
      "matchedSkills": string[],
      "missingSkills": string[],
      "relatedSkills": string[]
    },
    "experienceRelevance": {
      "score": number (0-100),
      "yearsMatch": boolean,
      "roleAlignmentScore": number (0-1),
      "industrySimilarity": number (0-1),
      "careerProgressionMatch": boolean
    },
    "educationalBackground": {
      "score": number (0-100),
      "degreeMatch": boolean,
      "fieldRelevance": number (0-1),
      "certificationsValue": number (0-1)
    },
    "technicalProficiency": {
      "score": number (0-100),
      "toolsMatch": string[],
      "technicalSkillsGap": string[],
      "proficiencyLevel": string
    },
    "softSkillsFit": {
      "score": number (0-100),
      "culturalAlignment": number (0-1),
      "communicationScore": number (0-1),
      "leadershipMatch": boolean
    }
  }
}`
        },
        {
          role: "user",
          content: `Resume Content:\n${resumeContent}\n\nJob Description:\n${jobDescription}`
        }
      ],
      temperature: 0.7,
    });

    if (!response.choices[0].message.content) {
      throw new Error("No analysis received from OpenAI");
    }

    console.log("Raw OpenAI response:", response.choices[0].message.content);

    const result = JSON.parse(response.choices[0].message.content);
    const validatedResult = matchResponseSchema.parse(result);

    // Calculate weighted total score
    const totalScore = 
      (validatedResult.analysis.skillMatching.score * 0.3) +
      (validatedResult.analysis.experienceRelevance.score * 0.25) +
      (validatedResult.analysis.educationalBackground.score * 0.15) +
      (validatedResult.analysis.technicalProficiency.score * 0.20) +
      (validatedResult.analysis.softSkillsFit.score * 0.10);

    return {
      ...validatedResult,
      matchScore: Math.round(totalScore)
    };
  } catch (error) {
    console.error("Job matching analysis failed:", error);
    if (error instanceof z.ZodError) {
      console.error("Validation error:", error.errors);
    }
    throw new Error("Failed to analyze job match");
  }
}

export async function tweakResume(resumeContent: string, jobDescription: string) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are an expert resume optimization specialist. Analyze the resume and job description to create an enhanced version optimized for ATS systems. Return ONLY a JSON response in the following format:
{
  "enhancedContent": "string containing the optimized HTML resume content with proper formatting",
  "improvements": ["list of specific improvements made"],
  "keywordMatches": ["list of keywords matched"],
  "formattingImprovements": ["list of formatting changes made"]
}

IMPORTANT:
- The enhancedContent should be valid HTML with proper formatting
- Use semantic HTML tags (h1, h2, p, ul, li, etc.)
- Maintain professional formatting
- Preserve all important content
- Focus on keyword optimization and clear structure
- Do not add fictional content
- Ensure the response is valid JSON with proper escaping`
        },
        {
          role: "user",
          content: `Resume Content:\n${resumeContent}\n\nJob Description:\n${jobDescription}`
        }
      ],
      temperature: 0.3,
    });

    if (!response.choices[0].message.content) {
      throw new Error("No optimization received from OpenAI");
    }

    console.log("Raw tweak response:", response.choices[0].message.content);

    const result = JSON.parse(response.choices[0].message.content);

    if (!result.enhancedContent || typeof result.enhancedContent !== 'string') {
      throw new Error("Invalid response format: missing or invalid enhancedContent");
    }

    return {
      enhancedContent: result.enhancedContent,
      improvements: Array.isArray(result.improvements) ? result.improvements : [],
      keywordMatches: Array.isArray(result.keywordMatches) ? result.keywordMatches : [],
      formattingImprovements: Array.isArray(result.formattingImprovements) ? result.formattingImprovements : []
    };
  } catch (error) {
    console.error("Resume tweaking failed:", error);
    throw new Error("Failed to tweak resume");
  }
}