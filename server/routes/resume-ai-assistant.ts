import { Router } from "express";
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const router = Router();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Helper function: returns a fallback message based on section id.
function getFallbackMessage(sectionId: string): string {
  switch (sectionId) {
    case "professional-summary":
      return `I notice your resume doesn't include a Professional Summary section. This brief introduction at the top of your resume highlights your professional identity and key qualifications.

Here's how to create an effective Professional Summary:

• Keep it concise (3-4 sentences maximum)
• Start with your professional title and years of experience
• Highlight 2-3 key skills relevant to your target position
• Include a notable achievement or qualification that sets you apart
• Optional: briefly mention your career goals

Focus on your most impressive and relevant qualities that match what employers in your target field are seeking.

Tell me a little about your professional background, target role, and key strengths, and I'll help write a compelling professional summary for you.`;

    case "work-experience":
      return `I notice your resume doesn't include a Work Experience section. This critical section shows employers how you've applied your skills in professional settings.

Here's how to create an effective Work Experience section:

• List positions in reverse-chronological order (most recent first)
• For each role include:
  - Your job title
  - Company name and location
  - Dates of employment (month/year)
• Use 3-5 bullet points per role that:
  - Start with strong action verbs
  - Focus on accomplishments rather than duties
  - Include measurable results when possible
  - Highlight relevant skills and responsibilities

Tailor your descriptions to emphasize experience that relates to your target position.

Tell me about your work history, including job titles, companies, dates, and key responsibilities or achievements, and I'll help craft effective job descriptions for your resume.`;

    case "education":
      return `I notice your resume doesn't include an Education section. This section provides important information about your academic background and qualifications.

Here's how to create an effective Education section:

• List education in reverse-chronological order (most recent first)
• For each entry include:
  - Degree/certificate name
  - Institution name and location
  - Graduation date (or expected date)
  - GPA if it's 3.0 or higher (optional)
• You may also include:
  - Relevant coursework
  - Academic honors or awards
  - Extracurricular activities that demonstrate relevant skills

Keep this section concise and focused on education that's relevant to your career goals.

Tell me about your educational background, including degrees, institutions, graduation dates, and any notable achievements, and I'll help format this section for your resume.`;

    case "skills":
      return `I notice your resume doesn't include a Skills section. This section allows employers to quickly identify your specific capabilities relevant to the position.

Here's how to create an effective Skills section:

• Organize skills into logical categories (technical, professional, etc.)
• List 8-12 skills that are most relevant to your target positions
• Include a mix of:
  - Technical skills (software, tools, programming languages)
  - Industry-specific skills (specialized knowledge areas)
  - Transferable skills (relevant soft skills)
• Consider formatting as a simple list or using visualization for skill levels

Review job descriptions in your field to identify key skills employers are seeking.

Tell me about your key technical, professional, and soft skills relevant to your target role, and I'll help organize them into an effective Skills section for your resume.`;

    case "projects":
      return `I notice your resume doesn't include a Projects section. This section helps demonstrate your practical skills and accomplishments, particularly valuable if you're early in your career or changing fields.

Here's how to create an effective Projects section:

• Include 2-4 relevant projects that showcase skills related to your target role
• For each project, provide:
  - A clear title and timeframe
  - A brief 1-2 sentence description explaining the purpose
• Use bullet points to highlight:
  - What you did (your role and contributions)
  - How you did it (methods, tools, or technologies used)
  - Results achieved (impact or outcomes if applicable)

Focus on projects that are relevant to the positions you're applying for, whether they're professional, academic, volunteer, or personal initiatives.

Tell me about some relevant projects you've worked on, including their purpose, your role, and key outcomes, and I'll help format them effectively for your resume.`;

    case "certifications":
      return `I notice your resume doesn't include a Certifications section. Professional certifications can significantly strengthen your candidacy by demonstrating specialized knowledge and commitment to your field.

Here's how to create an effective Certifications section:

• List certifications in order of relevance to your target role
• For each certification include:
  - Full name of the certification (avoid acronyms only)
  - Issuing organization
  - Date obtained or expiration date
  - Credential ID or verification details (if applicable)
• Include only current or active certifications unless a lapsed certification demonstrates relevant knowledge

Focus on certifications that are recognized in your industry and relevant to your target positions.

Tell me about any professional certifications, courses, or specialized training you've completed, and I'll help format them properly for your resume.`;

    default:
      return "[No content provided]";
  }
}

