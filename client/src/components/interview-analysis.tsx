
import React from 'react';
import { Card } from "@/components/ui/card";

interface InterviewAnalysisProps {
  scores: {
    technical: number;
    communication: number;
    problemSolving: number;
    jobFit: number;
  };
  overallScore: number;
  questions: Array<{
    question: string;
    performance: 'Excellent' | 'Very Good' | 'Good';
    observation: string;
  }>;
}

export default function InterviewAnalysis({ scores, overallScore, questions }: InterviewAnalysisProps) {
  return (
    <div className="min-h-screen bg-[#f5f7fa]">
      <div className="max-w-[1200px] mx-auto px-6 py-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-[#2c3e50]">Interview Analysis</h1>
          <div className="flex gap-3">
            <button className="px-4 py-2 rounded-full border-2 border-[#4f8df9] text-[#4f8df9]">
              Export PDF
            </button>
            <button className="px-4 py-2 rounded-full bg-[#4f8df9] text-white">
              Try Again
            </button>
          </div>
        </div>

        <Card className="p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Overall Performance</h2>
          <div className="grid grid-cols-2 gap-6">
            <div className="flex items-center gap-4">
              <div className="relative w-24 h-24">
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold">{overallScore}</span>
                </div>
              </div>
              <div className="space-y-4 flex-1">
                {Object.entries(scores).map(([key, value]) => (
                  <div key={key}>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm">{key}</span>
                      <span className="text-sm">{value}%</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full">
                      <div 
                        className="h-2 bg-[#2ecc71] rounded-full"
                        style={{ width: `${value}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-bold mb-4">Question Analysis</h2>
          <div className="space-y-4">
            {questions.map((q, i) => (
              <div key={i} className="p-4 border rounded-lg">
                <div className="flex justify-between items-center">
                  <p className="font-medium">{q.question}</p>
                  <span className={`px-3 py-1 rounded-full text-sm ${
                    q.performance === 'Excellent' ? 'bg-[#e8f8f5] text-[#2ecc71]' :
                    q.performance === 'Very Good' ? 'bg-[#fef9e7] text-[#f39c12]' :
                    'bg-[#f9ebea] text-[#e74c3c]'
                  }`}>
                    {q.performance}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-2">{q.observation}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
