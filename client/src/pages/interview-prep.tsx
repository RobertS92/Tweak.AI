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
  const [currentAudioData, setCurrentAudioData] = useState<string>("");
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (window.SpeechRecognition || window.webkitSpeechRecognition) {
      console.log("[DEBUG] Initializing speech recognition");
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognitionInstance = new SpeechRecognition();
      recognitionInstance.continuous = true;
      recognitionInstance.interimResults = true;
      recognitionInstance.lang = 'en-US';
      setRecognition(recognitionInstance);
      console.log("[DEBUG] Speech recognition initialized successfully");
    } else {
      console.log("[DEBUG] Speech recognition not supported by browser");
      toast({
        title: "Speech Recognition Not Available",
        description: "Your browser doesn't support speech recognition. Please use a modern browser like Chrome.",
        variant: "destructive"
      });
    }

    audioRef.current = new Audio();
    audioRef.current.onended = () => setIsSpeaking(false);

    return () => {
      if (recognition) recognition.stop();
      if (audioRef.current) audioRef.current.pause();
    };
  }, []);

  useEffect(() => {
    if (recognition) {
      recognition.onstart = () => {
        console.log("[DEBUG] Speech recognition started");
      };

      recognition.onend = () => {
        console.log("[DEBUG] Speech recognition ended");
        if (transcript.trim()) {
          console.log("[DEBUG] Processing final transcript");
          evaluateAnswer();
        }
      };

      recognition.onresult = (event) => {
        console.log("[DEBUG] Received speech recognition result");
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
            console.log(`[DEBUG] Final transcript received: ${finalTranscript}`);
          } else {
            interimTranscript += event.results[i][0].transcript;
            console.log(`[DEBUG] Interim transcript: ${interimTranscript}`);
          }
        }

        if (finalTranscript) {
          setTranscript((prev) => {
            const newTranscript = prev + finalTranscript;
            console.log(`[DEBUG] Updated transcript length: ${newTranscript.length}`);
            return newTranscript;
          });
        }
      };

      recognition.onerror = (event) => {
        console.log(`[DEBUG] Speech recognition error: ${event.error}`);
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
      console.log("[DEBUG] Starting audio playback");
      if (!audioRef.current) {
        console.log("[DEBUG] Audio element not initialized");
        return;
      }

      setIsSpeaking(true);
      console.log(`[DEBUG] Creating audio blob from base64 string`);

      // Convert base64 to binary
      const binaryString = window.atob(base64Audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Create blob and URL
      const blob = new Blob([bytes], { type: 'audio/mp3' });
      const url = URL.createObjectURL(blob);
      console.log(`[DEBUG] Created audio URL: ${url}`);

      // Set up audio element
      audioRef.current.src = url;

      try {
        await audioRef.current.play();
        console.log("[DEBUG] Audio playback started successfully");
      } catch (playError) {
        console.log(`[DEBUG] Audio playback failed: ${playError}`);
        throw playError;
      }

      audioRef.current.onended = () => {
        console.log("[DEBUG] Audio playback completed");
        setIsSpeaking(false);
        URL.revokeObjectURL(url);
      };
    } catch (error) {
      console.log(`[DEBUG] Audio playback error: ${error}`);
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
      console.log("[DEBUG] Cannot start recording - recognition not initialized");
      return;
    }
    console.log("[DEBUG] Starting recording");
    setIsRecording(true);
    setTranscript("");
    recognition.start();
  };

  const stopRecording = () => {
    if (!recognition) {
      console.log("[DEBUG] Cannot stop recording - recognition not initialized");
      return;
    }
    console.log("[DEBUG] Stopping recording");
    setIsRecording(false);
    recognition.stop();
  };

  const startInterview = async () => {
    if (!jobDescription) {
      console.log("[DEBUG] Interview start failed - missing job description");
      toast({
        title: "Missing Information",
        description: "Please provide the job description.",
        variant: "destructive"
      });
      return;
    }

    setIsAnalyzing(true);
    console.log("[DEBUG] Starting interview setup");

    try {
      console.log("[DEBUG] Sending job description for analysis");
      const analysisResponse = await fetch('/api/interview/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobDescription }),
      });

      if (!analysisResponse.ok) {
        throw new Error('Failed to analyze job description');
      }

      const analysisData = await analysisResponse.json();
      console.log("[DEBUG] Job analysis completed successfully");

      console.log("[DEBUG] Starting interview session");
      const response = await fetch('/api/interview/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobDescription }),
      });

      if (!response.ok) {
        throw new Error('Failed to start interview');
      }

      const data = await response.json();
      console.log(`[DEBUG] Interview session created. Session ID: ${data.sessionId}`);

      setSessionId(data.sessionId);
      setCurrentQuestion(data.question);
      setCurrentAudioData(data.audio);
      setInterviewStarted(true);
      setTranscript("");

      console.log("[DEBUG] Playing initial interview question");
      await playAudio(data.audio);

      toast({
        title: "Interview Started",
        description: "The AI interviewer will now ask you questions. Speak naturally to respond.",
      });
    } catch (error) {
      console.log(`[DEBUG] Interview start error: ${error}`);
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
      console.log("[DEBUG] No answer to evaluate");
      return;
    }

    try {
      console.log("[DEBUG] Sending answer for evaluation");
      const response = await fetch('/api/interview/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          answer: transcript
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get feedback');
      }

      const data = await response.json();
      console.log("[DEBUG] Received evaluation response");
      console.log(`[DEBUG] Completeness score: ${data.evaluation.completeness}`);

      setCurrentQuestion(data.nextQuestion);
      setCurrentAudioData(data.audio);
      setTranscript("");

      console.log("[DEBUG] Playing AI response");
      await playAudio(data.audio);

    } catch (error) {
      console.log(`[DEBUG] Answer evaluation error: ${error}`);
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
                          console.log("[DEBUG] Replaying current question");
                          if (currentAudioData) {
                            playAudio(currentAudioData);
                          }
                        }}
                        disabled={isSpeaking || !currentAudioData}
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
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}