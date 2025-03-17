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
      return `I notice your resume doesn't include a Professional Summary section. This is a crucial 3-4 sentence overview at the top of your resume that highlights your professional identity, key skills, and career achievements.

Professional Summary Template:
First sentence: Your professional identity/title and years of experience
Second sentence: 2-3 key skills or specialties relevant to your target role
Third sentence: Notable achievements or qualifications that set you apart
Optional fourth sentence: Career goals or what you're seeking

Example:
Results-driven Marketing Manager with 5+ years of experience developing digital campaigns for B2B technology companies. Skilled in content strategy, SEO optimization, and marketing analytics with proven success increasing conversion rates. Led campaigns that generated $2M+ in pipeline revenue while reducing CAC by 15%.

How would you like to present yourself professionally in your summary?`;

    case "work-experience":
      return `I notice your resume doesn't include a Work Experience section. This is a critical section that demonstrates your professional background and how you've applied your skills in real-world settings.

Work Experience Template (for each position):
Job Title
Company Name and Location
Employment Dates (Month/Year to Month/Year or Present)
3-5 bullet points describing accomplishments using this format:
Action Verb + Task + Result/Impact (quantify when possible)

Example:
WORK EXPERIENCE
Senior Software Developer
Technovation Inc. - San Francisco, CA
March 2020 - Present
- Redesigned customer-facing API, reducing server load by 40% and improving response times by 30%
- Led a team of 5 developers to deliver a new mobile application feature used by 25,000+ users
- Implemented automated testing protocols that reduced bug reports by 35% in the first quarter
- Collaborated with product and design teams to launch 3 major product updates ahead of schedule

What professional roles have you held that you'd like to include in your resume?`;

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

What educational qualifications would you like to add to your resume?`;

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

What key skills would you like to highlight in your resume?`;

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

What types of projects would you like to include on your resume?`;

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

Do you have any professional certifications or specialized training you'd like to include on your resume?`;

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

    // Use the provided section content if it exists; otherwise, use the fallback message.
    const effectiveSectionContent =
      sectionContent && sectionContent.trim().length > 0
        ? sectionContent
        : getFallbackMessage(sectionId);

    console.log("[DEBUG] Processing section:", sectionId);
    console.log(
      "[DEBUG] Content sample:",
      effectiveSectionContent.substring(0, 100) + "..."
    );

    const messages = [
      {
        role: "system",
        content: `You are a professional resume writing assistant. Your task is to produce a final revised version of the given resume section.

When analyzing work experience:
- Check impact and clarity of descriptions
- Suggest stronger action verbs and quantifiable achievements
- Identify missing key details (responsibilities, results, technologies)
- Provide specific examples of improvements

When analyzing education:
- Verify degree information completeness
- Suggest relevant coursework to highlight
- Recommend academic achievements to include

When analyzing technical sections:
- Ensure skills are clearly presented
- Suggest industry-standard formatting
- Recommend relevant certifications

If the section is empty, provide clear guidance on what information to include based on its category.

Return your response as plain text (no HTML or markdown tags) in the following exact format:

Revised Version:
"[Your revised text here]"

The revised version must be written as a coherent, professionally formatted paragraph exactly as it should appear on the resume so that the user can copy and paste it directly.`
      },
      {
        role: "user",
        content: `I'm working on the "${sectionId}" section of my resume. Here's the current content:

${effectiveSectionContent}

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