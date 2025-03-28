import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Square } from "lucide-react";

interface InterviewSimulationProps {
  currentQuestion: string;
  transcript: string;
  isRecording: boolean;
  onStopInterview: () => void;
}

export default function InterviewSimulation({
  currentQuestion,
  transcript,
  isRecording,
  onStopInterview,
}: InterviewSimulationProps) {
  return (
    <div className="max-w-[1200px] mx-auto px-6 py-8">
      <div className="grid grid-cols-1 md:grid-cols-[2fr,1fr] gap-6">
        <div className="space-y-6">
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-4">Current Question</h2>
            <p className="text-gray-700">{currentQuestion}</p>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Your Response</h2>
              <div className="flex items-center gap-2">
                {isRecording ? (
                  <Button variant="destructive" size="sm" onClick={onStopInterview}>
                    <Square className="w-4 h-4 mr-2" />
                    Stop
                  </Button>
                ) : (
                  <Button size="sm" onClick={onStopInterview}>
                    <Mic className="w-4 h-4 mr-2" />
                    Start
                  </Button>
                )}
              </div>
            </div>
            <p className="text-gray-700 whitespace-pre-wrap">{transcript}</p>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm h-fit">
          <h2 className="text-xl font-semibold mb-4">Interview Progress</h2>
          <div className="space-y-4">
            <Button variant="outline" className="w-full" onClick={onStopInterview}>
              End Interview
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}