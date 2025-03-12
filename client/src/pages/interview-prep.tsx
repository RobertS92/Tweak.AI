import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Mic, Square, Play } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function InterviewPrep() {
  const { toast } = useToast();
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [sessionId, setSessionId] = useState<string>("");
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [interviewStarted, setInterviewStarted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Debug state
  const [debugLogs, setDebugLogs] = useState<string[]>([]);

  const addDebugLog = (message: string) => {
    console.log("[DEBUG]", message);
    setDebugLogs(prev => [...prev, `[${new Date().toISOString()}] ${message}`]);
  };

  // Initialize speech recognition
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);

  useEffect(() => {
    // Initialize speech recognition
    if (window.SpeechRecognition || window.webkitSpeechRecognition) {
      addDebugLog("Initializing speech recognition");
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognitionInstance = new SpeechRecognition();
      recognitionInstance.continuous = true;
      recognitionInstance.interimResults = true;
      recognitionInstance.lang = 'en-US';
      setRecognition(recognitionInstance);
      addDebugLog("Speech recognition initialized successfully");
    } else {
      addDebugLog("Speech recognition not supported by browser");
      toast({
        title: "Speech Recognition Not Available",
        description: "Your browser doesn't support speech recognition. Please use a modern browser like Chrome.",
        variant: "destructive"
      });
    }

    // Initialize audio element
    addDebugLog("Initializing audio element");
    audioRef.current = new Audio();
    audioRef.current.onended = () => {
      setIsSpeaking(false);
      addDebugLog("Audio playback completed");
    };

    // Cleanup
    return () => {
      addDebugLog("Cleaning up speech recognition and audio");
      if (recognition) recognition.stop();
      if (audioRef.current) audioRef.current.pause();
    };
  }, []);

  useEffect(() => {
    if (recognition) {
      recognition.onstart = () => {
        addDebugLog("Speech recognition started");
      };

      recognition.onend = () => {
        addDebugLog("Speech recognition ended");
        if (transcript.trim()) {
          addDebugLog("Processing final transcript");
          evaluateAnswer();
        }
      };

      recognition.onresult = (event) => {
        addDebugLog("Received speech recognition result");
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
            addDebugLog(`Final transcript received: ${finalTranscript}`);
          } else {
            interimTranscript += event.results[i][0].transcript;
            addDebugLog(`Interim transcript: ${interimTranscript}`);
          }
        }

        if (finalTranscript) {
          setTranscript((prev) => {
            const newTranscript = prev + finalTranscript;
            addDebugLog(`Updated transcript length: ${newTranscript.length}`);
            return newTranscript;
          });
        }
      };

      recognition.onerror = (event) => {
        addDebugLog(`Speech recognition error: ${event.error}`);
        toast({
          title: "Error",
          description: "There was an error with the speech recognition. Please try again.",
          variant: "destructive"
        });
        stopRecording();
      };
    }
  }, [recognition]);

  const playAudio = async (base64Audio: string) => {
    try {
      addDebugLog("Starting audio playback");
      if (!audioRef.current) {
        addDebugLog("Audio element not initialized");
        return;
      }

      setIsSpeaking(true);
      addDebugLog(`Creating audio blob from base64 string (length: ${base64Audio.length})`);

      const buffer = Buffer.from(base64Audio, 'base64');
      addDebugLog(`Created buffer of size: ${buffer.length}`);

      const blob = new Blob([buffer], { type: 'audio/mp3' });
      addDebugLog(`Created blob of size: ${blob.size}`);

      const url = URL.createObjectURL(blob);
      addDebugLog(`Created object URL: ${url}`);

      audioRef.current.src = url;

      try {
        await audioRef.current.play();
        addDebugLog("Audio playback started successfully");
      } catch (playError) {
        addDebugLog(`Audio playback failed: ${playError}`);
        throw playError;
      }

      // Cleanup URL after playing
      audioRef.current.onended = () => {
        addDebugLog("Audio playback completed");
        setIsSpeaking(false);
        URL.revokeObjectURL(url);
      };
    } catch (error) {
      addDebugLog(`Audio playback error: ${error}`);
      console.error("Audio playback error:", error);
      setIsSpeaking(false);
      toast({
        title: "Audio Playback Error",
        description: "Failed to play the interviewer's response. Please try again.",
        variant: "destructive"
      });
    }
  };

  const startRecording = () => {
    if (!recognition) {
      addDebugLog("Cannot start recording - recognition not initialized");
      return;
    }
    addDebugLog("Starting recording");
    setIsRecording(true);
    setTranscript("");
    recognition.start();
  };

  const stopRecording = () => {
    if (!recognition) {
      addDebugLog("Cannot stop recording - recognition not initialized");
      return;
    }
    addDebugLog("Stopping recording");
    setIsRecording(false);
    recognition.stop();
  };

  const startInterview = async () => {
    if (!jobDescription) {
      addDebugLog("Interview start failed - missing job description");
      toast({
        title: "Missing Information",
        description: "Please provide the job description.",
        variant: "destructive"
      });
      return;
    }

    setIsAnalyzing(true);
    addDebugLog("Starting interview setup");

    try {
      addDebugLog("Sending job description for analysis");
      const analysisResponse = await fetch('/api/interview/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ jobDescription }),
      });

      if (!analysisResponse.ok) {
        throw new Error('Failed to analyze job description');
      }

      const analysisData = await analysisResponse.json();
      addDebugLog("Job analysis completed successfully");

      addDebugLog("Starting interview session");
      const response = await fetch('/api/interview/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ jobDescription }),
      });

      if (!response.ok) {
        throw new Error('Failed to start interview');
      }

      const data = await response.json();
      addDebugLog(`Interview session created. Session ID: ${data.sessionId}`);

      setSessionId(data.sessionId);
      setCurrentQuestion(data.question);
      setInterviewStarted(true);
      setTranscript("");

      addDebugLog("Playing initial interview question");
      await playAudio(data.audio);

      toast({
        title: "Interview Started",
        description: "The AI interviewer will now ask you questions. Speak naturally to respond.",
      });
    } catch (error) {
      addDebugLog(`Interview start error: ${error}`);
      toast({
        title: "Error",
        description: "Failed to start the interview. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const evaluateAnswer = async () => {
    if (!transcript.trim()) {
      addDebugLog("No answer to evaluate");
      return;
    }

    try {
      addDebugLog("Sending answer for evaluation");
      const response = await fetch('/api/interview/evaluate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          answer: transcript
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get feedback');
      }

      const data = await response.json();
      addDebugLog("Received evaluation response");
      addDebugLog(`Completeness score: ${data.evaluation.completeness}`);

      setCurrentQuestion(data.nextQuestion);
      setTranscript("");

      addDebugLog("Playing AI response");
      await playAudio(data.audio);

    } catch (error) {
      addDebugLog(`Answer evaluation error: ${error}`);
      toast({
        title: "Error",
        description: "Failed to get feedback. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="container py-6 max-w-[1400px] mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">AI Interview Practice</h1>
        <p className="text-muted-foreground mt-2">
          Have a natural conversation with our AI interviewer. Just paste the job description and start speaking.
        </p>
      </div>

      <div className="grid gap-6">
        {!interviewStarted ? (
          <Card>
            <CardHeader>
              <CardTitle>Interview Setup</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Job Description</label>
                <Textarea
                  placeholder="Paste the job description here"
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  className="min-h-[200px]"
                  disabled={interviewStarted}
                />
              </div>
              <Button onClick={startInterview} disabled={isAnalyzing}>
                {isAnalyzing ? "Analyzing..." : "Start Interview"}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Interview Session</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {currentQuestion && (
                <div className="bg-muted p-4 rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium mb-2">Interviewer:</h3>
                      <p className="whitespace-pre-wrap">{currentQuestion}</p>
                    </div>
                    {!isRecording && !isSpeaking && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (audioRef.current && audioRef.current.src) {
                            addDebugLog("Replaying current question");
                            playAudio(audioRef.current.src);
                          }
                        }}
                        disabled={isSpeaking}
                      >
                        <Play className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              )}

              <div className="min-h-[100px] p-4 bg-muted rounded-lg">
                {transcript || "Your answer will appear here as you speak..."}
              </div>

              <div className="flex justify-center">
                <Button
                  variant={isRecording ? "destructive" : "default"}
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={isSpeaking}
                  size="lg"
                  className="rounded-full h-16 w-16 p-0"
                >
                  {isRecording ? (
                    <Square className="h-6 w-6" />
                  ) : (
                    <Mic className="h-6 w-6" />
                  )}
                </Button>
              </div>

              {/* Debug Log Display */}
              <div className="mt-8 p-4 bg-muted rounded-lg text-xs font-mono">
                <h4 className="font-medium mb-2">Debug Logs:</h4>
                <div className="max-h-40 overflow-y-auto">
                  {debugLogs.map((log, index) => (
                    <div key={index} className="py-1">
                      {log}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}