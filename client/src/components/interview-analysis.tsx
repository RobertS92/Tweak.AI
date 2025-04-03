
import React from 'react';
import { Card } from "@/components/ui/card";

interface InterviewAnalysisProps {
  scores: {
    [key: string]: number;
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
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="p-6 mb-6">
        <h2 className="text-xl font-bold mb-6">Performance Summary</h2>
        
        <div className="flex flex-col md:flex-row gap-8 mb-8">
          <div className="flex-none">
            <div className="relative w-32 h-32 mx-auto">
              <div className="w-full h-full rounded-full border-8 border-gray-100 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-4xl font-bold text-[#4f8df9]">{overallScore}</div>
                  <div className="text-xs text-gray-500 mt-1">Overall Score</div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex-1 space-y-4">
            {Object.entries(scores).map(([key, value]) => {
              // Determine color based on score
              const getScoreColor = (score: number) => {
                if (score >= 90) return 'bg-[#2ecc71]';
                if (score >= 75) return 'bg-[#3498db]';
                if (score >= 60) return 'bg-[#f39c12]';
                return 'bg-[#e74c3c]';
              };
              
              return (
                <div key={key}>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium">{key}</span>
                    <span className="text-sm font-medium">{value}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full">
                    <div 
                      className={`h-2 ${getScoreColor(value)} rounded-full`}
                      style={{ width: `${value}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="p-6 bg-gray-50">
        <h2 className="text-xl font-bold mb-6">Question-by-Question Analysis</h2>
        <div className="space-y-6">
          {questions.map((q, i) => (
            <div key={i} className="bg-white p-5 border border-gray-100 rounded-lg shadow-sm">
              <div className="flex flex-col md:flex-row justify-between gap-4 mb-3">
                <h3 className="font-medium text-[#2c3e50]">
                  Question {i+1}
                </h3>
                <span className={`px-3 py-1 text-center rounded-full text-sm font-medium w-28 ${
                  q.performance === 'Excellent' ? 'bg-[#e8f8f5] text-[#2ecc71]' :
                  q.performance === 'Very Good' ? 'bg-[#fef9e7] text-[#f39c12]' :
                  'bg-[#f9ebea] text-[#e74c3c]'
                }`}>
                  {q.performance}
                </span>
              </div>
              
              <p className="text-sm mb-4 text-gray-700">{q.question}</p>
              
              <div className="bg-gray-50 p-3 rounded-md">
                <h4 className="text-sm font-semibold mb-2 text-gray-600">Feedback:</h4>
                <p className="text-sm text-gray-600">{q.observation}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
