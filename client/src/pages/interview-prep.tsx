import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Mic, Square, Play, Send } from "lucide-react";
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);
  const [interviewDuration, setInterviewDuration] = useState(15);
  const [feedback, setFeedback] = useState<{ feedback: string; scores: any } | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (window.SpeechRecognition || window.webkitSpeechRecognition) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognitionInstance = new SpeechRecognition();
      recognitionInstance.continuous = true;
      recognitionInstance.interimResults = true;
      recognitionInstance.lang = 'en-US';
      setRecognition(recognitionInstance);
    } else {
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
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

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

        if (finalTranscript) {
          setTranscript((prev) => prev + finalTranscript);
        }
      };

      recognition.onerror = (event) => {
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
      if (!audioRef.current) return;

      setIsSpeaking(true);

      const binaryString = window.atob(base64Audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const blob = new Blob([bytes], { type: 'audio/mp3' });
      const url = URL.createObjectURL(blob);

      audioRef.current.src = url;

      await audioRef.current.play();

      audioRef.current.onended = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(url);
      };
    } catch (error) {
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

  const evaluateAnswer = async () => {
    if (!transcript.trim()) return;

    setIsSubmitting(true);

    try {
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
      setCurrentQuestion(data.nextQuestion);
      setCurrentAudioData(data.audio);
      setTranscript("");
      setFeedback(data.feedback); // Set feedback data
      await playAudio(data.audio);

      if (!data.nextQuestion) {
        setIsComplete(true);
      }

    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to get feedback. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
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
      const analysisResponse = await fetch('/api/interview/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobDescription, durationMinutes: interviewDuration }),
      });

      if (!analysisResponse.ok) {
        throw new Error('Failed to analyze job description');
      }

      const analysisData = await analysisResponse.json();

      const response = await fetch('/api/interview/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobDescription, durationMinutes: interviewDuration }),
      });

      if (!response.ok) {
        throw new Error('Failed to start interview');
      }

      const data = await response.json();

      setSessionId(data.sessionId);
      setCurrentQuestion(data.question);
      setCurrentAudioData(data.audio);
      setInterviewStarted(true);
      setTranscript("");

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

  return (
    <div className="container py-6 max-w-[1400px] mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">AI Interview Practice</h1>
        <p className="text-muted-foreground mt-2">
          Have a natural conversation with our AI interviewer. Just paste the job description and start speaking.
        </p>
      </div>

      <div className="grid gap-6">
        {!interviewStarted && !isComplete ? (
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
              <div>
                <label htmlFor="interviewDuration">Interview Duration (minutes):</label>
                <select id="interviewDuration" value={interviewDuration} onChange={(e) => setInterviewDuration(parseInt(e.target.value, 10))}>
                  <option value={15}>15</option>
                  <option value={30}>30</option>
                  <option value={45}>45</option>
                </select>
              </div>
              <Button onClick={startInterview} disabled={isAnalyzing}>
                {isAnalyzing ? "Analyzing..." : "Start Interview"}
              </Button>
            </CardContent>
          </Card>
        ) : (
          !isComplete ? (
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

                <div className="flex justify-center gap-4">
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

                  {!isRecording && transcript && (
                    <Button
                      onClick={evaluateAnswer}
                      disabled={isSubmitting || isSpeaking}
                      size="lg"
                      className="rounded-full h-16 w-16 p-0"
                    >
                      <Send className="h-6 w-6" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Interview Complete</CardTitle>
              </CardHeader>
              <CardContent>
                <p>The interview is finished. Thank you!</p>
                {isComplete && feedback && (
                  <div className="mt-4">
                    <div className="text-lg font-medium">Scores:</div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>Clarity and Conciseness: {feedback.scores.clarity}/10</div>
                      <div>Answer Quality: {feedback.scores.quality}/10</div>
                      <div>Technical Accuracy: {feedback.scores.technical}/10</div>
                      <div>Communication Skills: {feedback.scores.communication}/10</div>
                      <div>Overall Performance: {feedback.scores.overall}/10</div>
                    </div>
                    <div className="mt-4">
                      <div className="text-lg font-medium">Detailed Feedback:</div>
                      <p className="mt-2 whitespace-pre-wrap">{feedback.feedback}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        )}
      </div>
    </div>
  );
}