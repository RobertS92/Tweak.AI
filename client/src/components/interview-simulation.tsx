
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
  onStartRecording?: () => void;
  onStopRecording?: () => void;
  onSubmitAnswer?: () => Promise<void>;
  isSpeaking?: boolean;
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

// Function to process transcript text and improve quality
const processTranscriptText = (text: string): string => {
  if (!text) return '';
  
  // Step 1: Remove exact repetitions (same phrase repeated immediately)
  let processed = text;
  
  // Find repetitive patterns (looking for 8+ character sequences that repeat)
  const dupeRegex = /(.{8,}?)(?=\s\1)/gi;
  processed = processed.replace(dupeRegex, '$1');
  
  // Step 2: Fix capitalization
  processed = processed.trim();
  if (processed.length > 0) {
    processed = processed.charAt(0).toUpperCase() + processed.slice(1);
  }
  
  // Step 3: Add periods at natural pauses if missing
  const sentenceFragments = processed.split(/(?<=[.!?])\s+/);
  
  // Step 4: Ensure each fragment has proper punctuation
  const formattedSentences = sentenceFragments.map(fragment => {
    // Skip empty fragments
    if (!fragment.trim()) return '';
    
    // If no ending punctuation, add a period
    if (!/[.!?]$/.test(fragment.trim())) {
      return fragment.trim() + '.';
    }
    return fragment.trim();
  });
  
  // Step 5: Join everything back with proper spacing
  return formattedSentences.join(' ');
};

