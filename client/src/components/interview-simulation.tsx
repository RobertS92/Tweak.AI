
import { useState, useEffect } from 'react';
import { cn } from "@/lib/utils";

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
        <div className="max-w-[1200px] mx-auto px-6 h-[60px] flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="text-white font-bold flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#4f8df9]" />
              <span>Tweak AI</span>
            </div>
            <nav className="flex gap-8">
              <span className="text-white/70">Dashboard</span>
              <span className="text-white/70">Resume Builder</span>
              <span className="text-[#4f8df9]">Interview Prep</span>
              <span className="text-white/70">Job Matcher</span>
              <span className="text-white/70">AI Assistant</span>
            </nav>
          </div>
          <div className="w-10 h-10 rounded-full bg-[#3498db] flex items-center justify-center text-white">
            RS
          </div>
        </div>
      </div>
      
      <div className="border-b bg-white">
        <div className="max-w-[1200px] mx-auto px-6 h-[70px] flex items-center justify-between">
          <h1 className="text-2xl font-bold text-[#2c3e50]">Interview Session</h1>
          <div className="bg-[#e74c3c] px-6 py-1.5 rounded-full flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-white" />
            <span className="text-white font-semibold text-sm">LIVE INTERVIEW • 12:45 REMAINING</span>
          </div>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-6 py-8">
        <div className="grid grid-cols-[1fr,300px] gap-6">
          <div className="space-y-6">
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-10 h-10 rounded-full bg-[#3498db] flex items-center justify-center text-white text-sm">
                  AI
                </div>
                <h2 className="text-xl font-semibold">Interviewer Question</h2>
              </div>
              <p className="text-lg text-[#2c3e50]">{currentQuestion}</p>
            </div>
            
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Your Response</h2>
                <div className={cn(
                  "px-3 py-1 rounded-full text-sm",
                  isRecording ? "bg-red-100 text-red-600" : "bg-gray-100"
                )}>
                  {isRecording ? "Recording..." : "Not Recording"}
                </div>
              </div>
              <div className="min-h-[200px] bg-[#f9f9fa] rounded-lg p-4 mb-4">
                <p className="text-gray-600">{transcript || "Waiting for your response..."}</p>
              </div>
              
              <div className="flex justify-center gap-4">
                <button onClick={onStopInterview} 
                  className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center text-white">
                  ⬛
                </button>
                <button className="w-10 h-10 rounded-full border-2 border-[#4f8df9] text-[#4f8df9] flex items-center justify-center">
                  ❚❚
                </button>
                <button className="w-10 h-10 rounded-full border-2 border-[#4f8df9] text-[#4f8df9] flex items-center justify-center">
                  ⏭
                </button>
              </div>
            </div>
          </div>
          
          <div className="space-y-6">
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h2 className="text-xl font-semibold mb-4">Real-time Analysis</h2>
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-3">Speech Analysis</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Pace</span>
                      <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="w-3/4 h-full bg-green-500" />
                      </div>
                      <span className="text-sm">Good</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Clarity</span>
                      <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="w-4/5 h-full bg-green-500" />
                      </div>
                      <span className="text-sm">Excellent</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-semibold mb-3">Keywords Detected</h3>
                  <div className="flex flex-wrap gap-2">
                    {["ML", "Python", "Dataset", "Metrics"].map((keyword) => (
                      <span key={keyword} className="px-3 py-1 bg-[#f0f7ff] text-[#4f8df9] rounded-full text-sm">
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>
                
                <div className="bg-[#f0f7ff] rounded-lg p-4 border border-[#4f8df9]">
                  <div className="flex gap-2">
                    <span>💡</span>
                    <div>
                      <p className="font-semibold text-sm">Pro Tip</p>
                      <p className="text-sm text-gray-600">
                        Try to include specific examples and metrics when discussing your experience.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
