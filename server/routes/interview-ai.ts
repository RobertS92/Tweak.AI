import { Router } from "express";
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const router = Router();
import { aiService } from "../services/ai-service";

// Initialize OpenAI with API key
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY 
});

// Store interview contexts
interface InterviewSession {
  jobDescription: string;
  currentQuestion: string;
  history: Array<{role: string; content: string}>;
  analysis: any;
  durationMinutes: number;
  startTime: number;
  questionCount: number;
  lastInteractionTime: number;
  feedback?: any;
}

const interviewSessions = new Map<string, InterviewSession>();

// Clean up expired sessions every 30 minutes
setInterval(() => {
  const now = Date.now();
  for (const [sessionId, session] of interviewSessions.entries()) {
    if (now - session.lastInteractionTime > 30 * 60 * 1000) {
      interviewSessions.delete(sessionId);
    }
  }
}, 30 * 60 * 1000);

async function generateSpeech(text: string): Promise<Buffer> {
  try {
    console.log("[DEBUG] Starting speech generation");
    if (!text || text.trim().length === 0) {
      throw new Error("Cannot generate speech from empty text");
    }

    console.log("[DEBUG] Text to convert:", text.substring(0, 100) + "...");
    console.log("[DEBUG] Text length:", text.length);

    const mp3Response = await openai.audio.speech.create({
      model: "tts-1",
      voice: "echo",
      input: text.trim(),
    });

    console.log("[DEBUG] Speech generation request successful");

    const buffer = Buffer.from(await mp3Response.arrayBuffer());
    console.log("[DEBUG] Generated speech buffer size:", buffer.length);
    console.log("[DEBUG] Speech generation completed successfully");

    return buffer;
  } catch (error) {
    console.error("[DEBUG] Speech generation error:", error);
    throw new Error(`Failed to generate speech: ${error instanceof Error ? error.message : String(error)}`);
  }
}

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
    const { type, jobType, level, jobDescription, durationMinutes = 30 } = req.body;

    if (!type || !level || !jobDescription) {
      return res.status(400).json({
        error: "Missing required fields",
        details: "Interview type, experience level and job description are required"
      });
    }

    const normalizedJobType = jobType?.trim() || "Software Developer";
    
    if (normalizedJobType.length < 2) {
      return res.status(400).json({
        error: "Invalid job title",
        details: "Please enter a valid job title"
      });
    }

    // Generate initial response even if OpenAI fails
    let response;
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
      try {
        response = await aiService.complete([
          {
            role: "system",
            content: `You are an experienced technical interviewer. Create a natural, conversational interview opening that:
1. Introduces yourself briefly
2. Makes the candidate comfortable
3. Sets expectations for the interview
4. Asks an engaging first question`
        },
        {
          role: "user", 
          content: `Start an interview for a ${level} ${jobType} position, focusing on ${type} questions.`
        }
      ]);
    } catch (error) {
      retryCount++;
      if (retryCount >= maxRetries) {
        console.log("[DEBUG] OpenAI failed after retries, using fallback response");
        response = getFallbackQuestion(type, level, jobType);
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 1000 * retryCount)); // Exponential backoff
      continue;
    }
    break;
  }

  function getFallbackQuestion(type: string, level: string, jobType: string) {
    const questions = {
      'Technical': `Hello! I'll be conducting your technical interview for the ${level} ${jobType} position. Could you walk me through your technical background and experience with key technologies in this field?`,
      'Behavioral': `Hi there! Today we'll focus on your experiences and approaches to workplace scenarios for the ${level} ${jobType} role. Could you tell me about a challenging project you've worked on?`,
      'Mixed': `Welcome! I'll be conducting a comprehensive interview for the ${level} ${jobType} position, covering both technical and behavioral aspects. Let's start with your background in this field.`
    };
    return questions[type] || questions['Mixed'];
  }

    console.log("[DEBUG] Creating interview plan");

    try {
      // Generate initial interview context
      const response = await aiService.complete([
        {
          role: "system",
          content: `You are an experienced technical interviewer named Alex. Create a natural, conversational interview opening that:
1. Introduces yourself as Alex briefly
2. Makes the candidate comfortable
3. Sets expectations for the interview
4. Asks an engaging first question

Keep your response conversational and natural, as it will be spoken aloud.
Focus on building rapport while staying professional.
Keep the response under 60 seconds when spoken.`
        },
        {
          role: "user",
          content: `Start an interview for this job description, introducing yourself and asking the first question:\n\n${jobDescription}`
        }
      ]
    );

    console.log("[DEBUG] Generated initial interview response");
    const responseText = await aiService.complete([
      {
        role: "system",
        content: `You are an experienced technical interviewer named Alex. Create a natural, conversational interview opening that:
1. Introduces yourself as Alex briefly
2. Makes the candidate comfortable
3. Sets expectations for the interview
4. Asks an engaging first question

Keep your response conversational and natural, as it will be spoken aloud.
Focus on building rapport while staying professional.
Keep the response under 60 seconds when spoken.`
      },
      {
        role: "user",
        content: `Start an interview for this job description, introducing yourself and asking the first question:\n\n${jobDescription}`
      }
    ]);

    console.log("[DEBUG] Response length:", responseText?.length);

    console.log("[DEBUG] Generating speech for initial response");
    const speechBuffer = await generateSpeech(responseText || "");

    const sessionId = Date.now().toString();
    console.log("[DEBUG] Created session ID:", sessionId);

    // Store interview context
    interviewSessions.set(sessionId, {
      jobDescription,
      currentQuestion: responseText,
      history: [{ role: "interviewer", content: responseText }],
      analysis: null,
      durationMinutes,
      startTime: Date.now(),
      questionCount: 1,
      lastInteractionTime: Date.now()
    });

    console.log("[DEBUG] Interview session created");
    console.log("[DEBUG] Audio buffer size:", speechBuffer.length);

    // Make sure to use the same value for both session.currentQuestion and the response question field
    // This ensures consistency between backend stored state and what's sent to the client
    res.json({
      sessionId,
      question: responseText, // Use responseText which is already set in the session
      audio: speechBuffer.toString('base64')
    });
    } catch (error) {
      console.error("[DEBUG] Interview generation error:", error);
      res.status(500).json({
        error: "Failed to generate interview response",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  } catch (error) {
    console.error("[DEBUG] Interview start error:", error);
    console.error("[DEBUG] Error details:", error instanceof Error ? error.stack : String(error));
    res.status(500).json({
      error: "Failed to start interview",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

router.post("/interview/evaluate", async (req, res) => {
  try {
    console.log("[DEBUG] Starting answer evaluation");
    const { sessionId, answer, isFinal = false } = req.body;

    console.log("[DEBUG] Evaluation request details:", {
      sessionId,
      answerLength: answer?.length
    });

    if (!sessionId || !answer) {
      return res.status(400).json({
        error: "Missing required fields",
        details: "Session ID and answer are required"
      });
    }

    const session = interviewSessions.get(sessionId);
    if (!session) {
      console.log("[DEBUG] Session not found:", sessionId);
      return res.status(404).json({
        error: "Session not found",
        details: "Interview session has expired or is invalid"
      });
    }

    if (isFinal) {
      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: `Analyze the complete interview and provide detailed feedback with scores. Focus on:
1. Clarity and Conciseness (1-10)
2. Answer Quality (1-10)
3. Technical Accuracy (1-10)
4. Communication Skills (1-10)
5. Overall Performance (1-10)

Format the response as JSON with 'scores' object and 'feedback' string.`
          },
          {
            role: "user",
            content: `Job Description: ${session.jobDescription}\nInterview History: ${JSON.stringify(session.history)}`
          }
        ],
        temperature: 0.7
      });

      const feedback = JSON.parse(completion.choices[0].message.content || "{}");
      session.feedback = feedback;

      return res.json({
        feedback: feedback.feedback,
        scores: feedback.scores,
        sessionId
      });
    }

    console.log("[DEBUG] Retrieved session:", {
      historyLength: session.history.length,
      currentQuestion: session.currentQuestion?.substring(0, 50) + "..."
    });

    // Evaluate the answer
    const evaluation = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are an expert technical interviewer. Evaluate the candidate's response and return a JSON object with:
{
  "completeness": number (0-1),
  "clarity": number (0-1),
  "technicalAccuracy": number (0-1),
  "missingPoints": ["point1", "point2"],
  "suggestedFollowUp": "follow-up question if answer is incomplete",
  "nextQuestion": "next main question if answer is complete and satisfactory"
}`
        },
        {
          role: "user",
          content: `Previous question: ${session.currentQuestion}\nCandidate's answer: ${answer}\nEvaluate this response.`
        }
      ],
      temperature: 0.7
    });

    console.log("[DEBUG] Got evaluation response");
    const evaluationResult = JSON.parse(evaluation.choices[0].message.content);
    console.log("[DEBUG] Evaluation results:", {
      completeness: evaluationResult.completeness,
      clarity: evaluationResult.clarity,
      technicalAccuracy: evaluationResult.technicalAccuracy
    });

    // Determine next question based on evaluation
    let nextQuestion = evaluationResult.completeness < 0.7 
      ? evaluationResult.suggestedFollowUp 
      : evaluationResult.nextQuestion;

    // Ensure we have a valid question
    if (!nextQuestion || nextQuestion.trim().length === 0) {
      nextQuestion = "Thank you for your answer. Let's move on to the next question. Could you tell me about a challenging project you've worked on recently?";
    }

    console.log("[DEBUG] Selected next question:", nextQuestion?.substring(0, 50) + "...");
    console.log("[DEBUG] Generating speech for next question");

    const speechBuffer = await generateSpeech(nextQuestion);
    console.log("[DEBUG] Generated speech buffer size:", speechBuffer.length);

    // Update session history
    session.history.push(
      { role: "candidate", content: answer },
      { role: "interviewer", content: nextQuestion }
    );
    session.currentQuestion = nextQuestion;
    session.lastInteractionTime = Date.now(); // Update last interaction time to prevent session expiration

    console.log("[DEBUG] Updated session history. New length:", session.history.length);

    // Check if interview should end (after 5 questions or if completion criteria met)
    if (session.history.length >= 10 || shouldEndInterview(session)) {
      console.log("[DEBUG] Interview completion criteria met");
      return res.json({
        feedback: "Thank you for your time. This concludes our interview.",
        sessionId,
        isComplete: true
      });
    }

    res.json({
      evaluation: evaluationResult,
      nextQuestion,
      audio: speechBuffer.toString('base64')
    });
  } catch (error) {
    console.error("[DEBUG] Answer evaluation error:", error);
    console.error("[DEBUG] Error stack:", error instanceof Error ? error.stack : "No stack trace");
    res.status(500).json({
      error: "Failed to evaluate answer",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

function shouldEndInterview(session: any) {
  // End if key topics have been covered or time exceeded
  const interviewDuration = Date.now() - session.startTime;
  const maxDuration = session.durationMinutes * 60 * 1000; 
  
  if (interviewDuration > maxDuration) {
    console.log("[DEBUG] Interview timed out:", {
      duration: Math.round(interviewDuration/1000) + " seconds",
      maxDuration: Math.round(maxDuration/1000) + " seconds",
      startTime: new Date(session.startTime).toISOString()
    });
    return true;
  }
  
  return false;
}

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
        temperature: 0.8,
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
        ]
      });

    const response = completion.choices[0].message.content;
    session.history.push({ role: "interviewer", content: response });
    session.currentQuestion = response;
    session.lastInteractionTime = Date.now(); // Update last interaction time to prevent session expiration

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