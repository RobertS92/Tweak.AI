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

router.post("/interview/start", async (req, res) => {
  try {
    const { jobDescription, companyName } = req.body;

    if (!jobDescription || !companyName) {
      return res.status(400).json({
        error: "Missing required fields",
      });
    }

    // Generate initial interview question based on job description
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are an experienced technical interviewer at ${companyName}. 
Generate an appropriate technical interview question based on the job description. 
The question should be challenging but fair, focusing on the key skills mentioned in the job description.`
        },
        {
          role: "user",
          content: `Job Description: ${jobDescription}\n\nGenerate an interview question.`
        }
      ],
      temperature: 0.7
    });

    const question = completion.choices[0].message.content;

    // Store interview context
    const sessionId = Date.now().toString();
    interviewSessions.set(sessionId, {
      jobDescription,
      companyName,
      currentQuestion: question,
      history: [{ role: "interviewer", content: question }]
    });

    res.json({
      sessionId,
      question,
    });
  } catch (error) {
    console.error("Interview start error:", error);
    res.status(500).json({
      error: "Failed to start interview",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

router.post("/interview/feedback", async (req, res) => {
  try {
    const { answer, jobDescription, companyName } = req.body;

    if (!answer) {
      return res.status(400).json({
        error: "No answer provided",
      });
    }

    // Generate feedback using OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are an experienced technical interviewer providing feedback on candidate responses.
Analyze the answer based on:
1. Technical accuracy
2. Communication clarity
3. Problem-solving approach
4. Areas for improvement

Provide constructive feedback in a professional and encouraging manner.
Format the response in clear sections with specific examples and suggestions.`
        },
        {
          role: "user",
          content: `Job Description: ${jobDescription}
Company: ${companyName}
Candidate's Answer: ${answer}

Provide detailed feedback on this response.`
        }
      ],
      temperature: 0.7
    });

    const feedback = completion.choices[0].message.content;

    res.json({
      feedback,
    });
  } catch (error) {
    console.error("Feedback generation error:", error);
    res.status(500).json({
      error: "Failed to generate feedback",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;