router.post("/resume-ai-assistant", async (req, res) => {
  let sectionId = "unknown";
  console.log("[DEBUG] Starting AI assistant request processing");

  try {
    const {
      sectionId: incomingSectionId,
      sectionContent,
      userQuery,
    } = req.body || {};

    sectionId = incomingSectionId || "unknown";

    console.log("[DEBUG] AI Assistant request details:", {
      sectionId,
      contentLength: sectionContent?.length,
      userQuery,
    });

    // Check if section content is empty
    const isEmptySection = !sectionContent || sectionContent.trim().length === 0;

    // If section is empty, return the fallback message directly without sending to OpenAI
    if (isEmptySection) {
      return res.json({
        revision: getFallbackMessage(sectionId),
        improvements: [],
      });
    }

    // Only proceed with OpenAI processing if there's actual content to revise
    console.log("[DEBUG] Processing section with content:", sectionId);
    console.log(
      "[DEBUG] Content sample:",
      sectionContent.substring(0, 100) + "..."
    );

    const messages = [
      {
        role: "system",
        content: `You are a professional resume writing assistant. Your task is to produce a final revised version of the given resume section.
        
When analyzing professional summaries:
- Check for clear articulation of professional identity and experience level
- Ensure key skills relevant to target role are highlighted
- Verify presence of notable achievements or qualifications
- Suggest improvements to make language more impactful and concise
- Ensure alignment with target position/industry

When analyzing work experience:
- Check impact and clarity of descriptions
- Suggest stronger action verbs and quantifiable achievements
- Identify missing key details (responsibilities, results, technologies)
- Provide specific examples of improvements

When analyzing education:
- Verify degree information completeness
- Suggest relevant coursework to highlight
- Recommend academic achievements to include

When analyzing skills sections:
- Evaluate skills relevance to the specific job/industry mentioned by the user
- Prioritize skills that match keywords from target job descriptions
- Suggest reorganizing skills by importance to the target role
- Recommend removing generic skills that don't add value for the specific position
- Suggest adding industry-specific technical skills that may be missing
- Check for appropriate balance between technical, professional, and soft skills based on job context
- Ensure skills are presented with appropriate proficiency levels when relevant
- Recommend modern or trending skills in the specified field that could strengthen the application

Return your response as plain text (no HTML or markdown tags) in the following exact format:

Revised Version:
"[Your revised text here]"

The revised version must be written as a coherent, professionally formatted paragraph exactly as it should appear on the resume so that the user can copy and paste it directly.`
      },
      {
        role: "user",
        content: `I'm working on the "${sectionId}" section of my resume. Here's the current content:

${sectionContent}

${userQuery || "Please produce a revised version for this section."}`
      }
    ];

    console.log("[DEBUG] Sending request to OpenAI");

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: messages as any,
      temperature: 0.7,
      max_tokens: 1500,
    });

    const aiResponse = completion.choices[0]?.message?.content || "";
    console.log("[DEBUG] AI Response received:", {
      length: aiResponse.length,
      sample: aiResponse.substring(0, 100) + "..."
    });

    // Extract the revised version by removing the marker if present.
    // Expected format: Revised Version: "[Your revised text here]"
    const marker = "Revised Version:";
    let revisedText = aiResponse;
    const markerIndex = aiResponse.indexOf(marker);
    if (markerIndex !== -1) {
      revisedText = aiResponse.substring(markerIndex + marker.length).trim();
      // Remove surrounding quotes if present.
      revisedText = revisedText.replace(/^"|"$/g, "");
    }

    return res.json({
      revision: revisedText,
      improvements: [],
    });
  } catch (error) {
    console.error("[DEBUG] AI Assistant error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[DEBUG] Error details:", errorMessage);
    return res.status(500).json({
      error: "Failed to get AI suggestions",
      details: errorMessage,
    });
  } finally {
    console.log("[DEBUG] AI Assistant request completed for section:", sectionId);
  }
});

export { router as default };