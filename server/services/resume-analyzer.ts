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

// Create a fallback HTML version of the resume
// This ensures we always have a valid enhanced version even if the AI fails
function createFallbackHtml(content: string): string {
  // Simple conversion: break the content into sections based on line breaks
  const lines = content.split('\n');
  let html = '<div class="resume">';
  
  // Try to extract the name from the first line
  if (lines.length > 0) {
    html += `<div class="header"><h1>${lines[0]}</h1>`;
    
    // Contact info is usually in the second line
    if (lines.length > 1) {
      html += `<p class="contact-info">${lines[1]}</p></div>`;
    } else {
      html += '</div>';
    }
  }
  
  // Process the remaining lines, looking for section patterns
  let currentSection = '';
  let sectionContent = '';
  let inSection = false;
  
  for (let i = 2; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Empty line may indicate section boundary
    if (!line) {
      if (inSection && currentSection && sectionContent) {
        html += `<div class="section"><h2>${currentSection}</h2><p>${sectionContent}</p></div>`;
        inSection = false;
        currentSection = '';
        sectionContent = '';
      }
      continue;
    }
    
    // Possible section header (short line, perhaps all caps or followed by empty line)
    if (line.length < 35 && (line === line.toUpperCase() || (i + 1 < lines.length && !lines[i + 1].trim()))) {
      if (inSection && currentSection && sectionContent) {
        html += `<div class="section"><h2>${currentSection}</h2><p>${sectionContent}</p></div>`;
      }
      
      currentSection = line;
      sectionContent = '';
      inSection = true;
    } else if (inSection) {
      // Add content to current section
      sectionContent += line + '<br>';
    } else {
      // If not in a section yet, create a general section
      if (!currentSection) {
        currentSection = 'Professional Information';
      }
      sectionContent += line + '<br>';
      inSection = true;
    }
  }
  
  // Add the last section if there is one
  if (inSection && currentSection && sectionContent) {
    html += `<div class="section"><h2>${currentSection}</h2><p>${sectionContent}</p></div>`;
  }
  
  html += '</div>';
  return html;
}

