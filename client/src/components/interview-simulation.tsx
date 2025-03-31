
import { useState } from "react";

interface InterviewSimulationProps {
  currentQuestion: string;
  transcript: string;
  isRecording: boolean;
  onStopInterview: () => void;
  progress?: number;
  interviewData?: {
    jobType: string;
    experienceLevel: string;
    interviewType: string;
    difficulty: string;
    duration: number;
    interviewFocus: string;
  };
}

export default function InterviewSimulation({
  currentQuestion = "",
  transcript = "",
  isRecording = false,
  progress = 0,
  onStopInterview = () => window.location.href = '/interview-prep'
}: Partial<InterviewSimulationProps>) {

  if (!currentQuestion) {
    return (
      <div className="min-h-screen bg-[#f5f7fa] p-6 flex items-center justify-center">
        <div className="bg-white rounded-lg p-6 shadow-sm text-center">
          <h2 className="text-xl font-semibold text-red-600 mb-4">Interview Not Initialized</h2>
          <p className="text-gray-600 mb-4">Please return to the interview prep page and try again.</p>
          <button 
            onClick={() => window.location.href = '/interview-prep'}
            className="bg-[#4f8df9] text-white px-6 py-2 rounded-lg"
          >
            Return to Interview Prep
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-8">
      {progress < 100 && (
        <div className="mb-6">
          <div className="flex justify-between mb-2">
            <span className="text-sm text-gray-600">Initializing Interview</span>
            <span className="text-sm font-medium">{progress}%</span>
          </div>
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-[#4f8df9] transition-all duration-300" 
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-[2fr,1fr] gap-6">
        <div className="space-y-6">
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-4">Current Question</h2>
            <p className="text-gray-700">{currentQuestion}</p>
          </div>
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-4">Your Response</h2>
            <p className="text-gray-700">{transcript}</p>
          </div>
        </div>
        <div className="space-y-6">
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-4">Controls</h2>
            <button
              onClick={onStopInterview}
              className="w-full bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600"
            >
              End Interview
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
