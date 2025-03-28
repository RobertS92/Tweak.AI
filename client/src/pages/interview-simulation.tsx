
import { useState, useEffect } from "react";
import InterviewSimulation from "@/components/interview-simulation";
import { useToast } from "@/hooks/use-toast";

export default function InterviewSimulationPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [currentQuestion, setCurrentQuestion] = useState<string>("");
  const [transcript, setTranscript] = useState<string>("");
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    const initializeInterview = async () => {
      try {
        console.log("[DEBUG] Initializing interview simulation");
        const searchParams = new URLSearchParams(window.location.search);
        const type = searchParams.get("type");
        const jobType = searchParams.get("jobType");
        const level = searchParams.get("level");
        const jobDescription = searchParams.get("jobDescription");

        console.log("[DEBUG] Interview params:", { type, jobType, level, jobDescription });

        if (!type || !jobType || !level || !jobDescription) {
          throw new Error("Missing required interview parameters");
        }

        const requestBody = {
          type,
          jobType,
          level,
          jobDescription
        };

        console.log("[DEBUG] Sending request body:", requestBody);

        const response = await fetch('/api/interview/start', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to start interview");
        }

        const data = await response.json();
        console.log("[DEBUG] Interview started successfully:", data);

        setSessionId(data.sessionId);
        setCurrentQuestion(data.question);
        setIsLoading(false);
      } catch (err) {
        console.error("[DEBUG] Interview initialization error:", err);
        setError(err instanceof Error ? err.message : "Failed to start interview");
        setIsLoading(false);
      }
    };

    initializeInterview();
  }, []);

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f5f7fa] p-6 flex items-center justify-center">
        <div className="text-[#4f8df9]">Initializing interview...</div>
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
