import OpenAI from "openai";
import { z } from "zod";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const matchResponseSchema = z.object({
  matchScore: z.number(),
  missingKeywords: z.array(z.string()).optional(),
  suggestedEdits: z.array(z.string()).optional(),
  analysis: z.object({
    skillMatching: z.object({
      score: z.number(),
      matchedSkills: z.array(z.string()),
      missingSkills: z.array(z.string()),
      relatedSkills: z.array(z.string())
    }).optional(),
    experienceRelevance: z.object({
      score: z.number(),
      yearsMatch: z.boolean(),
      roleAlignmentScore: z.number(),
      industrySimilarity: z.number()
    }).optional(),
    educationalBackground: z.object({
      score: z.number(),
      degreeMatch: z.boolean(),
      fieldRelevance: z.number()
    }).optional(),
    technicalProficiency: z.object({
      score: z.number(),
      toolsMatch: z.array(z.string()),
      technicalSkillsGap: z.array(z.string())
    }).optional()
  }).optional()
}).strict();

export async function matchJob(resumeContent: string, jobDescription: string) {
  try {
    // Input validation
    if (!resumeContent?.trim() || !jobDescription?.trim()) {
      throw new Error("Resume content and job description are required");
    }

    console.log("[DEBUG] Starting job matching analysis");
    console.log("[DEBUG] Resume length:", resumeContent.length);
    console.log("[DEBUG] Job description length:", jobDescription.length);

    const sanitizedJobDesc = jobDescription.replace(/\r\n/g, '\n').trim();
    const sanitizedResume = resumeContent.replace(/\r\n/g, '\n').trim();

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are an expert ATS and job matching specialist. Analyze the resume against the job description and provide a detailed JSON response with this exact structure:
{
  "matchScore": number,
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
      "industrySimilarity": number (0-1)
    },
    "educationalBackground": {
      "score": number (0-100),
      "degreeMatch": boolean,
      "fieldRelevance": number (0-1)
    },
    "technicalProficiency": {
      "score": number (0-100),
      "toolsMatch": string[],
      "technicalSkillsGap": string[]
    }
  }
}`
        },
        {
          role: "user",
          content: `Resume Content:\n${sanitizedResume}\n\nJob Description:\n${sanitizedJobDesc}`
        }
      ],
      temperature: 0.7,
    });

    if (!response.choices[0].message.content) {
      throw new Error("No analysis received from OpenAI");
    }

    console.log("[DEBUG] Raw OpenAI response:", response.choices[0].message.content);

    let result;
    try {
      result = JSON.parse(response.choices[0].message.content);
    } catch (parseError) {
      console.error("[DEBUG] JSON parse error:", parseError);
      throw new Error("Failed to parse OpenAI response");
    }

    console.log("[DEBUG] Parsed JSON result:", result);

    console.log("[DEBUG] Attempting to validate response against schema");
    console.log("[DEBUG] Schema structure:", Object.keys(matchResponseSchema.shape));
    console.log("[DEBUG] Response structure:", Object.keys(result));

    const validatedResult = matchResponseSchema.parse(result);
    console.log("[DEBUG] Validation successful");
    console.log("[DEBUG] Validated result:", validatedResult);

    return validatedResult;
  } catch (error) {
    console.error("Job matching analysis failed:", error);
    if (error instanceof z.ZodError) {
      console.error("Validation error:", error.errors);
    }
    throw error;
  }
}

export async function tweakResume(resumeContent: string, jobDescription: string) {
  try {
    // Input validation
    if (!resumeContent?.trim() || !jobDescription?.trim()) {
      throw new Error("Resume content and job description are required");
    }

    const sanitizedJobDesc = jobDescription.replace(/\r\n/g, '\n').trim();
    const sanitizedResume = resumeContent.replace(/\r\n/g, '\n').trim();

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are an expert ATS optimization specialist. Enhance the provided resume to better match the job description while maintaining authenticity and truthfulness. Keep all original contact information and structure. Include these sections in order if present in original:
1. Personal Information
2. Professional Summary
3. Work Experience
4. Skills
5. Education
6. Projects (if any)
7. Certifications (if any)

Return a JSON response with this exact structure:
{
  "enhancedContent": "The complete optimized resume content preserving all sections",
  "improvements": ["List of specific improvements made"],
  "keywordMatches": ["List of matched keywords"],
  "formattingImprovements": ["List of formatting changes"]
}

Important: Maintain all original sections and information, only enhance content to better match job requirements. Do not fabricate experience or credentials.`
        },
        {
          role: "user",
          content: `Resume Content:\n${sanitizedResume}\n\nJob Description:\n${sanitizedJobDesc}\n\nEnhance this resume to better match the job requirements while preserving all original sections and truthfulness.`
        }
      ],
      temperature: 0.3,
    });

    if (!response.choices[0].message.content) {
      throw new Error("No optimization received from OpenAI");
    }

    console.log("[DEBUG] Raw tweak response:", response.choices[0].message.content);

    let result;
    try {
      result = JSON.parse(response.choices[0].message.content);
    } catch (parseError) {
      console.error("[DEBUG] JSON parse error:", parseError);
      throw new Error("Failed to parse optimization response");
    }

    if (!result.enhancedContent) {
      throw new Error("Missing enhanced content in response");
    }

    return {
      enhancedContent: result.enhancedContent,
      improvements: result.improvements || [],
      keywordMatches: result.keywordMatches || [],
      formattingImprovements: result.formattingImprovements || []
    };
  } catch (error) {
    console.error("Resume tweaking failed:", error);
    throw error;
  }
}