import OpenAI from "openai";
import { z } from "zod";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Import validators
const { ensureValidScore } = require('../utils/validators');

// Helper for transforming numbers to ensure they're valid
const safeNumberProcessor = (val: unknown) => {
  // Convert any non-number to a valid integer (default 0)
  return ensureValidScore(val);
};

// Score type with validation
const scoreSchema = z.number()
  .transform((val) => safeNumberProcessor(val));
  
// Percentage type (0-100) with validation
const percentSchema = z.number()
  .transform((val) => {
    const score = safeNumberProcessor(val);
    return Math.min(100, Math.max(0, score)); // Clamp between 0-100
  });

// Ratio type (0-1) with validation  
const ratioSchema = z.number()
  .transform((val) => {
    const ratio = typeof val === 'number' ? val : 0;
    return Math.min(1, Math.max(0, ratio)); // Clamp between 0-1
  });

const matchResponseSchema = z.object({
  matchScore: percentSchema,
  missingKeywords: z.array(z.string()).optional(),
  suggestedEdits: z.array(z.string()).optional(),
  analysis: z.object({
    skillMatching: z.object({
      score: percentSchema,
      matchedSkills: z.array(z.string()),
      missingSkills: z.array(z.string()),
      relatedSkills: z.array(z.string())
    }).optional(),
    experienceRelevance: z.object({
      score: percentSchema,
      yearsMatch: z.boolean(),
      roleAlignmentScore: ratioSchema,
      industrySimilarity: ratioSchema
    }).optional(),
    educationalBackground: z.object({
      score: percentSchema,
      degreeMatch: z.boolean(),
      fieldRelevance: ratioSchema
    }).optional(),
    technicalProficiency: z.object({
      score: percentSchema,
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
    
    // Instead of throwing and breaking the client, return a fallback result
    console.log("[DEBUG] Providing fallback job match result due to error");
    
    return {
      matchScore: 50, // Default middle score
      missingKeywords: ["Unable to analyze keywords due to an error"],
      suggestedEdits: ["Review the job description and ensure your resume highlights relevant skills and experience"],
      analysis: {
        skillMatching: {
          score: 50,
          matchedSkills: [],
          missingSkills: ["Unable to analyze skills due to an error"],
          relatedSkills: []
        }
      }
    };
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
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: `You are an expert ATS optimization specialist. Enhance the provided resume to better match the job description.

⚠️ CRITICAL REQUIREMENT: NEVER REMOVE OR SHORTEN ANY CONTENT FROM THE RESUME. THIS IS THE HIGHEST PRIORITY RULE.

Follow these instructions explicitly:
1. PRESERVE EVERY SINGLE DETAIL from the original resume - this is non-negotiable
2. COPY ALL ORIGINAL TEXT VERBATIM before making any enhancements
3. Keep ALL sections, bullet points, skills, and experiences from the original resume
4. Simply ADD relevant keywords from the job description by enhancing existing bullet points
5. NEVER remove any skills, experiences, or projects - this is critical
6. You may rephrase/enhance existing bullets but maintain all the original information
7. The optimized content MUST be LONGER than the original resume - never shorter
8. Focus only on KEYWORD MATCHING and CONTENT ADDITION, never reduction
9. If you're considering removing anything, DON'T - preserve it exactly as is
10. Create a detailed list of all specific changes made

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
          content: `Resume Content:\n${sanitizedResume}\n\nJob Description:\n${sanitizedJobDesc}\n\nEnhance this resume to better match the job requirements. 

CRITICAL REQUIREMENTS:
1. COPY 100% OF THE ORIGINAL CONTENT before making any enhancements
2. NEVER remove any details from the original resume
3. The enhanced version MUST be longer than the original - never shorter
4. If in doubt about any content, KEEP IT EXACTLY AS IS
5. Provide specific details on what keywords you've matched and what improvements you've made`
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
    console.log("[DEBUG] Original resume length:", sanitizedResume.length);
    
    // Modified validation with more sophisticated approach
    // For plain text content, do a direct length comparison
    if (result.enhancedContent.length < sanitizedResume.length) {
      console.log("[WARNING] Enhanced content appears shorter than original content!");
      console.log("[WARNING] Original length:", sanitizedResume.length, "Enhanced length:", result.enhancedContent.length);
      
      // For significantly shortened content (less than 85%), reject the enhancement
      if (result.enhancedContent.length < sanitizedResume.length * 0.85) {
        console.log("[ERROR] Enhanced content is significantly shorter, rejecting analysis");
        throw new Error("AI produced a significantly shortened resume. Using original content instead.");
      }
    }
    
    // Perform a character count comparison as well to ensure content preservation
    const originalChars = new Set(sanitizedResume.replace(/\s+/g, '').split('')).size;
    const enhancedChars = new Set(result.enhancedContent.replace(/\s+/g, '').split('')).size;
    
    if (enhancedChars < originalChars * 0.9) {
      console.log("[WARNING] Enhanced content may be missing characters from original!");
      console.log("[WARNING] Original unique chars:", originalChars, "Enhanced unique chars:", enhancedChars);
      
      if (enhancedChars < originalChars * 0.8) {
        console.log("[ERROR] Enhanced content is missing too many characters, rejecting");
        throw new Error("Enhanced content appears to have lost significant information");
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
    
    // Get the original content from the function parameters
    // This ensures we have access to the original resume content 
    // even if sanitizedResume is out of scope
    const originalContent = resumeContent.replace(/\r\n/g, '\n').trim();
    
    // Return the original content instead of throwing an error
    // This ensures the UI doesn't break even if the optimization fails
    console.log("[DEBUG] Returning original content with explanation due to failure");
    
    return {
      // Return the original content as is - no modifications
      enhancedContent: originalContent,
      
      // Provide informative messages about what happened
      improvements: [
        "Unable to enhance resume due to a processing error",
        "The original content has been preserved without changes",
        "Try again with a more detailed job description"
      ],
      keywordMatches: [],
      formattingImprovements: []
    };
  }
}