export default function InterviewSimulation({
  currentQuestion = "",
  transcript = "",
  isRecording = false,
  progress = 0,
  interviewData,
  sessionId: externalSessionId = null,
  onStopInterview = () => window.location.href = '/interview-prep',
  onStartRecording,
  onStopRecording,
  onSubmitAnswer,
  isSpeaking = false
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
      
      // Configure speech recognition for optimal performance
      recognitionRef.current.continuous = true;        // Keep listening even after pauses
      recognitionRef.current.interimResults = true;    // Get results while speaking
      recognitionRef.current.maxAlternatives = 1;      // Get only the most confident result
      
      // Set language - can be made configurable in settings
      recognitionRef.current.lang = 'en-US';           // Use English US
      
      // Improve recognition accuracy by focusing on speech patterns in interviews
      if ('grammars' in recognitionRef.current) {
        try {
          // Advanced settings if available in browser
          (recognitionRef.current as any).grammars = undefined; // No specific grammar, natural speech
        } catch (e) {
          console.log("[DEBUG] Browser doesn't support speech grammar lists");
        }
      }
      
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
        
        // Only process if we have a final transcript
        if (finalTranscript) {
          console.log("[DEBUG] Raw transcript:", finalTranscript);
          
          // Process the transcript to improve readability
          const processedTranscript = processTranscriptText(finalTranscript);
          console.log("[DEBUG] Processed transcript:", processedTranscript);
          
          setLocalTranscript(prevTranscript => {
            // Add proper spacing and join with previous text
            if (prevTranscript) {
              // If previous text ends with punctuation, add space
              if (/[.!?]$/.test(prevTranscript.trim())) {
                return prevTranscript + ' ' + processedTranscript;
              }
              // If no punctuation, add period and space
              return prevTranscript.trim() + '. ' + processedTranscript;
            }
            return processedTranscript;
          });
        }
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
      // Use parent callback if provided
      if (onStopRecording) {
        onStopRecording();
      }
    } else {
      if (recognitionRef.current) {
        recognitionRef.current.start();
      }
      setRecording(true);
      // Use parent callback if provided
      if (onStartRecording) {
        onStartRecording();
      }
    }
  };

  const handleSubmitText = async () => {
    if (!textInput.trim()) return;
    
    // Process the text input with the same function to ensure consistency
    const processedInput = processTranscriptText(textInput);
    console.log("[DEBUG] Processed text input:", processedInput);
    
    setLocalTranscript(prev => {
      if (prev) {
        // Add proper spacing and punctuation
        if (/[.!?]$/.test(prev.trim())) {
          return prev + ' ' + processedInput;
        }
        return prev.trim() + '. ' + processedInput;
      }
      return processedInput;
    });
    
    setTextInput("");
  };

  const completeInterview = async () => {
    if (!sessionId) {
      console.error("[DEBUG] Cannot complete interview - no session ID available");
      alert("Interview session not properly initialized. Please try refreshing the page.");
      return;
    }
    
    setIsLoading(true);
    try {
      console.log("[DEBUG] Completing interview for session:", sessionId);
      
      // If there's a transcript that hasn't been sent, send it first
      if (localTranscript.trim() && !currentQuestion.includes("Thank you for your time")) {
        console.log("[DEBUG] Sending final response before completion");
        
        const submitResponse = await fetch('/api/interview/evaluate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            sessionId,
            answer: localTranscript,
            isFinal: true
          })
        });
        
        if (!submitResponse.ok) {
          console.warn("[DEBUG] Warning: Could not submit final response", await submitResponse.text());
        } else {
          console.log("[DEBUG] Final response submitted successfully");
          // Wait a moment to ensure server has processed the response
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      const response = await fetch(`/api/interview/complete/${sessionId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to complete interview');
      }
      
      const data = await response.json();
      console.log("[DEBUG] Interview completed successfully:", data);
      
      // Forward to analysis if parent provided a handler
      if (onSubmitAnswer) {
        await onSubmitAnswer();
      } else {
        // Direct redirect to feedback page if no parent handler
        window.location.href = `/interview-analysis?sessionId=${sessionId}`;
      }
      
    } catch (error) {
      console.error("[DEBUG] Error completing interview:", error);
      alert("There was an error completing the interview. Please try again.");
    } finally {
      setIsLoading(false);
    }
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
      
      // Process and store follow-up audio if available
      if (data.audio) {
        try {
          console.log("[DEBUG] Processing follow-up audio data, length:", data.audio.length);
          
          // Convert base64 to array buffer
          const binaryString = atob(data.audio);
          const len = binaryString.length;
          const bytes = new Uint8Array(len);
          for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          
          // Create audio blob and URL
          const blob = new Blob([bytes.buffer], { type: 'audio/mpeg' });
          const audioUrl = URL.createObjectURL(blob);
          
          // Store the URL in localStorage so the play button can access it
          localStorage.setItem('currentInterviewAudio', audioUrl);
          console.log("[DEBUG] Follow-up audio URL stored in localStorage for play button");
          
          // Attempt to play audio (will likely fail due to browser policies)
          try {
            const audio = new Audio(audioUrl);
            audio.addEventListener('canplaythrough', () => {
              console.log("[DEBUG] Follow-up audio ready to play");
              console.log("[DEBUG] Attempting to play follow-up audio...");
              
              audio.play()
                .then(() => {
                  console.log("[DEBUG] Follow-up audio playback started automatically");
                })
                .catch(playError => {
                  console.error("[DEBUG] Follow-up audio autoplay error:", playError);
                  console.log("[DEBUG] User will need to click play button to hear audio");
                });
            });
            
            audio.addEventListener('error', (e) => {
              console.error("[DEBUG] Follow-up audio loading error:", e);
            });
          } catch (innerErr) {
            console.error("[DEBUG] Error setting up follow-up audio element:", innerErr);
          }
        } catch (audioErr) {
          console.error("[DEBUG] Fatal error processing follow-up audio:", audioErr);
        }
      } else {
        console.log("[DEBUG] No audio data received in response");
        // Don't remove existing audio from localStorage here, as that would clear
        // the current question's audio which might still be useful
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
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Current Question</h2>
              <button 
                onClick={() => {
                  // Allow user to manually trigger audio playback with button click
                  const audioUrl = localStorage.getItem('currentInterviewAudio');
                  if (audioUrl) {
                    try {
                      const audio = new Audio(audioUrl);
                      audio.play()
                        .then(() => console.log("[DEBUG] Audio played successfully via button"))
                        .catch(e => console.error("[DEBUG] Error playing audio via button:", e));
                    } catch (err) {
                      console.error("[DEBUG] Error creating audio element:", err);
                    }
                  } else {
                    console.log("[DEBUG] No audio URL found in localStorage");
                  }
                }}
                className="bg-blue-600 text-white rounded-lg px-3 py-1 text-sm flex items-center gap-1"
                title="Play current question audio"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="5 3 19 12 5 21 5 3"></polygon>
                </svg>
                Play
              </button>
            </div>
            <p className={`text-gray-700 ${currentQuestion.includes("Thank you for your time") ? "font-semibold text-lg text-center" : ""}`}>
              {currentQuestion}
              
              {currentQuestion.includes("Thank you for your time") && (
                <div className="mt-6 bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <p className="text-center text-blue-800 font-medium mb-4">
                    Your interview is now complete. Click the button below to see your interview analysis!
                  </p>
                  <div className="flex justify-center">
                    <button
                      onClick={completeInterview}
                      className="px-6 py-3 bg-[#4f8df9] text-white rounded-lg hover:bg-blue-700 font-medium"
                    >
                      Complete Interview & View Analysis
                    </button>
                  </div>
                </div>
              )}
            </p>
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
                  disabled={currentQuestion.includes("Thank you for your time")}
                  className={`flex-1 px-4 py-2 rounded-lg ${recording 
                    ? 'bg-red-500 text-white hover:bg-red-600' 
                    : 'bg-[#4f8df9] text-white hover:bg-blue-600'} ${
                    currentQuestion.includes("Thank you for your time") ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {recording ? 'Stop Recording' : 'Start Recording'}
                </button>
                
                <button
                  onClick={handleSendResponse}
                  disabled={isLoading || !localTranscript.trim() || currentQuestion.includes("Thank you for your time")}
                  className="flex-1 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Sending...' : 'Send Response'}
                </button>
              </div>
              
              {!currentQuestion.includes("Thank you for your time") && (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    placeholder="Or type your response here..."
                    className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#4f8df9]"
                    disabled={currentQuestion.includes("Thank you for your time")}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSubmitText();
                      }
                    }}
                  />
                  
                  <button
                    onClick={handleSubmitText}
                    disabled={!textInput.trim() || currentQuestion.includes("Thank you for your time")}
                    className="bg-[#4f8df9] text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    Add Text
                  </button>
                </div>
              )}
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
            <div className="space-y-3">
              {!currentQuestion.includes("Thank you for your time") && (
                <button
                  onClick={completeInterview}
                  disabled={isLoading}
                  className="w-full bg-[#4f8df9] text-white px-4 py-2 rounded-lg hover:bg-[#3a7ad9] disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {isLoading ? "Processing..." : "Complete & Get Feedback"}
                </button>
              )}
              
              <button
                onClick={onStopInterview}
                className="w-full bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600"
              >
                {currentQuestion.includes("Thank you for your time") ? "Return to Dashboard" : "Cancel Interview"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
