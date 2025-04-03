
import { useState, useEffect, useRef } from "react";

// Declare global function for child component to parent communication
declare global {
  interface Window {
    updateInterviewQuestion?: (newQuestion: string) => void;
  }
}

interface InterviewSimulationProps {
  currentQuestion: string;
  transcript: string;
  isRecording: boolean;
  onStopInterview: () => void;
  progress?: number;
  sessionId?: string | null;
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
  interviewData,
  sessionId: externalSessionId = null,
  onStopInterview = () => window.location.href = '/interview-prep'
}: Partial<InterviewSimulationProps>) {
  const [localTranscript, setLocalTranscript] = useState(transcript);
  const [recording, setRecording] = useState(isRecording);
  const [textInput, setTextInput] = useState("");
  const recognitionRef = useRef<any>(null);
  const [sessionId, setSessionId] = useState<string | null>(externalSessionId);
  const [isLoading, setIsLoading] = useState(false);

  // Set the sessionId from props when it changes
  useEffect(() => {
    if (externalSessionId && externalSessionId !== sessionId) {
      console.log("[DEBUG] Setting session ID from props:", externalSessionId);
      setSessionId(externalSessionId);
    }
  }, [externalSessionId, sessionId]);

  // Initialize speech recognition
  useEffect(() => {
    // TypeScript doesn't know about SpeechRecognition API, so we need to cast it
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || 
                               (window as any).webkitSpeechRecognition;
    
    if (SpeechRecognitionAPI) {
      recognitionRef.current = new SpeechRecognitionAPI();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      
      recognitionRef.current.onresult = (event: any) => {
        let finalTranscript = '';
        let interimTranscript = '';
        
        if (event && event.results) {
          for (let i = 0; i < event.results.length; i++) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            } else {
              interimTranscript += event.results[i][0].transcript;
            }
          }
        }
        
        setLocalTranscript(prevTranscript => {
          if (finalTranscript) {
            return prevTranscript + finalTranscript + ' ';
          }
          return prevTranscript;
        });
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error("[DEBUG] Speech recognition error:", event?.error || "Unknown error");
        setRecording(false);
      };
      
      return () => {
        if (recognitionRef.current) {
          recognitionRef.current.stop();
        }
      };
    } else {
      console.warn("[DEBUG] Speech recognition not supported in this browser");
    }
  }, []);

  const toggleRecording = () => {
    if (recording) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setRecording(false);
    } else {
      if (recognitionRef.current) {
        recognitionRef.current.start();
      }
      setRecording(true);
    }
  };

  const handleSubmitText = async () => {
    if (!textInput.trim()) return;
    
    setLocalTranscript(prev => prev + textInput + ' ');
    setTextInput("");
    
    // Submit to the server (if needed)
    // This would be implemented based on your backend API
  };

  const handleSendResponse = async () => {
    if (!localTranscript.trim()) {
      alert("Please provide a response before submitting.");
      return;
    }
    
    if (!sessionId) {
      console.error("[DEBUG] Cannot send response - no session ID available");
      alert("Interview session not properly initialized. Please try refreshing the page.");
      return;
    }
    
    setIsLoading(true);
    try {
      console.log("[DEBUG] Sending response for session:", sessionId);
      // Implement your API call to send response to interview AI
      const response = await fetch('/api/interview/evaluate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sessionId,
          answer: localTranscript,
          isFinal: false
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to send response to interviewer');
      }
      
      const data = await response.json();
      
      console.log("[DEBUG] Received response:", data);
      
      // Play audio if available
      if (data.audio) {
        try {
          console.log("[DEBUG] Processing audio data, length:", data.audio.length);
          
          // Create a safer function to play audio using a promise pattern
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
                  console.log("[DEBUG] Audio ready to play");
                  
                  // Attempt to play the audio
                  audio.play()
                    .then(() => {
                      console.log("[DEBUG] Audio playback started");
                      
                      // Clean up the URL object when playback ends
                      audio.addEventListener('ended', () => {
                        URL.revokeObjectURL(audioUrl);
                        console.log("[DEBUG] Audio playback completed");
                        resolve();
                      });
                    })
                    .catch(playError => {
                      console.error("[DEBUG] Audio play error:", playError);
                      URL.revokeObjectURL(audioUrl);
                      reject(playError);
                    });
                });
                
                audio.addEventListener('error', (e) => {
                  console.error("[DEBUG] Audio loading error:", e);
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
          
          // Attempt to play audio
          console.log("[DEBUG] Attempting to play audio...");
          playAudio(data.audio)
            .catch(audioErr => {
              console.error("[DEBUG] Final audio playback error:", audioErr);
            });
            
        } catch (audioErr) {
          console.error("[DEBUG] Fatal error processing audio:", audioErr);
        }
      } else {
        console.log("[DEBUG] No audio data received in response");
      }
      
      // Handle next question if provided
      if (data.nextQuestion) {
        console.log("[DEBUG] Next question:", data.nextQuestion);
        // If parent component provided a callback to update the question, call it
        if (typeof window.updateInterviewQuestion === 'function') {
          console.log("[DEBUG] Calling parent updateQuestion callback");
          window.updateInterviewQuestion(data.nextQuestion);
        }
      }
      
      // Clear transcript for next response
      setLocalTranscript("");
      
    } catch (error) {
      console.error("[DEBUG] Error submitting response:", error);
      alert("There was an error submitting your response. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

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
            <div className="min-h-[100px] p-3 bg-gray-50 rounded-lg mb-4">
              <p className="text-gray-700">{localTranscript || "Your response will appear here..."}</p>
            </div>
            
            <div className="flex flex-col space-y-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleRecording}
                  className={`flex-1 px-4 py-2 rounded-lg ${recording 
                    ? 'bg-red-500 text-white hover:bg-red-600' 
                    : 'bg-[#4f8df9] text-white hover:bg-blue-600'}`}
                >
                  {recording ? 'Stop Recording' : 'Start Recording'}
                </button>
                
                <button
                  onClick={handleSendResponse}
                  disabled={isLoading || !localTranscript.trim()}
                  className="flex-1 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Sending...' : 'Send Response'}
                </button>
              </div>
              
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder="Or type your response here..."
                  className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#4f8df9]"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmitText();
                    }
                  }}
                />
                
                <button
                  onClick={handleSubmitText}
                  disabled={!textInput.trim()}
                  className="bg-[#4f8df9] text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Add Text
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <div className="space-y-6">
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-4">Interview Info</h2>
            {interviewData && (
              <div className="space-y-2">
                <p><span className="font-medium">Position:</span> {interviewData.jobType}</p>
                <p><span className="font-medium">Level:</span> {interviewData.experienceLevel}</p>
                <p><span className="font-medium">Type:</span> {interviewData.interviewType}</p>
                <p><span className="font-medium">Duration:</span> {interviewData.duration} minutes</p>
              </div>
            )}
          </div>
          
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
