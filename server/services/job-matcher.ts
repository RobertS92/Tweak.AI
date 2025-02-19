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
    skillMatching: z.object({
      score: z.number(),
      matchedSkills: z.array(z.string()),
      missingSkills: z.array(z.string()),
      relatedSkills: z.array(z.string())
    }),
    experienceRelevance: z.object({
      score: z.number(),
      yearsMatch: z.boolean(),
      roleAlignmentScore: z.number(),
      industrySimilarity: z.number(),
      careerProgressionMatch: z.boolean()
    }),
    educationalBackground: z.object({
      score: z.number(),
      degreeMatch: z.boolean(),
      fieldRelevance: z.number(),
      certificationsValue: z.number()
    }),
    technicalProficiency: z.object({
      score: z.number(),
      toolsMatch: z.array(z.string()),
      technicalSkillsGap: z.array(z.string()),
      proficiencyLevel: z.string()
    }),
    softSkillsFit: z.object({
      score: z.number(),
      culturalAlignment: z.number(),
      communicationScore: z.number(),
      leadershipMatch: z.boolean()
    })
  })
});

export async function matchJob(resumeContent: string, jobDescription: string) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o", 
      messages: [
        {
          role: "system",
          content: `You are an expert ATS and job matching specialist. Analyze the resume against the job description using this comprehensive scoring system:

1. Skill Matching (30% of total score)
   - Direct keyword matches
   - Related/transferable skills
   - Skill depth assessment

2. Experience Relevance (25% of total score)
   - Years of experience match
   - Role similarity
   - Industry relevance
   - Career progression alignment

3. Educational Background (15% of total score)
   - Degree requirements match
   - Field of study relevance
   - Certifications value

4. Technical Proficiency (20% of total score)
   - Tools and technologies match
   - Technical skill level assessment
   - Gap analysis

5. Soft Skills & Cultural Fit (10% of total score)
   - Communication skills
   - Leadership capabilities
   - Cultural alignment indicators

Return a detailed JSON analysis with scores and explanations for each category.`
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

    // Calculate weighted total score
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
      model: "gpt-4o", 
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

Return optimized content in clean HTML format with semantic structure.`
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
      keywordMatches: result.keywordMatches || [],
      formattingImprovements: result.formattingImprovements || []
    };
  } catch (error) {
    console.error("Resume tweaking failed:", error);
    throw new Error("Failed to tweak resume");
  }
}