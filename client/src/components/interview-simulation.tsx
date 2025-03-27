
import React from 'react';

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
  onStopInterview 
}: InterviewSimulationProps) {
  return (
    <div className="min-h-screen bg-[#f5f7fa]">
      <div className="border-b bg-[#1e2a3b]">
        <div className="max-w-[1200px] mx-auto px-6 h-[60px] flex items-center">
          <div className="flex items-center gap-6">
            <div className="text-white font-bold flex items-center gap-2">
              <span>Tweak AI</span>
              <div className="w-2 h-2 rounded-full bg-[#4f8df9]" />
            </div>
            <nav className="flex gap-8">
              <span className="text-white opacity-70">Dashboard</span>
              <span className="text-white opacity-70">Resume Builder</span>
              <span className="text-[#4f8df9]">Interview Prep</span>
              <span className="text-white opacity-70">Job Matcher</span>
            </nav>
          </div>
        </div>
      </div>
      
      <div className="max-w-[1200px] mx-auto px-6 py-8">
        <div className="grid grid-cols-[2fr,1fr] gap-6">
          <div className="space-y-6">
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h2 className="text-xl font-semibold mb-4">Current Question</h2>
              <p className="text-lg">{currentQuestion}</p>
            </div>
            
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Your Response</h2>
                <div className={`px-3 py-1 rounded-full text-sm ${
                  isRecording ? 'bg-red-100 text-red-600' : 'bg-gray-100'
                }`}>
                  {isRecording ? 'Recording...' : 'Not Recording'}
                </div>
              </div>
              <p className="text-gray-600">{transcript || 'Waiting for your response...'}</p>
            </div>
          </div>
          
          <div className="space-y-6">
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h2 className="text-xl font-semibold mb-4">Interview Progress</h2>
              <div className="space-y-4">
                <div className="h-2 bg-gray-100 rounded-full">
                  <div className="h-2 bg-[#4f8df9] rounded-full w-1/3" />
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Question 1/3</span>
                  <span>5:00 remaining</span>
                </div>
              </div>
            </div>
            
            <button
              onClick={onStopInterview}
              className="w-full bg-red-50 text-red-600 py-3 rounded-lg hover:bg-red-100 transition-colors"
            >
              End Interview
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
