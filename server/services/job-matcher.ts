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
    console.log("[DEBUG] Starting job matching analysis");
    console.log("[DEBUG] Resume length:", resumeContent.length);
    console.log("[DEBUG] Job description length:", jobDescription.length);

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

    console.log("[DEBUG] Raw OpenAI response:", response.choices[0].message.content);
    
    const result = JSON.parse(response.choices[0].message.content);
    console.log("[DEBUG] Parsed JSON result:", result);
    
    const validatedResult = matchResponseSchema.parse(result);
    console.log("[DEBUG] Validated result:", validatedResult);

    // Calculate weighted total score using AI-provided component scores
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
          content: `You are an expert ATS optimization specialist. Enhance the provided resume to better match the job description while maintaining authenticity. Focus on:

1. Keyword Optimization
   - Match critical job requirements
   - Use industry-standard terminology
   - Maintain natural language flow

2. ATS-Friendly Formatting
   - Clear section headers
   - Standard section ordering
   - Consistent bullet point formatting
   - Proper spacing and hierarchy

3. Experience Enhancement
   - Highlight relevant achievements
   - Quantify results where possible
   - Use action verbs
   - Focus on transferable skills

4. Skills Alignment
   - Prioritize matching technical skills
   - Include both hard and soft skills
   - Add missing key competencies if user possesses them

Format the response in HTML with proper semantic structure and return a JSON object:
{
  "enhancedContent": "<div class='resume'><div class='section'>...(HTML formatted resume content)...</div></div>",
  "improvements": ["List of specific improvements made"],
  "keywordMatches": ["Matched keywords"],
  "formattingImprovements": ["Formatting changes made"]
}`
        },
        {
          role: "user",
          content: `Resume Content:\n${resumeContent}\n\nJob Description:\n${jobDescription}`
        }
      ],
      temperature: 0.3, // Lower temperature for more consistent formatting
    });

    if (!response.choices[0].message.content) {
      throw new Error("No optimization received from OpenAI");
    }

    console.log("Raw tweak response:", response.choices[0].message.content);

    try {
      const result = JSON.parse(response.choices[0].message.content);
      return {
        enhancedContent: result.enhancedContent || resumeContent,
        improvements: result.improvements || [],
        keywordMatches: result.keywordMatches || [],
        formattingImprovements: result.formattingImprovements || []
      };
    } catch (parseError) {
      console.error("Failed to parse OpenAI response:", parseError);
      throw new Error("Failed to parse optimization response");
    }
  } catch (error) {
    console.error("Resume tweaking failed:", error);
    throw new Error("Failed to tweak resume");
  }
}