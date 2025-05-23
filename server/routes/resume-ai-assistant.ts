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
      question,
      section,
      context
    } = req.body || {};

    // Support both new and old API formats
    sectionId = section || incomingSectionId || "unknown";
    const userQuestion = question || userQuery || "";

    console.log("[DEBUG] AI Assistant request details:", {
      sectionId,
      contentLength: sectionContent?.length || context?.length,
      userQuestion
    });
    
    // If using the new resume builder format, handle it differently
    if (userQuestion && sectionId && context) {
      console.log("[DEBUG] Processing with new resume builder format");
      
      // Create system prompt that's conversational and provides specific resume writing advice
      const systemPrompt = `You are an expert resume assistant helping a user build their resume. You provide specific, actionable advice for creating an impressive resume.

Current context: The user is working on the "${sectionId.replace(/-/g, ' ')}" section of their resume.

${context}

Please respond conversationally as a helpful assistant. Be concise but thorough in your advice. Provide specific examples and suggestions when appropriate. 

If the user is asking you to write content for them, create professional and ATS-friendly content that would help them stand out to recruiters.

IMPORTANT FORMAT: When suggesting improvements to specific content, use this format:
"To improve your ${sectionId.replace(/-/g, ' ')}, I suggest the following changes. Here's an example of how it could look better, try this: '[your suggested text]'"

This specific format allows the application to detect your suggestion and offer a "Tweak" button to the user.

Remember that your advice should be tailored to their specific situation and the section they're working on.`;

      console.log("[DEBUG] Sending request to OpenAI for resume builder");
      
      const completion = await openai.chat.completions.create({
        // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: userQuestion
          }
        ],
        temperature: 0.7,
        max_tokens: 1500,
      });
      
      const aiResponse = completion.choices[0]?.message?.content || "";
      console.log("[DEBUG] AI Response received:", {
        length: aiResponse.length,
        sample: aiResponse.substring(0, 100) + "..."
      });
      
      return res.json({
        answer: aiResponse
      });
    }
    
    // Original code for the old resume format follows
    
    // Check if section content is empty
    const isEmptySection = !sectionContent || sectionContent.trim().length === 0;

    // Return fallback message for empty sections unless user explicitly asks to generate content
    if (isEmptySection && (!userQuestion || userQuestion === "Please analyze this section and suggest improvements.")) {
      console.log("[DEBUG] Returning fallback message for empty section:", sectionId);
      return res.json({
        revision: getFallbackMessage(sectionId),
        improvements: [],
        isContentCreation: true
      });
    }

    // Determine if this is likely a content creation request based on user query
    const isContentCreationQuery = userQuestion && (
      userQuestion.toLowerCase().includes("create") ||
      userQuestion.toLowerCase().includes("write") ||
      userQuestion.toLowerCase().includes("generate") ||
      userQuestion.toLowerCase().includes("help me with") ||
      userQuestion.toLowerCase().includes("i am a") ||
      userQuestion.toLowerCase().includes("i have been") ||
      userQuestion.toLowerCase().includes("my experience") ||
      userQuestion.toLowerCase().includes("my background") ||
      // If user is responding to our prompt to tell us about themselves
      (isEmptySection && userQuestion.length > 30)
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
- Keep the tone professional and confident

Format your output based on the section type:
- For professional summaries: Write a concise 3-4 sentence paragraph
- For work experience entries: Use format "Position: [title]\\nCompany: [company]\\nDate: [date range]\\n• [achievement 1]\\n• [achievement 2]"
- For education entries: Use format "Degree: [degree]\\nInstitution: [institution]\\nDate: [graduation date]\\n• [achievement/honor]"
- For skills: Organize as "Technical Skills:\\n• [skill 1]\\n• [skill 2]\\n\\nSoft Skills:\\n• [skill 3]\\n• [skill 4]"
- For projects: Use format "Project: [title]\\nDate: [date range]\\nDescription: [brief description]\\n• [detail 1]\\n• [detail 2]"
- For certifications: Use format "Certification: [name]\\nIssuing Organization: [organization]\\nDate: [date]\\nID: [credential ID if applicable]"

Return ONLY the ready-to-use content with no explanations, introductions, or additional commentary.`;
    } else {
      // For analysis, revision, or conversation
      systemPrompt = `You are a professional resume writing assistant. You have two main functions:

1. ANALYZING AND REVISING CONTENT: If the user has provided resume content to review, analyze it and suggest improvements.

2. HAVING A CONVERSATION: If the user is asking a question or having a conversation about resume writing, respond conversationally.

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

IMPORTANT: If the user is asking a question or seeking advice (rather than requesting a revision), respond conversationally without using the "Revised Version:" format.

For CONTENT REVISIONS ONLY, format your response as:

Revised Version:
"[Your revised text here]"`;
    }

    // Only proceed with OpenAI processing
    console.log("[DEBUG] Processing with userQuery:", userQuestion);
    console.log("[DEBUG] Is content creation request:", isContentCreationQuery);

    const messages = [
      {
        role: "system",
        content: systemPrompt
      },
      {
        role: "user",
        content: userQuestion 
          ? `I'm working on the "${sectionId.replace(/-/g, ' ')}" section of my resume. ${isEmptySection ? "I haven't written anything yet." : "Here's the current content:\n\n" + sectionContent}\n\n${userQuestion}`
          : `Please analyze this ${sectionId.replace(/-/g, ' ')} section and suggest improvements:\n\n${sectionContent}`
      }
    ];

    console.log("[DEBUG] Sending request to OpenAI");

    const completion = await openai.chat.completions.create({
      // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      model: "gpt-4o",
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
    if (!sectionContent && userQuestion && userQuestion.length > 30) {
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
      else if (isContentCreationQuery && sectionId === 'professional-summary' && userQuestion.toLowerCase().includes('write a professional summary')) {
        revisedText = aiResponse;
      } else if (markerIndex !== -1) {
        revisedText = revisedText.substring(markerIndex + marker.length).trim();
      }
    }
    
    // Declare markerIndex for use in the response
    const hasRevisionMarker = revisedText.indexOf(marker) !== -1;

    return res.json({
      revision: revisedText.toLowerCase().includes(sectionId.replace(/-/g, ' ')) ? revisedText : getFallbackMessage(sectionId),
      isContentCreation: isContentCreationQuery,
      hasRevisionMarker: hasRevisionMarker,
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