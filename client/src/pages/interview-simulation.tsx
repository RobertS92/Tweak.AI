import { useState, useEffect } from "react";
import InterviewSimulation from "@/components/interview-simulation";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

export default function InterviewSimulationPage() {
  const [location] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [transcript, setTranscript] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeInterview = async () => {
      try {
        console.log("[DEBUG] Initializing interview simulation");
        const params = new URLSearchParams(window.location.search);
        const type = params.get("type");
        const jobType = params.get("jobType");
        const level = params.get("level");

        console.log("[DEBUG] Interview params:", { type, jobType, level });

        if (!type || !jobType || !level) {
          throw new Error("Missing required interview parameters");
        }

        const jobDescription = `${level} ${jobType} position requiring ${type} expertise`;
        console.log("[DEBUG] Preparing interview request:", { 
          type, 
          jobType, 
          level,
          jobDescription 
        });

        const requestBody = { 
          type,
          jobType,
          level,
          jobDescription
        };

        console.log("[DEBUG] Sending request body:", requestBody);

        const response = await fetch('/api/interview/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        });

        const responseData = await response.json();
        console.log("[DEBUG] Response status:", response.status);
        console.log("[DEBUG] Response data:", responseData);

        if (!response.ok) {
          throw new Error(`Failed to start interview: ${response.statusText} - ${responseData.error || ''}`);
        }

        console.log("[DEBUG] Interview started successfully:", responseData);

        setCurrentQuestion(responseData.question);
        setIsLoading(false);
      } catch (err) {
        console.error("[DEBUG] Interview initialization error:", err);
        setError(err instanceof Error ? err.message : "Failed to start interview");
        toast({
          title: "Error",
          description: "Failed to start the interview. Please try again.",
          variant: "destructive"
        });
      }
    };

    initializeInterview();
  }, [location]);

  const handleStopInterview = () => {
    window.location.href = '/interview-prep';
  };

  if (error) {
    return (
      <div className="min-h-screen bg-[#f5f7fa] p-6 flex items-center justify-center">
        <div className="bg-white rounded-lg p-6 shadow-sm text-center">
          <h2 className="text-xl font-semibold text-red-600 mb-4">Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
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
    <div className="min-h-screen bg-[#f5f7fa]">
      <InterviewSimulation
        currentQuestion={currentQuestion}
        transcript={transcript}
        isRecording={isRecording}
        onStopInterview={handleStopInterview}
      />
    </div>
  );
}