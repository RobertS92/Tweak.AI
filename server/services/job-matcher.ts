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
      // Remove response_format since it's causing issues with the model
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
    
    // Log original content length for comparison
    console.log("[DEBUG] Original resume length:", sanitizedResume.length);

    // Remove response_format since it's causing issues with the model
    const response = await openai.chat.completions.create({
      model: "gpt-4", 
      messages: [
        {
          role: "system",
          content: `You are an expert ATS optimization specialist. Enhance the provided resume to better match the job description.

MOST IMPORTANT RULE: DO NOT SHORTEN THE RESUME AT ALL.

Follow these instructions exactly:
1. Keep ALL sections, bullet points, skills, and experiences from the original resume
2. Simply ADD relevant keywords from the job description by enhancing existing bullet points
3. NEVER remove any skills, experiences, or projects - this is critical
4. You may rephrase/enhance existing bullets but maintain all the original information
5. The optimized content must be equal or longer in length than the original resume
6. Focus only on KEYWORD MATCHING, not content reduction
7. Create a detailed list of all specific changes made

Return a JSON response with this exact structure:
{
  "enhancedContent": "The complete optimized resume content preserving all sections",
  "improvements": ["List of specific improvements made"],
  "keywordMatches": ["List of matched keywords"],
  "formattingImprovements": ["List of formatting changes"]
}

Important: Return ONLY valid JSON in your response, nothing else. Format your entire response as a single JSON object.`
        },
        {
          role: "user",
          content: `Resume Content:\n${sanitizedResume}\n\nJob Description:\n${sanitizedJobDesc}\n\nEnhance this resume to better match the job requirements while preserving all original sections and truthfulness. The enhanced content MUST be equal or longer in length than the original resume.`
        }
      ],
      temperature: 0.3,
    });

    if (!response.choices[0].message.content) {
      throw new Error("No optimization received from OpenAI");
    }

    console.log("[DEBUG] Raw tweak response:", response.choices[0].message.content.substring(0, 100) + "...");

    let result;
    try {
      // Handle potential non-JSON content by extracting the JSON portion
      const content = response.choices[0].message.content.trim();
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? jsonMatch[0] : content;
      
      result = JSON.parse(jsonString);
    } catch (parseError) {
      console.error("[DEBUG] JSON parse error:", parseError);
      throw new Error("Failed to parse optimization response");
    }

    if (!result.enhancedContent) {
      throw new Error("Missing enhanced content in response");
    }
    
    // Check if enhanced content preserves resume length
    console.log("[DEBUG] Enhanced resume length:", result.enhancedContent.length);
    
    if (result.enhancedContent.length < sanitizedResume.length * 0.95) {
      console.log("[WARNING] Enhanced content is significantly shorter than original!");
      console.log("[WARNING] Original length:", sanitizedResume.length, "Enhanced length:", result.enhancedContent.length);
      
      // For significantly shortened content (less than 85%), reject the enhancement
      if (result.enhancedContent.length < sanitizedResume.length * 0.85) {
        throw new Error("AI produced a significantly shortened resume. Using original content instead.");
      }
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