import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Mic, MicOff, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function InterviewPrep() {
  const { toast } = useToast();
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [feedback, setFeedback] = useState("");
  const [interviewStarted, setInterviewStarted] = useState(false);

  // Initialize speech recognition
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SpeechRecognition();
  
  recognition.continuous = true;
  recognition.interimResults = true;

  recognition.onresult = (event) => {
    const current = event.resultIndex;
    const transcript = event.results[current][0].transcript;
    setTranscript((prev) => prev + " " + transcript);
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

  const startRecording = () => {
    setIsRecording(true);
    recognition.start();
  };

  const stopRecording = () => {
    setIsRecording(false);
    recognition.stop();
  };

  const startInterview = async () => {
    if (!jobDescription || !companyName) {
      toast({
        title: "Missing Information",
        description: "Please provide both job description and company name.",
        variant: "destructive"
      });
      return;
    }

    try {
      const response = await fetch('/api/interview/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jobDescription,
          companyName
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to start interview');
      }

      setInterviewStarted(true);
      setTranscript("");
      toast({
        title: "Interview Started",
        description: "The AI interviewer will now ask you questions. Click the microphone to start answering.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to start the interview. Please try again.",
        variant: "destructive"
      });
    }
  };

  const submitAnswer = async () => {
    if (!transcript.trim()) {
      toast({
        title: "No Answer",
        description: "Please provide an answer before submitting.",
        variant: "destructive"
      });
      return;
    }

    try {
      const response = await fetch('/api/interview/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          answer: transcript,
          jobDescription,
          companyName
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get feedback');
      }

      const data = await response.json();
      setFeedback(data.feedback);
      setTranscript("");
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
        <h1 className="text-2xl font-bold">AI Interview Preparation</h1>
        <p className="text-muted-foreground mt-2">
          Practice your interview skills with our AI interviewer. Speak naturally and get instant feedback.
        </p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Interview Setup</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Company Name</label>
              <Input
                placeholder="Enter company name"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                disabled={interviewStarted}
              />
            </div>
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
            {!interviewStarted && (
              <Button onClick={startInterview}>Start Interview</Button>
            )}
          </CardContent>
        </Card>

        {interviewStarted && (
          <Card>
            <CardHeader>
              <CardTitle>Interview Session</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="min-h-[100px] p-4 bg-muted rounded-lg">
                {transcript || "Your answer will appear here as you speak..."}
              </div>
              
              <div className="flex gap-4">
                <Button
                  variant={isRecording ? "destructive" : "default"}
                  onClick={isRecording ? stopRecording : startRecording}
                >
                  {isRecording ? (
                    <>
                      <MicOff className="w-4 h-4 mr-2" />
                      Stop Recording
                    </>
                  ) : (
                    <>
                      <Mic className="w-4 h-4 mr-2" />
                      Start Recording
                    </>
                  )}
                </Button>
                <Button onClick={submitAnswer} disabled={!transcript.trim()}>
                  <Send className="w-4 h-4 mr-2" />
                  Submit Answer
                </Button>
              </div>

              {feedback && (
                <div className="p-4 bg-muted rounded-lg">
                  <h3 className="font-medium mb-2">Feedback:</h3>
                  <p className="whitespace-pre-wrap">{feedback}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
