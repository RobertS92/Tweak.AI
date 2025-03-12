import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Mic, MicOff, Play, Square } from "lucide-react";
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

  // Initialize speech recognition
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);

  useEffect(() => {
    // Initialize speech recognition
    if (window.SpeechRecognition || window.webkitSpeechRecognition) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognitionInstance = new SpeechRecognition();
      recognitionInstance.continuous = true;
      recognitionInstance.interimResults = true;
      recognitionInstance.lang = 'en-US'; // Set language for better accuracy
      setRecognition(recognitionInstance);
    } else {
      toast({
        title: "Speech Recognition Not Available",
        description: "Your browser doesn't support speech recognition. Please use a modern browser like Chrome.",
        variant: "destructive"
      });
    }

    // Initialize audio element
    audioRef.current = new Audio();
    audioRef.current.onended = () => setIsSpeaking(false);

    return () => {
      if (recognition) recognition.stop();
      if (audioRef.current) audioRef.current.pause();
    };
  }, []);

  useEffect(() => {
    if (recognition) {
      recognition.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        setTranscript((prev) => prev + finalTranscript);
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        toast({
          title: "Error",
          description: "There was an error with the speech recognition. Please try again.",
          variant: "destructive"
        });
        stopRecording();
      };

      recognition.onend = () => {
        if (transcript.trim()) {
          evaluateAnswer();
        }
      };
    }
  }, [recognition, transcript]);

  const playAudio = async (base64Audio: string) => {
    if (!audioRef.current) return;

    setIsSpeaking(true);
    const blob = new Blob([Buffer.from(base64Audio, 'base64')], { type: 'audio/mp3' });
    const url = URL.createObjectURL(blob);

    audioRef.current.src = url;
    await audioRef.current.play();

    // Cleanup URL after playing
    audioRef.current.onended = () => {
      setIsSpeaking(false);
      URL.revokeObjectURL(url);
    };
  };

  const startRecording = () => {
    if (!recognition) return;
    setIsRecording(true);
    setTranscript("");
    recognition.start();
  };

  const stopRecording = () => {
    if (!recognition) return;
    setIsRecording(false);
    recognition.stop();
  };

  const startInterview = async () => {
    if (!jobDescription) {
      toast({
        title: "Missing Information",
        description: "Please provide the job description.",
        variant: "destructive"
      });
      return;
    }

    setIsAnalyzing(true);

    try {
      // First analyze the job description
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
      console.log("[DEBUG] Job analysis:", analysisData);

      // Start the interview session
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
      setSessionId(data.sessionId);
      setCurrentQuestion(data.question);
      setInterviewStarted(true);
      setTranscript("");

      // Play the AI's question
      await playAudio(data.audio);

      toast({
        title: "Interview Started",
        description: "The AI interviewer will now ask you questions. Speak naturally to respond.",
      });
    } catch (error) {
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
      return;
    }

    try {
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
      setCurrentQuestion(data.nextQuestion);
      setTranscript("");

      // Play the AI's response
      await playAudio(data.audio);

    } catch (error) {
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
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}