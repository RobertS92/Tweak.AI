import { Router } from "express";
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const router = Router();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Store interview contexts
const interviewSessions = new Map();

router.post("/interview/analyze", async (req, res) => {
  try {
    console.log("[DEBUG] Starting job description analysis");
    const { jobDescription } = req.body;

    if (!jobDescription) {
      return res.status(400).json({
        error: "Missing job description",
        details: "Please provide a job description to analyze"
      });
    }

    console.log("[DEBUG] Analyzing job description length:", jobDescription.length);

    const analysis = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are an expert technical interviewer. Analyze job descriptions and create a comprehensive interview strategy. Return response as JSON with:
{
  "roleAnalysis": {
    "title": "Job title",
    "level": "Experience level",
    "domain": "Industry/domain",
    "type": "Job type (e.g., technical, management)"
  },
  "requiredSkills": {
    "technical": ["skill1", "skill2"],
    "soft": ["skill1", "skill2"]
  },
  "keyResponsibilities": ["resp1", "resp2"],
  "suggestedTopics": {
    "technical": ["topic1", "topic2"],
    "behavioral": ["topic1", "topic2"],
    "domain": ["topic1", "topic2"]
  },
  "questionStrategy": {
    "introduction": "Opening statement",
    "technicalDepth": "How deep to go technically",
    "focusAreas": ["area1", "area2"],
    "redFlags": ["flag1", "flag2"]
  }
}`
        },
        {
          role: "user",
          content: `Analyze this job description and create a comprehensive interview strategy:\n\n${jobDescription}`
        }
      ],
      temperature: 0.7
    });

    console.log("[DEBUG] Analysis completed");
    return res.json({ analysis: JSON.parse(analysis.choices[0].message.content) });
  } catch (error) {
    console.error("[DEBUG] Job analysis error:", error);
    return res.status(500).json({
      error: "Failed to analyze job description",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

router.post("/interview/start", async (req, res) => {
  try {
    console.log("[DEBUG] Starting interview session setup");
    const { jobDescription } = req.body;

    if (!jobDescription) {
      return res.status(400).json({
        error: "Missing required fields",
        details: "Job description is required"
      });
    }

    console.log("[DEBUG] Creating interview plan");

    // Generate initial interview context
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are an experienced technical interviewer. Create a natural, conversational interview opening that:
1. Introduces yourself briefly
2. Makes the candidate comfortable
3. Sets expectations for the interview
4. Asks an engaging first question

Keep your response conversational and natural, as it will be spoken aloud.
Focus on building rapport while staying professional.`
        },
        {
          role: "user",
          content: `Start an interview for this job description, introducing yourself and asking the first question:\n\n${jobDescription}`
        }
      ],
      temperature: 0.7
    });

    const sessionId = Date.now().toString();
    const response = completion.choices[0].message.content;

    // Store interview context
    interviewSessions.set(sessionId, {
      jobDescription,
      currentQuestion: response,
      history: [{ role: "interviewer", content: response }],
      analysis: null
    });

    console.log("[DEBUG] Interview session created:", sessionId);
    res.json({
      sessionId,
      question: response,
    });
  } catch (error) {
    console.error("[DEBUG] Interview start error:", error);
    res.status(500).json({
      error: "Failed to start interview",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

router.post("/interview/respond", async (req, res) => {
  try {
    console.log("[DEBUG] Processing interview response");
    const { sessionId, answer } = req.body;

    if (!sessionId || !answer) {
      return res.status(400).json({
        error: "Missing required fields",
        details: "Session ID and answer are required"
      });
    }

    const session = interviewSessions.get(sessionId);
    if (!session) {
      return res.status(404).json({
        error: "Session not found",
        details: "Interview session has expired or is invalid"
      });
    }

    // Add user's answer to history
    session.history.push({ role: "candidate", content: answer });
    console.log("[DEBUG] Answer received for session:", sessionId);

    // Generate follow-up question or feedback
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are conducting a natural, conversational technical interview. For each candidate response:
1. Listen actively and acknowledge their response
2. Provide subtle, conversational feedback
3. Ask relevant follow-up questions
4. Keep the conversation flowing naturally

Format your response conversationally, as it will be spoken aloud.
Guide the conversation while keeping it natural and engaging.
Focus on exploring the candidate's experience and knowledge.`
        },
        {
          role: "user",
          content: `Job Description: ${session.jobDescription}
Previous Conversation: ${JSON.stringify(session.history)}
Latest Answer: ${answer}

Generate a natural follow-up response and question.`
        }
      ],
      temperature: 0.8
    });

    const response = completion.choices[0].message.content;
    session.history.push({ role: "interviewer", content: response });
    session.currentQuestion = response;

    console.log("[DEBUG] Generated follow-up response");
    res.json({
      feedback: response,
      sessionId
    });
  } catch (error) {
    console.error("[DEBUG] Interview response error:", error);
    res.status(500).json({
      error: "Failed to process response",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;