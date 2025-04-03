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
    
    // Log original content length for comparison
    console.log("[DEBUG] Original resume length:", content.length);
    console.log("[DEBUG] Processed resume length:", processedContent.length);

    // Use updated approach similar to resume tweak feature
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      // No response_format to avoid compatibility issues
      messages: [
        {
          role: "system",
          content: `You are an expert resume analyzer and enhancer. You must return your analysis in a strict JSON format.

⚠️ CRITICAL REQUIREMENT: NEVER REMOVE OR SHORTEN ANY CONTENT FROM THE RESUME. THIS IS THE HIGHEST PRIORITY RULE.

Follow these instructions explicitly:
1. PRESERVE EVERY SINGLE DETAIL from the original resume - this is non-negotiable
2. COPY ALL ORIGINAL TEXT VERBATIM before making any enhancements
3. Keep ALL sections, bullet points, skills, and experiences from the original resume
4. Only make ADDITIVE improvements that enhance without removing ANY content
5. The enhanced content MUST be LONGER than the original resume - never shorter
6. Focus on ATS optimization while preserving 100% of the original information
7. If you're considering removing anything, DON'T - preserve it exactly as is

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

For the enhancedContent, use this HTML structure while preserving ALL original information:
<div class="resume">
  <div class="header">
    <h1>[Full Name]</h1>
    <p class="contact-info">[Email] | [Phone] | [Location]</p>
    <p class="links">[Professional Links]</p>
  </div>

  <div class="section">
    <h2>Professional Summary</h2>
    <p>[Enhanced summary that includes ALL original content]</p>
  </div>

  <div class="section">
    <h2>Professional Experience</h2>
    [For each position - preserve ALL original entries:]
    <div class="job">
      <h3>[Company Name]</h3>
      <p class="job-title">[Title] | [Dates]</p>
      <ul>
        <li>[Enhanced achievement with metrics - preserve ALL original details]</li>
      </ul>
    </div>
  </div>

  <div class="section">
    <h2>Education</h2>
    <div class="education-item">
      <h3>[Institution]</h3>
      <p>[Degree] | [Date]</p>
      <ul>
        <li>[Details - keep ALL original information]</li>
      </ul>
    </div>
  </div>

  <div class="section">
    <h2>Skills</h2>
    <ul class="skills-list">
      <li><strong>[Category]:</strong> [ALL original skills plus any suggested additions]</li>
    </ul>
  </div>
</div>

Important: Return ONLY valid JSON in your response, nothing else. Format your entire response as a single JSON object.`
        },
        {
          role: "user",
          content: `Resume Content:\n${processedContent}\n\nAnalyze this resume and provide a detailed analysis with enhancements. 

CRITICAL REQUIREMENTS:
1. COPY 100% OF THE ORIGINAL CONTENT before making any enhancements
2. NEVER remove any details from the original resume
3. The enhanced version MUST be longer than the original - never shorter
4. If in doubt about any content, KEEP IT EXACTLY AS IS

Return your analysis as a single complete JSON object.`
        },
      ],
      temperature: 0.3,
      max_tokens: 4000,
    });

    console.log("[DEBUG] Received OpenAI response for resume analysis");

    if (!response.choices[0].message.content) {
      throw new Error("No analysis received from OpenAI");
    }

    // Extract the raw response text
    const rawResponse = response.choices[0].message.content.trim();
    console.log("[DEBUG] Raw analysis response (first 100 chars):", 
      rawResponse.substring(0, 100) + "...");

    let parsedResponse;
    try {
      // Handle potential non-JSON content by extracting the JSON portion
      const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? jsonMatch[0] : rawResponse;
      
      parsedResponse = JSON.parse(jsonString);
      console.log("[DEBUG] Successfully parsed resume analysis JSON");
    } catch (parseError) {
      console.error("[DEBUG] Failed to parse OpenAI response:", parseError);
      console.error("[DEBUG] Raw response:", rawResponse);
      throw new Error("Invalid JSON response from analysis");
    }

    // Check enhanced content length compared to original
    if (parsedResponse.enhancedContent) {
      // Extract text content from HTML for fair comparison
      const htmlContent = parsedResponse.enhancedContent;
      const textContent = htmlContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      
      console.log("[DEBUG] Original content length:", processedContent.length);
      console.log("[DEBUG] Enhanced content text length:", textContent.length);
      console.log("[DEBUG] Enhanced content HTML length:", htmlContent.length);
      
      // Modified validation: Since HTML formatting adds significant bulk to the content,
      // we're primarily ensuring there's sufficient content rather than requiring exact length matches
      if (textContent.length < processedContent.length * 0.6) {
        console.log("[WARNING] Enhanced content appears much shorter than original content!");
        console.log("[WARNING] This indicates the AI might be removing content against instructions");
        
        // Only reject if the content is extremely short, indicating a serious problem
        if (textContent.length < processedContent.length * 0.4) {
          console.log("[ERROR] Enhanced content is significantly shorter, rejecting analysis");
          throw new Error("Enhanced content is too short, original content may have been lost");
        }
      }
      
      // For HTML content, we want to ensure the HTML is reasonably sized
      if (htmlContent.length < processedContent.length) {
        console.log("[WARNING] HTML enhanced content is shorter than original raw content!");
        console.log("[WARNING] This may indicate missing content even with HTML formatting");
      }
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