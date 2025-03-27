// interview.ts (Assuming you want to use ES modules)

import express, { Request, Response } from "express";

const app = express();
app.use(express.json());

app.post("/start", async (req: Request, res: Response) => {
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
        ]
          .filter(Boolean)
          .join(", ")}`,
      });
    }

    const jobDescription = `${level} ${jobType} position requiring ${type} expertise`;
    const durationMinutes = 30;

    // Return initial interview data
    res.status(200).json({
      message: "Interview started successfully",
      question:
        "Tell me about your background and experience with this type of role.",
      sessionId: Date.now().toString(),
    });
  } catch (error) {
    console.error("Error starting interview:", error);
    res.status(500).json({ error: "Failed to start interview" });
  }
});

const port = 3000;
app.listen(port, () => console.log(`Server listening on port ${port}`));
