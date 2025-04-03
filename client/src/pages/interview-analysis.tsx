import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import InterviewAnalysis from "@/components/interview-analysis";
import { Loader2 } from "lucide-react";

interface AnalysisData {
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

export default function InterviewAnalysisPage() {
  const [location] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const sessionId = searchParams.get("sessionId");
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  
  useEffect(() => {
    const fetchAnalysis = async () => {
      try {
        if (!sessionId) {
          throw new Error("No session ID provided");
        }
        
        console.log("[DEBUG] Fetching interview analysis for session:", sessionId);
        const response = await fetch(`/api/interview/feedback/${sessionId}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch analysis: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log("[DEBUG] Received analysis data:", data);
        
        // Extract overall score from scores if it exists, or use a default value
        let overallScore = 0;
        const scoresCopy = {...data.scores};
        
        if (scoresCopy && scoresCopy["Overall Performance"]) {
          overallScore = scoresCopy["Overall Performance"];
          delete scoresCopy["Overall Performance"]; // Remove from scores to avoid duplication
        }
        
        setAnalysisData({
          scores: scoresCopy || {},
          overallScore: overallScore,
          questions: data.questions || []
        });
      } catch (err) {
        console.error("[DEBUG] Error fetching analysis:", err);
        setError(err instanceof Error ? err.message : "Failed to load interview analysis");
      } finally {
        setLoading(false);
      }
    };
    
    fetchAnalysis();
  }, [sessionId]);
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold">Generating Interview Analysis</h2>
          <p className="text-gray-600 mt-2">This may take a moment...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="min-h-screen bg-[#f5f7fa] p-6 flex items-center justify-center">
        <div className="bg-white rounded-lg p-6 shadow-sm text-center max-w-md w-full">
          <h2 className="text-xl font-semibold text-red-600 mb-4">Analysis Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
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
  
  if (!analysisData) {
    return (
      <div className="min-h-screen bg-[#f5f7fa] p-6 flex items-center justify-center">
        <div className="bg-white rounded-lg p-6 shadow-sm text-center max-w-md w-full">
          <h2 className="text-xl font-semibold text-red-600 mb-4">No Analysis Data</h2>
          <p className="text-gray-600 mb-6">Unable to retrieve interview analysis. The session may have expired.</p>
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
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Interview Analysis</h1>
        <p className="text-gray-600">
          Below is a detailed analysis of your interview performance. Use this feedback to improve your interviewing skills.
        </p>
      </div>
      
      <InterviewAnalysis 
        scores={analysisData.scores}
        overallScore={analysisData.overallScore}
        questions={analysisData.questions}
      />
      
      <div className="mt-8 text-center">
        <button 
          onClick={() => window.location.href = '/interview-prep'}
          className="bg-[#4f8df9] text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          Return to Interview Prep
        </button>
      </div>
    </div>
  );
}