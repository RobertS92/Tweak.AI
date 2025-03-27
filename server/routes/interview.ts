
import { Router } from "express";
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const router = Router();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

router.post("/start", async (req, res) => {
  try {
    const { interviewType, jobType, experienceLevel } = req.body;
    
    console.log("[DEBUG] Starting interview with params:", {
      interviewType,
      jobType,
      experienceLevel
    });

    // Mock response for initial testing
    const initialQuestion = `Hello! I'll be conducting your ${interviewType} interview for the ${jobType} position. Given your ${experienceLevel} experience, let's start with: Could you tell me about your background and experience in this field?`;

    res.json({
      question: initialQuestion,
      sessionId: Date.now().toString()
    });
  } catch (error) {
    console.error("[DEBUG] Interview start error:", error);
    res.status(500).json({ 
      error: "Failed to start interview",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;
