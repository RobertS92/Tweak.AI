import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import InterviewAnalysis from "@/components/interview-analysis";

// Add type definition for SpeechRecognition
interface SpeechRecognitionEvent extends Event {
  results: {
    [index: number]: {
      [index: number]: {
        transcript: string;
      };
      isFinal: boolean;
      length: number;
    };
    length: number;
    resultIndex: number;
  };
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onstart: (event: Event) => void;
  onend: (event: Event) => void;
  onerror: (event: Event) => void;
  onresult: (event: SpeechRecognitionEvent) => void;
}

// Add type definitions for Window
declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognition;
    webkitSpeechRecognition?: new () => SpeechRecognition;
  }
}

const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  const formData = new FormData();
  formData.append("file", file);

  try {
    const response = await fetch("/api/resume-parser", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error("Failed to upload resume");
    }

    const data = await response.json();
    // Handle the parsed resume data here
    console.log("Resume parsed:", data);
  } catch (error) {
    console.error("Error uploading resume:", error);
  }
};
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
  // Added state for form data
  const [interviewType, setInterviewType] = useState("");
  const [experienceLevel, setExperienceLevel] = useState("");
  const [analysisData, setAnalysisData] = useState<{
    scores: {
      technical: number;
      communication: number;
      problemSolving: number;
      jobFit: number;
    };
    overallScore: number;
    questions: Array<{
      question: string;
      performance: 'Excellent' | 'Very Good' | 'Good';
      observation: string;
    }>;
  } | null>(null);


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

  const evaluateAnswer = async (isCompleteInterview = false) => {
    setIsSubmitting(true);

    try {
      // If this is the final answer and we're completing the interview
      if (isCompleteInterview) {
        // First get the feedback to generate analysis
        const completeResponse = await fetch(`/api/interview/complete/${sessionId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (!completeResponse.ok) {
          throw new Error("Failed to complete interview");
        }
        
        // Proceed to get the feedback data
      }
      
      // Get feedback data (whether completing the interview or not)
      const response = await fetch('/api/interview/feedback/' + sessionId, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error('Failed to get feedback');
      }

      const data = await response.json();
      setCurrentQuestion(data.nextQuestion);
      setCurrentAudioData(data.audio);
      setTranscript("");
      setFeedback(data.feedback);
      
      if (data.audio) {
        await playAudio(data.audio);
      }

      if (!data.nextQuestion) {
        setIsComplete(true);
        getInterviewFeedback();
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
  
  const getInterviewFeedback = async () => {
    if (!sessionId) {
      toast({
        title: "Error",
        description: "No active interview session found.",
        variant: "destructive"
      });
      return;
    }
    
    setIsSubmitting(true);
    try {
      // Get detailed feedback
      const response = await fetch(`/api/interview/feedback/${sessionId}`);

      if (!response.ok) {
        throw new Error('Failed to get feedback');
      }

      const data = await response.json();
      setAnalysisData({
        scores: data.scores,
        overallScore: data.overallScore,
        questions: data.questions
      });
      
      toast({
        title: "Interview Completed",
        description: "Thank you for completing the interview. Your feedback is ready.",
      });
    } catch (error) {
      console.error("Error getting feedback:", error);
      toast({
        title: "Error",
        description: "Failed to get feedback. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const resetInterview = () => {
    setIsComplete(false);
    setInterviewStarted(false);
    setSessionId("");
    setCurrentQuestion("");
    setTranscript("");
    setCurrentAudioData("");
    setFeedback(null);
    setAnalysisData(null);
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

    console.log("[DEBUG] Starting interview with params:", {
      type: interviewType,
      level: experienceLevel,
      jobType: jobType
    });

    const interviewJobDescription = `${experienceLevel} ${jobType} position requiring ${interviewType} expertise`;
    const defaultJobDesc = `${jobType} position requiring ${interviewType} expertise`;
    try {
      if (!interviewType || !experienceLevel || !jobType) {
        throw new Error("Please select all interview preferences");
      }

      // Save interview preferences to localStorage
      localStorage.setItem('interviewPrefs', JSON.stringify({
        type: interviewType,
        level: experienceLevel,
        jobType: jobType,
        jobDescription: interviewJobDescription
      }));

      const params = new URLSearchParams({
        type: interviewType,
        level: experienceLevel,
        jobType: jobType,
        jobDescription: interviewJobDescription
      });

      const analysisResponse = await fetch('/api/interview/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobDescription: interviewJobDescription, durationMinutes: interviewDuration }),
      });

      if (!analysisResponse.ok) {
        throw new Error('Failed to analyze job description');
      }

      const analysisData = await analysisResponse.json();

      const response = await fetch('/api/interview/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          jobDescription: interviewJobDescription, 
          durationMinutes: interviewDuration,
          type: interviewType,
          level: experienceLevel,
          jobType: jobType
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to start interview');
      }

      const data = await response.json();

      setSessionId(data.sessionId);
      setCurrentQuestion(data.question);
      setCurrentAudioData(data.audio);
      setInterviewStarted(true);
      setIsLiveInterview(true);
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
  
  const completeInterview = async () => {
    if (!sessionId) {
      toast({
        title: "Error",
        description: "No active interview session found.",
        variant: "destructive"
      });
      return;
    }
    
    setIsSubmitting(true);
    try {
      // Complete the interview early
      const response = await fetch(`/api/interview/complete/${sessionId}`, {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error('Failed to complete interview');
      }

      setIsComplete(true);
      setIsLiveInterview(false);
      
      // Get the feedback
      getInterviewFeedback();
      
    } catch (error) {
      console.error("Error completing interview:", error);
      toast({
        title: "Error",
        description: "Failed to complete the interview. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Added form submission handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAnalyzing(true);

    try {
      if (!interviewType || !experienceLevel || !jobType) {
        throw new Error("Please select all interview preferences");
      }

      const interviewData = {
        jobType: jobType?.trim() || '',
        experienceLevel: experienceLevel || '',
        interviewType: interviewType || '',
        difficulty: difficulty || 'Standard',
        duration: interviewDuration || 15,
        jobDescription: jobDescription || '',
        sessionId: Date.now().toString()
      };

      // Validate all required fields
      const requiredFormFields = ['jobType', 'experienceLevel', 'interviewType', 'jobDescription'];
      const missingFields = requiredFormFields.filter(field => !interviewData[field]);

      // Set default job description if none provided
      if (!interviewData.jobDescription) {
        interviewData.jobDescription = `${interviewData.experienceLevel} ${interviewData.jobType} position requiring ${interviewData.interviewType} expertise`;
      }

      console.log("[DEBUG] Saving interview data:", interviewData);


      if (missingFields.length > 0) {
        throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
      }

      // Store interview data in localStorage
      localStorage.setItem('interviewData', JSON.stringify(interviewData));

      // Verify data was stored correctly
      const storedData = localStorage.getItem('interviewData');
      const parsedData = storedData ? JSON.parse(storedData) : null;

      if (!parsedData || !parsedData.jobType || !parsedData.experienceLevel || !parsedData.interviewType) {
        throw new Error("Failed to save interview data");
      }

      // Navigate to interview simulation
      window.location.href = '/interview-simulation';
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
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
              {/* Added form for interview preferences */}
              <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="font-semibold text-[#2c3e50]">Interview Type</label>
                    <Select value={interviewType} onValueChange={setInterviewType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select interview type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Technical">Technical</SelectItem>
                        <SelectItem value="Behavioral">Behavioral</SelectItem>
                        <SelectItem value="Mixed">Mixed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="font-semibold text-[#2c3e50]">Experience Level</label>
                    <Select value={experienceLevel} onValueChange={setExperienceLevel}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select experience level" />
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
                    <label className="font-semibold text-[#2c3e50]">Job Title</label>
                    <input
                      type="text"
                      value={jobType}
                      onChange={(e) => setJobType(e.target.value)}
                      placeholder="Enter job title (e.g. Frontend Developer)"
                      className="w-full px-4 py-3 rounded-md border"
                    />
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
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.txt"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="resume-upload"
                  />
                  <label htmlFor="resume-upload">
                    <Button variant="secondary" className="cursor-pointer" asChild>
                      <span>Upload</span>
                    </Button>
                  </label>
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



                <div className="space-y-4">
                  <Button
                    className="w-full bg-[#4f8df9] hover:bg-[#3a7ad9] h-12"
                    onClick={(e) => {
                      e.preventDefault();
                      setShowPreview(true);
                    }}
                    disabled={!jobType || !difficulty || !interviewType || !experienceLevel}
                  >
                    Preview Interview
                  </Button>
                  <Button
                    type="submit"
                    className="w-full bg-[#1e2a3b] hover:bg-[#2c3e50] h-12"
                    onClick={handleSubmit}
                    disabled={isAnalyzing || !jobType}
                  >
                    {isAnalyzing ? "Preparing Interview..." : "Start Interview"}
                  </Button>
                </div>
              </form>
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
        </div>
      </div>
      {isLiveInterview && !isComplete ? (
        <InterviewSimulation
          currentQuestion={currentQuestion}
          transcript={transcript}
          isRecording={isRecording}
          onStopInterview={() => setIsLiveInterview(false)}
          onStartRecording={startRecording}
          onStopRecording={stopRecording}
          onSubmitAnswer={completeInterview}
          isSpeaking={isSpeaking}
        />
      ) : !isLiveInterview && !isComplete ? (
        // Preparation UI content here
        <div className="max-w-[1200px] mx-auto px-6 py-4">
          {/* Rest of your preparation UI */}
        </div>
      ) : null}
      
      {isComplete && analysisData && (
        <div className="fixed inset-0 bg-white overflow-auto p-6 z-50">
          <div className="max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-bold text-[#2c3e50]">Interview Results</h2>
              <Button 
                onClick={resetInterview}
                variant="outline"
              >
                Start New Interview
              </Button>
            </div>
            
            <InterviewAnalysis
              scores={analysisData.scores}
              overallScore={analysisData.overallScore}
              questions={analysisData.questions}
            />
          </div>
        </div>
      )}
    </div>
  );
}