export async function analyzeResume(content: string) {
  try {
    const processedContent = preprocessResume(content);
    
    // Log original content length for comparison
    console.log("[DEBUG] Original resume length:", content.length);
    console.log("[DEBUG] Processed resume length:", processedContent.length);

    // First, create a fallback enhanced HTML version of the resume
    // This ensures we always have a valid enhanced version even if the AI fails
    const fallbackHtml = createFallbackHtml(processedContent);
    
    // First get the analysis without generating the enhanced content
    // This avoids token limit issues that might cause content truncation
    const analysisResponse = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are an expert resume analyzer. Analyze the resume WITHOUT making any changes to it.
          Return a detailed analysis in JSON format with these components:
          1. Category scores with specific feedback points
          2. Identified improvements
          3. Formatting fixes
          
          Do NOT include the enhanced content in this response.
          
          The JSON structure should be:
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
            "overallScore": <number 0-100>
          }`
        },
        {
          role: "user",
          content: `Resume Content:\n${processedContent}\n\nAnalyze this resume and provide a detailed analysis. Return your analysis as a single complete JSON object.`
        }
      ],
      temperature: 0.3,
      max_tokens: 2000,
    });

    // Extract and parse the analysis part
    let analysis;
    try {
      const rawAnalysis = analysisResponse.choices[0].message.content?.trim() || "{}";
      const jsonMatch = rawAnalysis.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? jsonMatch[0] : rawAnalysis;
      
      analysis = JSON.parse(jsonString);
      console.log("[DEBUG] Successfully parsed resume analysis");
    } catch (parseError) {
      console.error("[DEBUG] Failed to parse analysis response:", parseError);
      throw new Error("Invalid JSON response from analysis");
    }

    // Now separately get the enhanced content
    // This separate call allows more token space for the enhancement
    console.log("[DEBUG] Getting enhanced content in a separate call");
    
    // Create a set of specific improvement instructions based on the analysis
    const improvementInstructions = [
      ...analysis.improvements || [],
      ...analysis.formattingFixes || []
    ].filter(Boolean).join("\n");
    
    const enhanceResponse = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are an expert resume enhancer. Your task is to enhance the provided resume while PRESERVING ALL ORIGINAL CONTENT.

⚠️ ABSOLUTELY CRITICAL: You must INCLUDE EVERY PIECE OF INFORMATION from the original resume.

Follow these strict rules:
1. START by making an exact copy of the original resume content
2. NEVER delete any experience, skills, education, or details
3. ENHANCE the content by adding more keywords and improving phrasing
4. Ensure the enhanced version contains 100% of the original information
5. The enhanced content must be LONGER than the original, never shorter
6. Format with HTML for readability

Return ONLY the enhanced HTML content in this format:
<div class="resume">
  <div class="header">
    <h1>[Full Name]</h1>
    <p class="contact-info">[Email] | [Phone] | [Location]</p>
  </div>

  <div class="section">
    <h2>[Section Title]</h2>
    <p>[Enhanced content that includes ALL original information plus improvements]</p>
    <!-- Add more sections as needed -->
  </div>
</div>`
        },
        {
          role: "user",
          content: `Original Resume Content:
${processedContent}

Based on analysis, here are specific improvements to make:
${improvementInstructions || "Add more relevant keywords and improve formatting"}

Enhance this resume while PRESERVING 100% of the original content. Return ONLY the enhanced HTML version. The enhanced version must include ALL the information from the original resume.`
        }
      ],
      temperature: 0.2,
      max_tokens: 4000,
    });

    // Extract the enhanced content
    let enhancedHtml = "";
    try {
      enhancedHtml = enhanceResponse.choices[0].message.content?.trim() || "";
      
      // Validate that we got HTML content
      if (!enhancedHtml.includes("<div") || !enhancedHtml.includes("</div>")) {
        console.log("[WARNING] Enhanced content doesn't appear to be valid HTML, using fallback");
        enhancedHtml = fallbackHtml;
      }
    } catch (error) {
      console.error("[DEBUG] Error extracting enhanced content:", error);
      enhancedHtml = fallbackHtml;
    }
    
    // Check enhanced content length compared to original
    // Extract text content from HTML for fair comparison
    const textContent = enhancedHtml.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    const originalTextContent = processedContent.replace(/\s+/g, ' ').trim();
    
    console.log("[DEBUG] Original content length:", originalTextContent.length);
    console.log("[DEBUG] Enhanced content text length:", textContent.length);
    console.log("[DEBUG] Enhanced content HTML length:", enhancedHtml.length);
    
    // Verify the enhanced content is adequate
    // Relaxed constraints since HTML adds significant length
    if (textContent.length < originalTextContent.length * 0.8) {
      console.log("[WARNING] Enhanced content appears shorter than original content");
      console.log("[DEBUG] Using fallback enhanced content instead");
      enhancedHtml = fallbackHtml;
    }

    // Create the combined result with both analysis and enhanced content
    const result = {
      ...analysis,
      enhancedContent: enhancedHtml,
      // Set default values if not provided by the analysis
      overallScore: analysis.overallScore || 75,
      categoryScores: {
        atsCompliance: analysis.categoryScores?.atsCompliance || {
          score: 75,
          feedback: ["Use industry-specific keywords"],
          description: "Basic ATS compliance"
        },
        keywordDensity: analysis.categoryScores?.keywordDensity || {
          score: 75,
          feedback: ["Add more relevant skills"],
          identifiedKeywords: [],
          description: "Keyword density is adequate"
        },
        recruiterFriendliness: analysis.categoryScores?.recruiterFriendliness || {
          score: 75,
          feedback: ["Improve readability with better formatting"],
          description: "Resume is moderately recruiter-friendly"
        },
        conciseness: analysis.categoryScores?.conciseness || {
          score: 75,
          feedback: ["Focus on most relevant experiences"],
          description: "Resume has reasonable length"
        }
      },
      improvements: analysis.improvements || ["Enhance keyword density", "Improve formatting"],
      formattingFixes: analysis.formattingFixes || ["Consistent spacing", "Better section organization"]
    };

    // Calculate the overall score from category scores if not provided
    if (!result.overallScore && result.categoryScores) {
      const weights = {
        atsCompliance: 0.30,
        keywordDensity: 0.25,
        recruiterFriendliness: 0.25,
        conciseness: 0.20
      };

      result.overallScore = Math.round(
        weights.atsCompliance * result.categoryScores.atsCompliance.score +
        weights.keywordDensity * result.categoryScores.keywordDensity.score +
        weights.recruiterFriendliness * result.categoryScores.recruiterFriendliness.score +
        weights.conciseness * result.categoryScores.conciseness.score
      );
    }

    // Validate result structure to ensure it conforms to our schema
    try {
      return analysisResponseSchema.parse(result);
    } catch (validationError) {
      console.error("[DEBUG] Validation error with result, using defaults:", validationError);
      
      // If validation fails, return a minimal valid object
      return {
        categoryScores: {
          atsCompliance: {
            score: 75,
            feedback: ["Use industry-specific keywords"],
            description: "Basic ATS compliance"
          },
          keywordDensity: {
            score: 75,
            feedback: ["Add more relevant skills"],
            identifiedKeywords: ["skill"],
            description: "Keyword density is adequate"
          },
          recruiterFriendliness: {
            score: 75,
            feedback: ["Improve readability"],
            description: "Resume is moderately recruiter-friendly"
          },
          conciseness: {
            score: 75,
            feedback: ["Focus on relevant experiences"],
            description: "Resume has reasonable length"
          }
        },
        improvements: ["Enhance keyword density", "Improve formatting"],
        formattingFixes: ["Consistent spacing", "Better section organization"],
        enhancedContent: enhancedHtml,
        overallScore: 75
      };
    }
  } catch (error) {
    console.error("Resume analysis failed:", error);
    if (error instanceof z.ZodError) {
      console.error("Validation error:", error.errors);
    }
    throw new Error("Failed to analyze resume");
  }
}