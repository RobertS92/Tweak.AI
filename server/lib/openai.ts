import OpenAI from "openai";

if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY environment variable is required");
}

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface ResumeAnalysis {
  atsScore: number;
  strengths: string[];
  weaknesses: string[];
  improvements: string[];
  enhancedContent: string;
}

export async function analyzeResume(content: string): Promise<ResumeAnalysis> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: "You are an expert ATS and resume analyzer. Analyze the given resume and provide detailed feedback with specific improvements. Return the response in JSON format."
      },
      {
        role: "user",
        content
      }
    ],
    response_format: { type: "json_object" }
  });

  const result = response.choices[0]?.message?.content;
  if (!result) {
    throw new Error("Failed to get analysis from OpenAI");
  }

  return JSON.parse(result) as ResumeAnalysis;
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