
import express from 'express';
const router = express.Router();

router.use(express.json());

router.post("/start", async (req, res) => {
  try {
    const { type, level, jobType } = req.body;
    console.log("[DEBUG] Received interview params:", { type, level, jobType });

    if (!type || !level || !jobType) {
      return res.status(400).json({
        error: "Missing required fields",
        details: `Missing: ${[
          !type && "type",
          !level && "level",
          !jobType && "jobType",
        ].filter(Boolean).join(", ")}`
      });
    }

    const jobDescription = `${level} ${jobType} position requiring ${type} expertise`;
    const durationMinutes = 30;

    res.status(200).json({
      message: "Interview started successfully",
      question: "Tell me about your background and experience with this type of role.",
      sessionId: Date.now().toString()
    });

  } catch (error) {
    console.error("Error starting interview:", error);
    res.status(500).json({ error: "Failed to start interview" });
  }
});

export default router;
