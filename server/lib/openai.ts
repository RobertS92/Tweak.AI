import OpenAI from "openai";
import pdfParse from 'pdf-parse-fork';

if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY environment variable is required");
}

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Define a type for category scores to avoid repetition
type CategoryScore = {
  score: number;
  feedback: string[];
  description: string;
};

// Extended type for keyword density which includes additional fields
type KeywordDensityScore = CategoryScore & {
  identifiedKeywords: string[];
};

// Create the individual categories as a record to enable type-safe indexing
export type ResumeScoreCategories = {
  atsCompliance: CategoryScore;
  keywordDensity: KeywordDensityScore;
  roleAlignment: CategoryScore;
  recruiterFriendliness: CategoryScore;
  conciseness: CategoryScore;
};

export interface ResumeAnalysis {
  atsScore: number;
  categoryScores: ResumeScoreCategories;
  strengths: string[];
  weaknesses: string[];
  improvements: string[];
  formattingFixes: string[];
  enhancedContent: string;
}

export async function analyzeResume(content: string, fileType: string): Promise<ResumeAnalysis> {
  let textContent: string;

  try {
    // Handle different file types
    if (fileType === 'application/pdf') {
      const dataBuffer = Buffer.from(content, 'base64');
      const pdfData = await pdfParse(dataBuffer);
      textContent = pdfData.text;
    } else if (fileType === 'text/plain') {
      textContent = content;
    } else {
      textContent = Buffer.from(content, 'base64').toString('utf-8');
    }

    const analysisResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an expert ATS and resume analyzer. Analyze the given resume and provide detailed feedback with specific improvements.
Focus on these key categories:
1. ATS Compliance: Parsing, formatting, keyword optimization
2. Keyword Density: Measures industry-relevant keywords
3. Role Alignment: Matches experience to job expectations
4. Recruiter Friendliness: Bullet clarity, readability
5. Conciseness & Impact: Checks action-oriented language

Return a JSON response with the following structure:
{
  "atsScore": number (1-100),
  "categoryScores": {
    "atsCompliance": { 
      "score": number,
      "feedback": string[],
      "description": "Parsing, formatting, keyword optimization"
    },
    "keywordDensity": { 
      "score": number,
      "feedback": string[],
      "identifiedKeywords": string[],
      "description": "Measures industry-relevant keywords"
    },
    "roleAlignment": { 
      "score": number,
      "feedback": string[],
      "description": "Matches experience to job expectations"
    },
    "recruiterFriendliness": { 
      "score": number,
      "feedback": string[],
      "description": "Bullet clarity, readability"
    },
    "conciseness": { 
      "score": number,
      "feedback": string[],
      "description": "Checks action-oriented language"
    }
  },
  "strengths": string[],
  "weaknesses": string[],
  "improvements": string[],
  "formattingFixes": string[],
  "enhancedContent": string
}

The enhancedContent should be an improved version of the resume with better formatting and clearer content.`
        },
        {
          role: "user",
          content: textContent
        }
      ],
      response_format: { type: "json_object" }
    });

    // Import our validators for score sanitization
    const { ensureValidScore } = require('../utils/validators');
    
    const result = analysisResponse.choices[0]?.message?.content;
    if (!result) {
      throw new Error("Failed to get analysis from OpenAI");
    }

    try {
      const parsedResult = JSON.parse(result) as ResumeAnalysis;
      
      // Sanitize all scores to ensure they're valid numbers between 0-100
      parsedResult.atsScore = ensureValidScore(parsedResult.atsScore);
      
      // Ensure atsScore is between 0-100
      if (parsedResult.atsScore < 0) parsedResult.atsScore = 0;
      if (parsedResult.atsScore > 100) parsedResult.atsScore = 100;
      
      // Sanitize all category scores
      // Define the known categories to avoid TypeScript errors
      const categories = [
        'atsCompliance', 
        'keywordDensity', 
        'roleAlignment', 
        'recruiterFriendliness', 
        'conciseness'
      ] as const;
      
      // Type-safe iteration over known categories
      categories.forEach(category => {
        if (parsedResult.categoryScores[category]) {
          const originalScore = parsedResult.categoryScores[category].score;
          parsedResult.categoryScores[category].score = ensureValidScore(originalScore);
          
          // Ensure category score is between 0-100
          if (parsedResult.categoryScores[category].score < 0) 
            parsedResult.categoryScores[category].score = 0;
          if (parsedResult.categoryScores[category].score > 100) 
            parsedResult.categoryScores[category].score = 100;
        }
      });
      
      // Ensure we have all the required fields, providing defaults if needed
      if (!parsedResult.strengths || !Array.isArray(parsedResult.strengths)) {
        parsedResult.strengths = ["Resume structure", "Content organization"];
      }
      
      if (!parsedResult.weaknesses || !Array.isArray(parsedResult.weaknesses)) {
        parsedResult.weaknesses = ["Could use more quantifiable achievements", "Keywords may need enhancement"];
      }
      
      if (!parsedResult.improvements || !Array.isArray(parsedResult.improvements)) {
        parsedResult.improvements = ["Add more industry-specific keywords", "Quantify your achievements with metrics"];
      }
      
      if (!parsedResult.formattingFixes || !Array.isArray(parsedResult.formattingFixes)) {
        parsedResult.formattingFixes = ["Ensure consistent spacing", "Use bullet points for achievements"];
      }
      
      // If no enhanced content was provided, use the original
      if (!parsedResult.enhancedContent) {
        parsedResult.enhancedContent = textContent;
      }
      
      console.log("[DEBUG] Resume analysis scores validated successfully");
      return parsedResult;
    } catch (error) {
      console.error("[DEBUG] Error parsing or validating OpenAI response:", error);
      throw error;
    }
  } catch (error) {
    console.error("Resume analysis error:", error);
    
    // Instead of throwing, return a fallback structure
    // with default values and a message explaining the issue
    return {
      atsScore: 65, // Default middle-range score
      categoryScores: {
        atsCompliance: {
          score: 65,
          feedback: ["Unable to fully analyze ATS compliance"],
          description: "Parsing, formatting, keyword optimization"
        },
        keywordDensity: {
          score: 65,
          feedback: ["Review industry keywords in your resume"],
          identifiedKeywords: ["experience", "skills", "education"],
          description: "Measures industry-relevant keywords"
        },
        roleAlignment: {
          score: 65,
          feedback: ["Consider tailoring your resume to specific roles"],
          description: "Matches experience to job expectations"
        },
        recruiterFriendliness: {
          score: 70,
          feedback: ["Ensure content is easy to scan"],
          description: "Bullet clarity, readability"
        },
        conciseness: {
          score: 65,
          feedback: ["Focus on action-oriented language"],
          description: "Checks action-oriented language"
        }
      },
      strengths: [
        "Resume has been submitted for analysis",
        "Basic structure appears to be in place"
      ],
      weaknesses: [
        "Analysis encountered technical difficulties",
        "Unable to provide detailed feedback at this time"
      ],
      improvements: [
        "Try submitting again later for a complete analysis",
        "Consider reviewing industry best practices for resume optimization"
      ],
      formattingFixes: [
        "Ensure consistent spacing throughout",
        "Use bullet points for clarity"
      ],
      // Use an empty string if content is undefined (shouldn't happen but TypeScript is warning about it)
      enhancedContent: content || ""
    };
  }
}

export interface JobMatch {
  matchScore: number;
  missingKeywords: string[];
  suggestedEdits: string[];
}

export async function matchJobDescription(
  resumeContent: string, 
  jobDescription: string
): Promise<JobMatch> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    messages: [
      {
        role: "system",
        content: `Analyze the resume against the job description and return a JSON response with this exact structure:
{
  "matchScore": number,
  "missingKeywords": string[],
  "suggestedEdits": string[],
  "analysis": {
    "skillMatching": {
      "score": number,
      "matchedSkills": string[],
      "missingSkills": string[]
    }
  }
}`
      },
      {
        role: "user",
        content: `Resume: ${resumeContent}\n\nJob Description: ${jobDescription}`
      }
    ],
    response_format: { type: "json_object" }
  });

  const result = response.choices[0]?.message?.content;
  if (!result) {
    throw new Error("Failed to get job match from OpenAI");
  }

  // Log response structure for debugging
  console.log("[DEBUG] OpenAI raw response structure:", {
      model: response.model,
      choices: response.choices.length,
      rawContent: response.choices[0]?.message?.content || "null content"
    });

    try {
      // Import our validators for score sanitization
      const { ensureValidScore } = require('../utils/validators');
      
      // Safely get content with fallback
      const messageContent = response.choices[0]?.message?.content;
      if (!messageContent) {
        throw new Error("Empty response from OpenAI");
      }
      
      const parsedContent = JSON.parse(messageContent);
      console.log("[DEBUG] Parsed OpenAI response:", parsedContent);
      
      // Sanitize the matchScore to ensure it's a valid number between 0-100
      const originalScore = parsedContent.matchScore;
      parsedContent.matchScore = ensureValidScore(originalScore);
      
      // Clamp to 0-100 range
      if (parsedContent.matchScore < 0) parsedContent.matchScore = 0;
      if (parsedContent.matchScore > 100) parsedContent.matchScore = 100;
      
      // If there's a skill matching score, validate it too
      if (parsedContent.analysis?.skillMatching?.score !== undefined) {
        const originalSkillScore = parsedContent.analysis.skillMatching.score;
        parsedContent.analysis.skillMatching.score = ensureValidScore(originalSkillScore);
        
        // Clamp to 0-100 range
        if (parsedContent.analysis.skillMatching.score < 0) 
          parsedContent.analysis.skillMatching.score = 0;
        if (parsedContent.analysis.skillMatching.score > 100) 
          parsedContent.analysis.skillMatching.score = 100;
      }
      
      console.log("[DEBUG] Match score sanitized:", originalScore, "->", parsedContent.matchScore);
      return parsedContent as JobMatch;
    } catch (error) {
      console.error("[DEBUG] Failed to parse or validate OpenAI response:", error);
      
      // Return a fallback structure instead of throwing an error
      // This ensures the client doesn't break if OpenAI has issues
      return {
        matchScore: 50, // Default middle score
        missingKeywords: ["Unable to process keywords"],
        suggestedEdits: ["Review the job description manually and update your resume accordingly"]
      };
    }
}

export async function generateCoverLetter(
  resumeContent: string,
  jobDescription: string
): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "Generate a professional cover letter based on the resume and job description."
        },
        {
          role: "user",
          content: `Resume: ${resumeContent}\n\nJob Description: ${jobDescription}`
        }
      ]
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Failed to generate cover letter from OpenAI");
    }

    return content;
  } catch (error) {
    console.error("Cover letter generation failed:", error);
    
    // Return a fallback cover letter that encourages the user to try again
    // but still provides them with a usable template
    return `Dear Hiring Manager,

Thank you for the opportunity to apply for the position with your company. While I was unable to generate a personalized cover letter at this time due to a processing error, I am very interested in this role and believe my qualifications align well with your requirements.

My resume highlights my relevant experience and skills that would make me a strong candidate for this position. I am particularly drawn to this opportunity because it matches my career goals and allows me to leverage my expertise.

I would welcome the chance to discuss how my background, skills, and achievements would benefit your organization. Please feel free to contact me at your convenience to arrange an interview.

Thank you for your consideration.

Sincerely,
[Your Name]`;
  }
}