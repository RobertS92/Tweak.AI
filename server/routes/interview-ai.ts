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
          content: `You are an expert interview preparation assistant. Analyze job descriptions and extract key information. Return response as JSON with:
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
  "interviewStructure": {
    "rounds": [
      {
        "type": "Technical/Behavioral/System Design",
        "focus": "Main focus areas",
        "duration": "Suggested duration"
      }
    ]
  }
}`
        },
        {
          role: "user",
          content: `Analyze this job description and provide structured interview preparation guidance:\n\n${jobDescription}`
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
    const { jobDescription, mode = "technical" } = req.body;

    if (!jobDescription) {
      return res.status(400).json({
        error: "Missing required fields",
        details: "Job description is required"
      });
    }

    console.log("[DEBUG] Creating interview plan for mode:", mode);

    // Generate initial interview context
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are an experienced technical interviewer. Create an interview plan with:
1. Initial greeting and role introduction
2. Structured ${mode} questions based on job requirements
3. Follow-up topics to explore
4. Evaluation criteria for responses
5. Areas to probe deeper based on candidate answers

Format your response to be clear and engaging. Include specific questions and topics to discuss.`
        },
        {
          role: "user",
          content: `Job Description: ${jobDescription}\n\nPrepare an interview plan and initial question.`
        }
      ],
      temperature: 0.7
    });

    const sessionId = Date.now().toString();
    const response = completion.choices[0].message.content;

    // Store interview context
    interviewSessions.set(sessionId, {
      jobDescription,
      mode,
      currentQuestion: response,
      history: [{ role: "interviewer", content: response }]
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
          content: `You are conducting a ${session.mode} interview. For each response:
1. Evaluate answer quality and completeness
2. Identify areas for improvement
3. Generate relevant follow-up questions
4. Provide constructive feedback
5. Track key points covered vs. missing

Format your response with clear sections:
• Feedback on previous answer
• Follow-up question
• Areas to explore further`
        },
        {
          role: "user",
          content: `Job Description: ${session.jobDescription}
Interview History: ${JSON.stringify(session.history)}
Latest Answer: ${answer}

Provide feedback and a follow-up question.`
        }
      ],
      temperature: 0.7
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