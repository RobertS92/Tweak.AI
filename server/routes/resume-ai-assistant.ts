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
    const isEmptySection =
      !sectionContent || sectionContent.trim().length === 0;

    // If this is an empty section with no meaningful query, return the fallback message
    // This includes empty queries, blank queries, or the default analysis request
    if (
      isEmptySection &&
      (!userQuery ||
        userQuery.trim() === "" ||
        userQuery === "Please analyze this section and suggest improvements.")
    ) {
      console.log(
        "[DEBUG] Empty section with no meaningful query - returning fallback message",
      );
      return res.json({
        revision: getFallbackMessage(sectionId),
        improvements: [],
      });
    }

    // If there's a meaningful user query for an empty section, this is likely a
    // response to our fallback prompt asking them to provide information
    if (
      isEmptySection &&
      userQuery &&
      userQuery.trim() !== "" &&
      userQuery !== "Please analyze this section and suggest improvements."
    ) {
      console.log(
        "[DEBUG] User query for empty section - likely responding to fallback prompt",
      );

      // This is a content creation request based on the user's response to our fallback
      // Configure the system prompt for content creation
      const systemPrompt = `You are a professional resume writing assistant who creates compelling resume content based on user input.

For the ${sectionId.replace(/-/g, " ")} section, create professional, ATS-friendly content that highlights the user's qualifications effectively.

When creating content:
- Use concise, impactful language with strong action verbs
- Incorporate relevant keywords for the user's industry
- Format the content appropriately for the section type
- Focus on achievements and results where possible
- Keep the tone professional and confident

Format your output based on the section type:
- For professional summaries: Write a concise 3-4 sentence paragraph
- For work experience entries: Use format "Position: [title]\\nCompany: [company]\\nDate: [date range]\\n• [achievement 1]\\n• [achievement 2]"
- For education entries: Use format "Degree: [degree]\\nInstitution: [institution]\\nDate: [graduation date]\\n• [achievement/honor]"
- For skills: Organize as "Technical Skills:\\n• [skill 1]\\n• [skill 2]\\n\\nSoft Skills:\\n• [skill 3]\\n• [skill 4]"
- For projects: Use format "Project: [title]\\nDate: [date range]\\nDescription: [brief description]\\n• [detail 1]\\n• [detail 2]"
- For certifications: Use format "Certification: [name]\\nIssuing Organization: [organization]\\nDate: [date]\\nID: [credential ID if applicable]"

Return ONLY the ready-to-use content with no explanations, introductions, or additional commentary.`;

      const messages = [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: `I'm working on the "${sectionId.replace(/-/g, " ")}" section of my resume. I haven't written anything yet, but here's my information: ${userQuery}`,
        },
      ];

      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: messages as any,
        temperature: 0.7,
        max_tokens: 1500,
      });

      const aiResponse = completion.choices[0]?.message?.content || "";
      console.log("[DEBUG] Content creation response received:", {
        length: aiResponse.length,
        sample: aiResponse.substring(0, 100) + "...",
      });

      return res.json({
        revision: aiResponse,
        isContentCreation: true,
        improvements: [],
      });
    }

    // For cases with existing content, use the normal analysis flow
    // Determine if this is a content revision or conversation request
    const isRevisionRequest =
      !userQuery ||
      userQuery === "Please analyze this section and suggest improvements." ||
      userQuery.toLowerCase().includes("revise") ||
      userQuery.toLowerCase().includes("improve") ||
      userQuery.toLowerCase().includes("update") ||
      userQuery.toLowerCase().includes("enhance") ||
      userQuery.toLowerCase().includes("rewrite");

    let systemPrompt = "";

    if (isRevisionRequest) {
      // For analysis and revision requests
      systemPrompt = `You are a professional resume writing assistant. Your task is to produce a final revised version of the given resume section.

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

Return your response as plain text (no HTML or markdown tags) in the following exact format:

Revised Version:
"[Your revised text here]"

The revised version must be written as a coherent, professionally formatted paragraph exactly as it should appear on the resume so that the user can copy and paste it directly.`;
    } else {
      // For conversation/question-answering
      systemPrompt = `You are a professional resume writing assistant helping a user with their resume. The user is asking a question or seeking advice about the ${sectionId.replace(/-/g, " ")} section of their resume.

Respond in a helpful, conversational manner. Provide practical advice relevant to resume writing best practices. Keep your response focused on their question and the specific section they're working on.

You can see the content of their current ${sectionId.replace(/-/g, " ")} section, which you should reference when relevant to your answer. If they're asking about formatting or content recommendations, give them specific examples tailored to their situation.

DO NOT format your response with "Revised Version:" - this is a conversation, not a content revision.`;
    }

    const messages = [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: userQuery
          ? `I'm working on the "${sectionId.replace(/-/g, " ")}" section of my resume. Here's the current content:\n\n${sectionContent}\n\n${userQuery}`
          : `Please analyze this ${sectionId.replace(/-/g, " ")} section and suggest improvements:\n\n${sectionContent}`,
      },
    ];

    console.log("[DEBUG] Sending request to OpenAI");

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: messages as any,
      temperature: isRevisionRequest ? 0.5 : 0.7,
      max_tokens: 1500,
    });

    const aiResponse = completion.choices[0]?.message?.content || "";
    console.log("[DEBUG] AI Response received:", {
      length: aiResponse.length,
      sample: aiResponse.substring(0, 100) + "...",
    });

    // Handle the response differently based on whether it contains a revision marker
    let revisedText = aiResponse;
    const marker = "Revised Version:";
    const markerIndex = aiResponse.indexOf(marker);

    if (markerIndex !== -1) {
      revisedText = aiResponse.substring(markerIndex + marker.length).trim();
      // Remove surrounding quotes if present.
      revisedText = revisedText.replace(/^"|"$/g, "");
    }

    return res.json({
      revision: revisedText,
      isContentCreation: false,
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
    console.log(
      "[DEBUG] AI Assistant request completed for section:",
      sectionId,
    );
  }
});

export { router as default };
