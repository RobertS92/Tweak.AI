import { Router } from "express";
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const router = Router();

// Get OpenAI configuration
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

• List positions in reverse chronological order
• Include company name, title, and dates
• Use bullet points to describe achievements
• Start each bullet with strong action verbs
• Include metrics and specific results
• Focus on relevant responsibilities

Tell me about your work history, and I'll help format it effectively for your resume.`;

    case "education":
      return `I notice your resume doesn't include an Education section. This section establishes your academic credentials and qualifications.

Here's how to create an effective Education section:

• List degrees in reverse chronological order
• Include institution name, degree, and graduation date
• Add relevant coursework if applicable
• Include GPA if 3.5 or higher
• List academic honors or achievements
• Include relevant certifications

Tell me about your educational background, and I'll help format it effectively for your resume.`;

    case "skills":
      return `I notice your resume doesn't include a Skills section. This section showcases your technical and professional capabilities.

Here's how to create an effective Skills section:

• Group skills by category (Technical, Soft Skills, etc.)
• List most relevant skills first
• Include proficiency levels if applicable
• Focus on skills mentioned in job descriptions
• Include both hard and soft skills
• Keep descriptions concise

Tell me about your key skills and areas of expertise, and I'll help organize them effectively for your resume.`;

    case "projects":
      return `I notice your resume doesn't include a Projects section. This section demonstrates practical application of your skills.

Here's how to create an effective Projects section:

• Include 2-4 relevant projects that showcase skills related to your target role
• For each project, provide:
  - A clear title and timeframe
  - A brief 1-2 sentence description explaining the purpose
• Use bullet points to highlight:
  - What you did (your role and contributions)
  - How you did it (methods, tools, or technologies used)
  - Results achieved (impact or outcomes if applicable)

Tell me about some relevant projects you've worked on, and I'll help format them effectively for your resume.`;

    case "certifications":
      return `I notice your resume doesn't include a Certifications section. Professional certifications can demonstrate specialized knowledge and commitment to your field.

Here's how to create an effective Certifications section:

• List relevant certifications in reverse chronological order
• Include:
  - Full certification name
  - Issuing organization
  - Date obtained/expiration
  - Credential ID (if applicable)
• Focus on active and relevant certifications

Tell me about any professional certifications you've earned, and I'll help format them effectively for your resume.`;

    default:
      return "Please provide information about your background and experience, and I'll help you create effective content for this section.";
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

    // Return fallback message for empty sections unless user explicitly asks to generate content
    if (isEmptySection && (!userQuery || userQuery === "Please analyze this section and suggest improvements.")) {
      console.log("[DEBUG] Returning fallback message for empty section:", sectionId);
      return res.json({
        revision: getFallbackMessage(sectionId),
        improvements: [],
      });
    }

    // Determine if this is likely a content creation request based on user query
    const isContentCreationQuery = userQuery && (
      userQuery.toLowerCase().includes("create") ||
      userQuery.toLowerCase().includes("write") ||
      userQuery.toLowerCase().includes("generate") ||
      userQuery.toLowerCase().includes("help me with") ||
      userQuery.toLowerCase().includes("i am a") ||
      userQuery.toLowerCase().includes("i have been") ||
      userQuery.toLowerCase().includes("my experience") ||
      userQuery.toLowerCase().includes("my background") ||
      // If user is responding to our prompt to tell us about themselves
      (isEmptySection && userQuery.length > 30)
    );

    // Choose the appropriate system prompt based on whether this is a 
    // content creation request or a conversation/analysis
    let systemPrompt = "";

    if (isContentCreationQuery) {
      // For content creation requests
      systemPrompt = `You are a professional resume writing assistant who creates compelling resume content based on user input.

For the ${sectionId.replace(/-/g, ' ')} section, create professional, ATS-friendly content that highlights the user's qualifications effectively.

When creating content:
- Use concise, impactful language with strong action verbs
- Incorporate relevant keywords for the user's industry
- Format the content appropriately for the section type
- Focus on achievements and results where possible

For CONTENT CREATION ONLY, format your response as:

"[Your newly created content here]"`;
    } else {
      // For analysis and improvement requests
      systemPrompt = `You are a professional resume writing assistant who helps improve existing resume content.

Analyze the provided ${sectionId.replace(/-/g, ' ')} section and suggest specific improvements:
- Use stronger action verbs
- Add measurable achievements
- Improve clarity and conciseness
- Enhance keyword optimization
- Fix any formatting issues

For CONTENT REVISIONS ONLY, format your response as:

Revised Version:
"[Your revised text here]"`;
    }

    // Only proceed with OpenAI processing
    console.log("[DEBUG] Processing with userQuery:", userQuery);
    console.log("[DEBUG] Is content creation request:", isContentCreationQuery);

    const messages = [
      {
        role: "system",
        content: systemPrompt
      },
      {
        role: "user",
        content: userQuery 
          ? `I'm working on the "${sectionId.replace(/-/g, ' ')}" section of my resume. ${isEmptySection ? "I haven't written anything yet." : "Here's the current content:\n\n" + sectionContent}\n\n${userQuery}`
          : `Please analyze this ${sectionId.replace(/-/g, ' ')} section and suggest improvements:\n\n${sectionContent}`
      }
    ];

    console.log("[DEBUG] Sending request to OpenAI");

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: messages as any,
      temperature: isContentCreationQuery ? 0.7 : 0.5,
      max_tokens: 1500,
    });

    const aiResponse = completion.choices[0]?.message?.content || "";
    console.log("[DEBUG] AI Response received:", {
      length: aiResponse.length,
      sample: aiResponse.substring(0, 100) + "..."
    });

    const marker = "Revised Version:";

    // For content creation queries, format the response
    let revisedText = isContentCreationQuery ? 
      `${marker}\n${aiResponse}` : 
      aiResponse;

    // Handle content creation from user text input
    if (!sectionContent && userQuery && userQuery.length > 30) {
      const systemPrompt = `Create professional resume content for the ${sectionId.replace(/-/g, ' ')} section based on the user's input. Format appropriately for:
- Professional Summary: Clear 3-4 sentence overview
- Work Experience: Position, company, dates, and bullet points
- Education: Degree, institution, dates
- Skills: Organized by category (Technical, Soft Skills)
Return ONLY the formatted content.`;

      messages[0].content = systemPrompt;
      revisedText = aiResponse;
    } else {
      const markerIndex = revisedText.indexOf(marker);

      // Special handling for work experience analysis
      if (sectionId === 'work-experience' && !isContentCreationQuery) {
        const systemPrompt = `Analyze this work experience section and provide specific improvements:
- Suggest stronger action verbs
- Identify missing quantifiable achievements
- Point out areas needing more detail
- Highlight any formatting issues
Return your analysis with specific suggestions.`;

        messages[0].content = systemPrompt;
        revisedText = aiResponse;
      }
      // For content creation with professional summary, return the AI response directly
      else if (isContentCreationQuery && sectionId === 'professional-summary' && userQuery.toLowerCase().includes('write a professional summary')) {
        revisedText = aiResponse;
      }
      // Extract revised version if marker is found
      else if (markerIndex !== -1) {
        revisedText = revisedText.substring(markerIndex + marker.length).trim();
      }
    }

    return res.json({
      revision: revisedText.toLowerCase().includes(sectionId.replace(/-/g, ' ')) ? revisedText : getFallbackMessage(sectionId),
      isContentCreation: isContentCreationQuery,
      hasRevisionMarker: markerIndex !== -1,
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

export default router;