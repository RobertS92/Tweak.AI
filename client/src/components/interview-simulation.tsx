// interviewSimulation.tsx (Assuming you have a way to get type, level, and jobType)
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Square } from "lucide-react";

interface InterviewSimulationProps {
  currentQuestion: string;
  transcript: string;
  isRecording: boolean;
  onStopInterview: () => void;
  type: string;
  level: string;
  jobType: string;
}

export default function InterviewSimulation({
  currentQuestion,
  transcript,
  isRecording,
  onStopInterview,
  type,
  level,
  jobType,
}: InterviewSimulationProps) {
  const startInterview = async () => {
    try {
      const response = await fetch("/api/interview/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type,
          level,
          jobType,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Failed to start interview:", errorData);
        alert("Failed to start interview. Check console.");
        return;
      }

      const data = await response.json();
      console.log("Interview started:", data);
      alert(data.message);
      // Handle the data returned from the server, such as the first question and session ID.
    } catch (error) {
      console.error("Error starting interview:", error);
      alert("An error occurred. Check console.");
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f7fa]">
      <div className="border-b bg-[#1e2a3b]">
        <div className="max-w-[1200px] mx-auto px-6 h-[60px] flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="text-white font-bold flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#4f8df9]" />
              <span>Tweak AI</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-full bg-[#3498db] flex items-center justify-center text-white">
            RS
          </div>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-6 py-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-[#2c3e50]">Live Interview</h1>
          <div className="bg-[#e74c3c] px-6 py-1.5 rounded-full flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
            <span className="text-white font-semibold">LIVE INTERVIEW</span>
          </div>
        </div>

        <div className="grid grid-cols-[2fr,1fr] gap-6">
          <div className="space-y-6">
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h2 className="text-xl font-semibold mb-4">Current Question:</h2>
              <p className="text-lg">{currentQuestion}</p>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h2 className="text-xl font-semibold mb-4">Your Response:</h2>
              <p className="text-gray-600">{transcript}</p>
            </div>

            <div className="flex justify-center gap-4">
              <Button
                onClick={onStopInterview}
                className="bg-[#e74c3c] text-white px-6 py-3 rounded-lg flex items-center gap-2"
              >
                <Square className="w-4 h-4" />
                End Interview
              </Button>
              {isRecording ? (
                <Button className="bg-[#4f8df9] text-white px-6 py-3 rounded-lg flex items-center gap-2">
                  <Mic className="w-4 h-4" />
                  Recording...
                </Button>
              ) : null}
              <Button onClick={startInterview}>Start Interview</Button>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-4">Interview Progress</h2>
            {/* Placeholder for progress indicators */}
          </div>
        </div>
      </div>
    </div>
  );
}
