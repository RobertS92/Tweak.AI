import OpenAI from "openai";
import { z } from "zod";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const categoryResponseSchema = z.object({
  score: z.number(),
  feedback: z.array(z.string()),
  description: z.string()
});

const analysisResponseSchema = z.object({
  categoryScores: z.object({
    atsCompliance: categoryResponseSchema,
    keywordDensity: categoryResponseSchema,
    roleAlignment: categoryResponseSchema,
    recruiterFriendliness: categoryResponseSchema,
    conciseness: categoryResponseSchema
  }),
  overallScore: z.number()
});

function preprocessResume(content: string): string {
  // Remove extra whitespace and normalize line endings
  return content
    .replace(/\r\n/g, '\n')
    .replace(/\s+/g, ' ')
    .trim();
}

// Split content into chunks of roughly equal size
function splitContent(content: string, maxChunkSize: number = 4000): string[] {
  const chunks: string[] = [];
  let currentChunk = '';
  const sentences = content.split(/[.!?]+\s/);

  for (const sentence of sentences) {
    if ((currentChunk + sentence).length > maxChunkSize) {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = '';
      }
      // If a single sentence is too long, split it
      if (sentence.length > maxChunkSize) {
        const words = sentence.split(' ');
        let temp = '';
        for (const word of words) {
          if ((temp + ' ' + word).length > maxChunkSize) {
            chunks.push(temp.trim());
            temp = word;
          } else {
            temp += ' ' + word;
          }
        }
        if (temp) {
          currentChunk = temp;
        }
      } else {
        currentChunk = sentence;
      }
    } else {
      currentChunk += (currentChunk ? ' ' : '') + sentence;
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

export async function analyzeResume(content: string) {
  try {
    const processedContent = preprocessResume(content);
    const chunks = splitContent(processedContent);

    // Analyze the first chunk in detail (usually contains the most important info)
    const mainResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an expert resume analyzer. Analyze this resume excerpt and provide detailed feedback in the following categories:
            1. ATS Compliance: Check formatting, standard sections, and machine readability
            2. Keyword Density: Analyze relevant industry/role keywords and their usage
            3. Role Alignment: Evaluate how well experience matches common job requirements
            4. Recruiter-Friendliness: Assess readability, clarity, and professional presentation
            5. Conciseness & Impact: Review brevity and effectiveness of descriptions

            Provide scores (0-100) and specific feedback points for each category.
            Return response in JSON format matching this structure:
            {
              "categoryScores": {
                "atsCompliance": { "score": number, "feedback": string[], "description": string },
                "keywordDensity": { "score": number, "feedback": string[], "description": string },
                "roleAlignment": { "score": number, "feedback": string[], "description": string },
                "recruiterFriendliness": { "score": number, "feedback": string[], "description": string },
                "conciseness": { "score": number, "feedback": string[], "description": string }
              },
              "overallScore": number
            }`
        },
        {
          role: "user",
          content: chunks[0]
        }
      ],
      response_format: { type: "json_object" }
    });

    // Quick analysis of remaining chunks if any
    let supplementaryScores = [];
    if (chunks.length > 1) {
      for (let i = 1; i < chunks.length; i++) {
        const response = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: "Analyze this resume section and provide a quick score (0-100) for its quality and effectiveness. Return just the number."
            },
            {
              role: "user",
              content: chunks[i]
            }
          ]
        });

        const score = parseInt(response.choices[0].message.content || "0");
        supplementaryScores.push(score);
      }
    }

    const result = JSON.parse(mainResponse.choices[0].message.content);

    // If we have supplementary scores, adjust the overall score
    if (supplementaryScores.length > 0) {
      const avgSupplementaryScore = supplementaryScores.reduce((a, b) => a + b, 0) / supplementaryScores.length;
      result.overallScore = Math.round((result.overallScore + avgSupplementaryScore) / 2);
    }

    const validatedResult = analysisResponseSchema.parse(result);

    return validatedResult;
  } catch (error) {
    console.error('Resume analysis failed:', error);
    throw new Error('Failed to analyze resume');
  }
}