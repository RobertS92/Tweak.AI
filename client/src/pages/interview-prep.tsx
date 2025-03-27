import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Mic, Square, Play, Send, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Plus, FileText, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import InterviewSimulation from '@/components/interview-simulation'; // Added import

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
  const [jobType, setJobType] = useState("Software Engineer");
  const [jobLevel, setJobLevel] = useState("Mid-Level");
  const [difficulty, setDifficulty] = useState("Standard");
  const [interviewFocus, setInterviewFocus] = useState("Technical");
  const [showPreview, setShowPreview] = useState(false);
  const [isLiveInterview, setIsLiveInterview] = useState(false);
  const [interviewResults, setInterviewResults] = useState(null);
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
      setFeedback(data.feedback);
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
    setIsLiveInterview(true);
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
    <div className="min-h-screen bg-[#f5f7fa]">
      <div className="border-b bg-white">
        <div className="max-w-[1200px] mx-auto px-6 h-[70px] flex items-center">
          <h1 className="text-2xl font-bold text-[#2c3e50]">AI Interview Practice</h1>
        </div>
      </div>
      <div className="max-w-[1200px] mx-auto px-6 py-4">
        <p className="text-muted-foreground mb-6">Practice your interview skills with our AI interviewer tailored to specific job positions</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Interview Setup</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="font-semibold text-[#2c3e50]">Job Type</label>
                  <Select value={jobType} onValueChange={setJobType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select job type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Software Engineer">Software Engineer</SelectItem>
                      <SelectItem value="Data Scientist">Data Scientist</SelectItem>
                      <SelectItem value="Product Manager">Product Manager</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="font-semibold text-[#2c3e50]">Level</label>
                  <Select value={jobLevel} onValueChange={setJobLevel}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Entry-Level">Entry-Level</SelectItem>
                      <SelectItem value="Mid-Level">Mid-Level</SelectItem>
                      <SelectItem value="Senior">Senior</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="font-semibold text-[#2c3e50]">Job Description</label>
                <Textarea
                  placeholder="Paste the job description here to customize the interview questions..."
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  className="min-h-[150px]"
                />
              </div>

              <div className="bg-[#f0f7ff] border border-[#4f8df9] rounded-lg p-4 flex items-center justify-between">
                <span className="text-[#4f8df9] font-semibold flex items-center gap-2">
                  <Upload size={20} />
                  Upload your resume for more targeted questions
                </span>
                <Button variant="secondary">Upload</Button>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-[#2c3e50]">Interview Settings</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm text-[#2c3e50]">Duration</label>
                    <Select value={String(interviewDuration)} onValueChange={(v) => setInterviewDuration(Number(v))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select duration" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">15 minutes</SelectItem>
                        <SelectItem value="30">30 minutes</SelectItem>
                        <SelectItem value="45">45 minutes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-[#2c3e50]">Difficulty</label>
                    <Select value={difficulty} onValueChange={setDifficulty}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select difficulty" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Standard">Standard</SelectItem>
                        <SelectItem value="Advanced">Advanced</SelectItem>
                        <SelectItem value="Expert">Expert</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-[#2c3e50]">Interview Focus</label>
                <div className="flex gap-2">
                  {["Technical", "Behavioral", "Mixed"].map((focus) => (
                    <Button
                      key={focus}
                      variant={interviewFocus === focus ? "default" : "outline"}
                      onClick={() => setInterviewFocus(focus)}
                      className={cn(
                        "flex-1",
                        interviewFocus === focus && "bg-[#4f8df9]"
                      )}
                    >
                      {focus}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <Button 
                  className="w-full bg-[#4f8df9] hover:bg-[#3a7ad9] h-12" 
                  onClick={() => setShowPreview(true)}
                  disabled={!jobType || !jobLevel || !difficulty || !interviewFocus}
                >
                  Preview Interview
                </Button>
                <Button 
                  className="w-full bg-[#1e2a3b] hover:bg-[#2c3e50] h-12" 
                  onClick={startInterview}
                  disabled={isAnalyzing || !jobType}
                >
                  {isAnalyzing ? "Preparing Interview..." : "Start Interview"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Interview Preview Card - Only shown after setup and preview click */}
          {jobType && jobLevel && difficulty && interviewFocus && showPreview && (
            <Card className="bg-[#f5f7fa]">
              <CardHeader>
                <CardTitle>Interview Preview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <Card className="border">
                  <CardContent className="flex gap-4 p-4">
                    <div className="w-20 h-20 rounded-full bg-[#3498db] flex items-center justify-center">
                      <span className="text-2xl font-bold text-white">AI</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">AI Interviewer</h3>
                      <p className="text-sm text-muted-foreground">{jobLevel} {jobType} Interview</p>
                      <p className="text-sm text-muted-foreground">{interviewFocus} Focus • {difficulty} Difficulty</p>
                    </div>
                  </CardContent>
                </Card>

                <div className="space-y-4">
                  <div>
                    <h3 className="font-bold mb-2">What to Expect:</h3>
                    <div className="space-y-2">
                      <div className="bg-[#f9f9fa] p-3 rounded-lg text-sm">
                        • {interviewDuration} minute {interviewFocus.toLowerCase()} interview
                      </div>
                      <div className="bg-[#f9f9fa] p-3 rounded-lg text-sm">
                        • Questions tailored to {jobLevel.toLowerCase()} {jobType.toLowerCase()} roles
                      </div>
                      <div className="bg-[#f9f9fa] p-3 rounded-lg text-sm">
                        • {difficulty} level technical and behavioral assessment
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-bold mb-2">Post-Interview Analysis Will Include:</h3>
                    <div className="space-y-2">
                      <div className="bg-[#f9f9fa] p-3 rounded-lg text-sm">
                        • Response quality and relevance scoring
                      </div>
                      <div className="bg-[#f9f9fa] p-3 rounded-lg text-sm">
                        • Communication skills assessment
                      </div>
                      <div className="bg-[#f9f9fa] p-3 rounded-lg text-sm">
                        • Technical knowledge evaluation
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#f0f7ff] border border-[#4f8df9] rounded-lg p-4">
                    <div className="flex gap-3">
                      <span className="text-xl">💡</span>
                      <div>
                        <p className="font-semibold text-[#2c3e50]">How it works:</p>
                        <p className="text-sm text-[#2c3e50]">
                          Our AI will ask relevant questions, analyze your responses in real-time, and provide comprehensive feedback to help improve your interview skills.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div>
            <div className="space-y-2">
              <h3 className="font-bold">Post-Interview Analysis Will Include:</h3>
              <ul className="space-y-2">
                {[
                  "Detailed performance score for each question",
                  "Speech analysis (filler words, pacing, clarity)",
                  "Keyword usage compared to job description",
                  "Personalized improvement suggestions"
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#2ecc71]" />
                    <span className="text-sm">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-[#f0f7ff] border border-[#4f8df9] rounded-lg p-4">
              <div className="flex gap-3">
                <span className="text-xl">💡</span>
                <div>
                  <p className="font-semibold text-[#2c3e50]">How it works:</p>
                  <p className="text-sm text-[#2c3e50]">
                    Our AI will ask relevant questions, analyze your responses in real-time, and provide comprehensive feedback to help improve your interview skills.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {!isLiveInterview ? (
        <div>
          {/* Rest of the preparation UI */}
        </div>
      ) : (
        <InterviewSimulation
          currentQuestion={currentQuestion}
          transcript={transcript}
          isRecording={isRecording}
          onStopInterview={() => setIsLiveInterview(false)}
        />
      )}
    </div>
  );
}