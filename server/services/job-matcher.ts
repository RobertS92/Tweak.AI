import OpenAI from "openai";
import { z } from "zod";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const matchResponseSchema = z.object({
  matchScore: z.number(),
  missingKeywords: z.array(z.string()),
  suggestedEdits: z.array(z.string()),
  suggestedRoles: z.array(z.string()).optional(),
  analysis: z.object({
    strengthMatches: z.array(z.string()),
    gapAreas: z.array(z.string()),
    recommendedAdditions: z.array(z.string())
  })
});

export async function matchJob(resumeContent: string, jobDescription: string) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o", 
      messages: [
        {
          role: "system",
          content: `You are an expert resume matcher. Analyze the resume against the job description and provide detailed matching analysis.

Analyze:
1. Match Score: Calculate overall match percentage (0-100)
2. Required Skills/Keywords: Identify missing key requirements
3. Experience Alignment: Compare experience level and relevance
4. Suggested Improvements: Specific ways to better align with the role

If match score is below 70%, analyze the candidate's skills and experience to suggest 3-5 alternative roles that would be a better fit.

Return response in this exact JSON structure:
{
  "matchScore": number,
  "missingKeywords": string[],
  "suggestedEdits": string[],
  "suggestedRoles": string[] (only if matchScore < 70),
  "analysis": {
    "strengthMatches": string[],
    "gapAreas": string[],
    "recommendedAdditions": string[]
  }
}`
        },
        {
          role: "user",
          content: `Resume Content:\n${resumeContent}\n\nJob Description:\n${jobDescription}`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    const validatedResult = matchResponseSchema.parse(result);

    return validatedResult;
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
      model: "gpt-4o", 
      messages: [
        {
          role: "system",
          content: `You are an expert resume optimizer. Enhance the provided resume to better match the job description while maintaining authenticity.

Tasks:
1. Analyze the job description for key requirements and preferred qualifications
2. Modify the resume to better highlight relevant experience and skills
3. Add missing keywords naturally into the content
4. Improve impact of achievements to match job priorities
5. Adjust professional summary to align with the role
6. Keep all enhancements truthful and based on the original content

Format the enhanced resume using this exact HTML structure:
<div class="resume">
  <div class="section">
    <h2>PROFESSIONAL SUMMARY</h2>
    <p>[Enhanced summary content]</p>
  </div>

  <div class="section">
    <h2>EXPERIENCE</h2>
    <div class="job">
      <h3>[Company Name]</h3>
      <p class="job-title">[Title] | [Dates]</p>
      <ul>
        <li>[Enhanced bullet point]</li>
      </ul>
    </div>
  </div>

  <div class="section">
    <h2>EDUCATION</h2>
    <p>[Enhanced education details]</p>
  </div>

  <div class="section">
    <h2>SKILLS</h2>
    <ul>
      <li>[Enhanced skill]</li>
    </ul>
  </div>
</div>`
        },
        {
          role: "user",
          content: `Resume Content:\n${resumeContent}\n\nJob Description:\n${jobDescription}`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    return {
      enhancedContent: result.resumeContent,
      improvements: result.improvements || [],
    };
  } catch (error) {
    console.error("Resume tweaking failed:", error);
    throw new Error("Failed to tweak resume");
  }
}