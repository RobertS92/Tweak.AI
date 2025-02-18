import OpenAI from "openai";
import pdfParse from 'pdf-parse-fork';

if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY environment variable is required");
}

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface ResumeAnalysis {
  atsScore: number;
  categoryScores: {
    atsCompliance: {
      score: number;
      feedback: string[];
      description: string;
    };
    keywordDensity: {
      score: number;
      feedback: string[];
      identifiedKeywords: string[];
      description: string;
    };
    roleAlignment: {
      score: number;
      feedback: string[];
      description: string;
    };
    recruiterFriendliness: {
      score: number;
      feedback: string[];
      description: string;
    };
    conciseness: {
      score: number;
      feedback: string[];
      description: string;
    };
  };
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

    const result = analysisResponse.choices[0]?.message?.content;
    if (!result) {
      throw new Error("Failed to get analysis from OpenAI");
    }

    return JSON.parse(result) as ResumeAnalysis;
  } catch (error) {
    console.error("Resume analysis error:", error);
    throw error;
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
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: "Compare the resume to the job description and provide a match score and specific improvements. Return the response in JSON format."
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

  return JSON.parse(result) as JobMatch;
}

export async function generateCoverLetter(
  resumeContent: string,
  jobDescription: string
): Promise<string> {
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
}