import { useState, useEffect } from "react";
import InterviewSimulation from "@/components/interview-simulation";
import { useToast } from "@/hooks/use-toast";

// Declare global function for child component to parent communication
declare global {
  interface Window {
    updateInterviewQuestion?: (newQuestion: string) => void;
  }
}

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
      
      // Get resume data if available
      let resumeData = null;
      try {
        const savedResume = localStorage.getItem('parsedResume');
        if (savedResume) {
          resumeData = JSON.parse(savedResume);
          console.log("[DEBUG] Using parsed resume data for interview context");
        }
      } catch (e) {
        console.warn("[DEBUG] Could not load resume data:", e);
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
          jobDescription,
          resumeData // Include resume data for targeted questions
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
          console.log("[DEBUG] Processing initial audio, length:", data.audio.length);
          
          // Helper function to play audio
          const playAudio = async (base64Data: string) => {
            try {
              // Convert base64 to array buffer
              const binaryString = atob(base64Data);
              const len = binaryString.length;
              const bytes = new Uint8Array(len);
              for (let i = 0; i < len; i++) {
                bytes[i] = binaryString.charCodeAt(i);
              }
              
              // Create audio element
              const blob = new Blob([bytes.buffer], { type: 'audio/mpeg' });
              const audioUrl = URL.createObjectURL(blob);
              const audio = new Audio(audioUrl);
              
              return new Promise<void>((resolve, reject) => {
                audio.addEventListener('canplaythrough', () => {
                  console.log("[DEBUG] Initial audio ready to play");
                  
                  // User must interact with the page before audio will play in many browsers
                  // We'll log this fact but still attempt to play
                  console.log("[DEBUG] Attempting to play initial audio (may need user interaction)");
                  
                  audio.play()
                    .then(() => {
                      console.log("[DEBUG] Initial audio playback started");
                      
                      audio.addEventListener('ended', () => {
                        console.log("[DEBUG] Initial audio playback completed");
                        URL.revokeObjectURL(audioUrl);
                        resolve();
                      });
                    })
                    .catch(playError => {
                      console.error("[DEBUG] Initial audio autoplay error:", playError);
                      console.log("[DEBUG] Audio will play on first user interaction");
                      URL.revokeObjectURL(audioUrl);
                      reject(playError);
                    });
                });
                
                audio.addEventListener('error', (e) => {
                  console.error("[DEBUG] Initial audio loading error:", e);
                  URL.revokeObjectURL(audioUrl);
                  reject(e);
                });
                
                // Set timeout in case the audio never loads
                setTimeout(() => {
                  if (audio.readyState < 4) { // HAVE_ENOUGH_DATA
                    console.error("[DEBUG] Audio loading timeout");
                    URL.revokeObjectURL(audioUrl);
                    reject(new Error("Audio loading timeout"));
                  }
                }, 10000); // 10 second timeout
              });
            } catch (innerErr) {
              console.error("[DEBUG] Error in audio processing:", innerErr);
              throw innerErr;
            }
          };
          
          // Attempt to play the audio
          playAudio(data.audio)
            .catch(audioErr => {
              console.error("[DEBUG] Final initial audio error:", audioErr);
            });
            
        } catch (audioErr) {
          console.error("[DEBUG] Fatal error processing audio:", audioErr);
        }
      } else {
        console.warn("[DEBUG] No audio received from server");
      }
      
      setIsLoading(false);
      setProgress(100);
      setError(null);
      setRetryCount(0);
    } catch (err) {
      // Properly log the error with type checking
      if (err instanceof Error) {
        console.error("[DEBUG] Interview initialization error:", {
          message: err.message,
          stack: err.stack,
          name: err.name
        });
      } else {
        console.error("[DEBUG] Interview initialization error:", String(err));
      }
      
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
    // Expose the updateQuestion function globally for the child component to call
    window.updateInterviewQuestion = (newQuestion: string) => {
      console.log("[DEBUG] Parent component received new question:", newQuestion);
      setCurrentQuestion(newQuestion);
    };

    const initialize = async () => {
      const dataLoaded = await loadInterviewData();
      if (dataLoaded) {
        initializeInterview();
      } else {
        setError("Failed to load interview data. Please return to setup.");
      }
    };
    initialize();

    // Cleanup global callback on unmount
    return () => {
      window.updateInterviewQuestion = undefined;
    };
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
        sessionId={sessionId}
      />
    </div>
  );
}