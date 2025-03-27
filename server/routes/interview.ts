const express = require('express');
const app = express();
app.use(express.json());

app.post('/start', async (req, res) => {
  try {
    const { type, level, jobType } = req.body;

    if (!type || !level || !jobType) {
      return res.status(400).json({
        error: "Missing required fields",
        details: "Interview type, level, and job type are required"
      });
    }

    // Generate appropriate job description based on parameters
    const jobDescription = `${level} ${jobType} position requiring ${type} expertise`;
    const durationMinutes = 30; // Default duration

    // ... rest of the interview start logic ...

    res.status(200).json({ message: 'Interview started successfully' });

  } catch (error) {
    console.error("Error starting interview:", error);
    res.status(500).json({ error: "Failed to start interview" });
  }
});

// ... rest of the app ...

const port = 3000;
app.listen(port, () => console.log(`Server listening on port ${port}`));