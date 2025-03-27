// interview.ts (Assuming you want to use ES modules)

import express, { Request, Response } from "express";

const app = express();
app.use(express.json());

app.post("/start", async (req: Request, res: Response) => {
  try {
    console.log("[DEBUG] Raw request body:", req.body);

    const { type, level, jobType, jobDescription } = req.body;
    console.log("[DEBUG] Received interview params:", { 
      type, 
      level, 
      jobType,
      hasJobDescription: !!jobDescription,
      jobDescriptionLength: jobDescription?.length
    });

    // Validate all required fields
    const missingFields = [];
    if (!type) missingFields.push('type');
    if (!level) missingFields.push('level');
    if (!jobType) missingFields.push('jobType');
    if (!jobDescription) missingFields.push('jobDescription');

    if (missingFields.length > 0) {
      console.log("[DEBUG] Missing fields:", missingFields);
      return res.status(400).json({
        error: "Missing required fields",
        details: `The following fields are required: ${missingFields.join(', ')}`
      });
    }

    if (!type || !level || !jobType || !jobDescription) {
      return res.status(400).json({
        error: "Missing required fields",
        details: `Missing: ${[
          !type && "type",
          !level && "level",
          !jobType && "jobType",
          !jobDescription && "jobDescription"
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