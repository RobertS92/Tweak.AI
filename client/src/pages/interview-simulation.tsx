import { useState, useEffect } from "react";
import InterviewSimulation from "@/components/interview-simulation";
import { useToast } from "@/hooks/use-toast";

const MAX_RETRIES = 5;
const RETRY_DELAY = 3000;

export default function InterviewSimulationPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState<string>("");
  const [transcript, setTranscript] = useState<string>("");
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [interviewParams, setInterviewParams] = useState<any>(null);
  const [retryCount, setRetryCount] = useState(0);

  const loadInterviewData = async () => {
    try {
      console.log("[DEBUG] Loading interview data");
      const savedPrefs = localStorage.getItem('interviewData');
      
      if (!savedPrefs) {
        throw new Error("No interview preferences found");
      }

      const data = JSON.parse(savedPrefs);
      console.log("[DEBUG] Loaded interview data:", data);

      // Validate required fields
      const requiredFields = ['jobType', 'experienceLevel', 'interviewType'];
      const missingFields = requiredFields.filter(field => !data[field]);
      
      if (missingFields.length > 0) {
        throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
      }

      setInterviewParams(data);
      return true;
    } catch (err) {
      console.error("[DEBUG] Error loading interview data:", err);
      setError(err instanceof Error ? err.message : "Failed to load interview data");
      return false;
    }
  };

  const initializeInterview = async () => {
    try {
      const savedPrefs = localStorage.getItem('interviewData');
      if (!savedPrefs) {
        throw new Error("No interview preferences found");
      }

      const params = JSON.parse(savedPrefs);
      setInterviewParams(params);

      // Validate required fields
      const requiredFields = ['jobType', 'experienceLevel', 'interviewType'];
      const missingFields = requiredFields.filter(field => !params[field]);
      
      if (missingFields.length > 0) {
        throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
      }

      // Default fallback values if needed
      const normalizedParams = {
        ...params,
        jobType: params.jobType || 'Software Developer',
        experienceLevel: params.experienceLevel || 'Mid-Level',
        interviewType: params.interviewType || 'Technical',
        jobDescription: params.jobDescription || `${params.experienceLevel} ${params.jobType} position`
      };

      if (!params.jobType || !params.experienceLevel || !params.interviewType || !params.jobDescription) {
        throw new Error("Missing required interview parameters");
      }

      console.log("[DEBUG] Initializing interview simulation with params:", normalizedParams);
      // Use the normalized params directly instead of interviewParams which might not be set yet in state
      const { jobType, experienceLevel, interviewType, difficulty, jobDescription } = normalizedParams;

      if (!interviewType || !jobType || !experienceLevel || !jobDescription) {
        throw new Error("Missing required interview parameters");
      }

      const response = await fetch('/api/interview/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: interviewType,
          jobType,
          level: experienceLevel,
          jobDescription
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to start interview");
      }

      console.log("[DEBUG] Received interview data:", {
        sessionId: data.sessionId,
        hasQuestion: !!data.question,
        hasAudio: !!data.audio,
        audioLength: data.audio ? data.audio.length : 0,
      });
      
      setSessionId(data.sessionId);
      setCurrentQuestion(data.question || "");
      
      // Play audio if available
      if (data.audio) {
        try {
          const audioBytes = atob(data.audio);
          const audioArray = new Uint8Array(audioBytes.length);
          for (let i = 0; i < audioBytes.length; i++) {
            audioArray[i] = audioBytes.charCodeAt(i);
          }
          
          const audioBlob = new Blob([audioArray], { type: 'audio/mpeg' });
          const audioUrl = URL.createObjectURL(audioBlob);
          const audio = new Audio(audioUrl);
          audio.oncanplaythrough = () => {
            console.log("[DEBUG] Audio ready to play");
            audio.play().catch(e => console.error("[DEBUG] Audio play error:", e));
          };
          audio.onerror = (e) => console.error("[DEBUG] Audio error:", e);
          console.log("[DEBUG] Audio blob created");
        } catch (audioErr) {
          console.error("[DEBUG] Error playing audio:", audioErr);
        }
      } else {
        console.warn("[DEBUG] No audio received from server");
      }
      
      setIsLoading(false);
      setProgress(100);
      setError(null);
      setRetryCount(0);
    } catch (err) {
      console.error("[DEBUG] Interview initialization error:", err);
      console.error("[DEBUG] Error details:", 
        err instanceof Error ? {
          message: err.message,
          stack: err.stack,
          name: err.name
        } : String(err)
      );
      
      // Log the request payload for debugging
      try {
        // Get params from localStorage as a fallback if normalizedParams is not available
        const savedPrefs = localStorage.getItem('interviewData');
        const params = savedPrefs ? JSON.parse(savedPrefs) : {};
        
        console.log("[DEBUG] Interview request payload (from localStorage):", JSON.stringify({
          type: params.interviewType,
          jobType: params.jobType,
          level: params.experienceLevel,
          jobDescription: params.jobDescription?.substring(0, 100) + "..." // Truncate for logging
        }));
      } catch (e) {
        console.error("[DEBUG] Error logging request payload:", e);
      }
      
      if (retryCount < MAX_RETRIES) {
        console.log(`[DEBUG] Retrying (${retryCount + 1}/${MAX_RETRIES}) in ${RETRY_DELAY}ms`);
        setRetryCount(prev => prev + 1);
        setTimeout(initializeInterview, RETRY_DELAY);
      } else {
        console.error("[DEBUG] Max retries reached, showing error UI");
        setError(err instanceof Error ? err.message : "Failed to start interview");
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    const initialize = async () => {
      const dataLoaded = await loadInterviewData();
      if (dataLoaded) {
        initializeInterview();
      } else {
        setError("Failed to load interview data. Please return to setup.");
      }
    };
    initialize();
  }, []);

  useEffect(() => {
    if (error) {
      toast({
        title: "Interview Error",
        description: error,
        variant: "destructive"
      });
    }
  }, [error]);

  useEffect(() => {
    if (isLoading && progress < 90) {
      const progressIncrement = 90 / (MAX_RETRIES + 1);
      const timer = setInterval(() => {
        setProgress(prev => Math.min(prev + progressIncrement, 90));
      }, RETRY_DELAY / 10);
      return () => clearInterval(timer);
    }
  }, [isLoading, progress]);

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
            onClick={() => {
              setError(null);
              setIsLoading(true);
              setProgress(0);
              setRetryCount(0);
              initializeInterview();
            }}
            className="bg-[#4f8df9] text-white px-6 py-2 rounded-lg mr-4"
          >
            Retry
          </button>
          <button 
            onClick={() => window.location.href = '/interview-prep'}
            className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg"
          >
            Return to Interview Prep
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f5f7fa] p-6 flex flex-col items-center justify-center gap-4">
        <div className="text-[#4f8df9] text-xl font-semibold">
          {isLoading ? 'Setting up your interview...' : 'Interview Ready'}
        </div>
        <div className="w-64 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className="h-full bg-[#4f8df9] transition-all duration-300" 
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-sm text-gray-500">
          {progress < 100 ? 'Setting up your interview...' : 'Almost ready...'}
        </p>
        {error && (
          <div className="mt-4 text-center">
            <p className="text-red-600 mb-4">Failed to start interview</p>
            <button 
              onClick={() => {
                setError(null);
                setIsLoading(true);
                setProgress(0);
                initializeInterview();
              }}
              className="bg-[#4f8df9] text-white px-6 py-2 rounded-lg"
            >
              Retry
            </button>
          </div>
        )}
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
        interviewData={interviewParams}
      />
    </div>
  );
}