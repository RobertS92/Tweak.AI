import { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Send, Upload, Download, Loader2, Save } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import ResumePreview from "@/components/resume-preview";

interface Message {
  type: 'user' | 'ai';
  content: string;
}

interface GeneratedResume {
  id: number;
  content: string;
  title: string;
}

export default function MobileResumeChat() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([{
    type: 'ai',
    content: "Hello! I'm your AI resume assistant. You can either upload an existing resume for me to work with, or tell me about your experience, skills, and education. I'll help create a professional resume for you."
  }]);
  const [input, setInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedResume, setGeneratedResume] = useState<GeneratedResume | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  // Add authentication-related message when user logs in
  useEffect(() => {
    if (user && messages.length > 1) {
      // Add a welcome message
      setMessages(prev => [...prev, {
        type: 'ai',
        content: `Welcome ${user.name || user.username}! You're now logged in and can download your resume.`
      }]);
      
      // If there's an anonymous resume that was created before login,
      // claim it for the user automatically
      if (generatedResume && generatedResume.id) {
        claimAnonymousResume(generatedResume.id);
      }
    }
  }, [user]);
  
  // Function to claim an anonymous resume for the logged-in user
  const claimAnonymousResume = async (resumeId: number) => {
    if (!user) return; // Do nothing if not logged in
    
    try {
      console.log(`Attempting to claim resume ID ${resumeId} for user ID ${user.id}`);
      
      // Use apiRequest instead of fetch to ensure consistent cookie handling
      const response = await apiRequest("POST", `/api/resumes/claim/${resumeId}`);
      
      const data = await response.json();
      
      // Update the resume in state with the claimed one
      if (data.resume) {
        setGeneratedResume({
          id: data.resume.id,
          content: data.resume.enhancedContent || data.resume.content,
          title: data.resume.title
        });
        
        // Let the user know their resume was saved
        toast({
          title: "Resume Saved",
          description: "Your resume has been saved to your account"
        });
        
        // Invalidate the resumes query to refresh the dashboard if user navigates there
        queryClient.invalidateQueries({ queryKey: ["/api/resumes"] });
      }
    } catch (error) {
      console.error("Error claiming resume:", error);
      toast({
        title: "Failed to Save Resume",
        description: error instanceof Error ? error.message : "Couldn't associate the resume with your account",
        variant: "destructive"
      });
    }
  };

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const generateResumeMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await apiRequest("POST", "/api/resumes/generate", {
        content
      });

      const data = await response.json();
      return data;
    },
    onSuccess: (data) => {
      // Store the resume ID and content in the state
      setGeneratedResume({
        id: data.id,
        content: data.content,
        title: data.title || 'generated-resume'
      });
      
      setMessages(prev => [...prev, {
        type: 'ai',
        content: "I've generated your resume! You can now download it or continue chatting with me to make adjustments."
      }]);
      
      toast({
        title: "Resume Generated",
        description: "Your resume has been created successfully!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate resume. Please try again.",
        variant: "destructive"
      });
    }
  });

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append("resume", file);

      // We need to use fetch directly for FormData uploads
      // but ensure credentials are properly included
      const response = await fetch("/api/resumes", {
        method: "POST",
        body: formData,
        credentials: 'include' // Include cookies for auth if available
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(errorData || "Failed to upload resume");
      }

      const data = await response.json();
      
      // Store the uploaded resume data 
      setGeneratedResume({
        id: data.id,
        content: data.enhancedContent || data.content,
        title: data.title || file.name
      });
      
      setMessages(prev => [...prev, 
        { type: 'user', content: `Uploaded resume: ${file.name}` },
        { type: 'ai', content: "I've received your resume. Would you like me to enhance it or create a new version based on it? You can also download it, but you'll need to log in first." }
      ]);
      
      // Invalidate the resumes query to refresh the dashboard if user navigates there
      if (user) {
        queryClient.invalidateQueries({ queryKey: ["/api/resumes"] });
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to upload resume",
        variant: "destructive"
      });
    }
  };

  const handleSubmit = async () => {
    if (!input.trim()) return;

    const userMessage = input.trim();
    setInput("");
    setMessages(prev => [...prev, { type: 'user', content: userMessage }]);

    if (generatedResume && userMessage.toLowerCase().includes('download')) {
      try {
        // Check if user is authenticated first
        if (!user) {
          setMessages(prev => [...prev, {
            type: 'ai',
            content: "You need to log in or create an account to download your resume. This ensures your data is saved and secure. Would you like to create an account now?"
          }]);
          return;
        }
        
        // Use apiRequest for consistent credential handling
        console.log(`Attempting to download resume ID ${generatedResume.id}`);
        const response = await apiRequest("GET", `/api/resumes/${generatedResume.id}/download`);
        const data = await response.json();
        
        // Create and trigger download
        const blob = new Blob([data.content], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${data.title || 'resume'}_${new Date().toISOString().split('T')[0]}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        setMessages(prev => [...prev, {
          type: 'ai',
          content: "I've started the download for you. Is there anything else you'd like me to help you with?"
        }]);
      } catch (error) {
        console.error("Download error:", error);
        
        // Check if it's an authentication error
        if (error instanceof Error && error.message.includes('401')) {
          setMessages(prev => [...prev, {
            type: 'ai',
            content: "You need to log in or create an account to download your resume. This ensures your data is saved and secure. Would you like to create an account now?"
          }]);
          return;
        }
        
        toast({
          title: "Download Failed",
          description: error instanceof Error ? error.message : "Failed to download resume",
          variant: "destructive"
        });
        
        setMessages(prev => [...prev, {
          type: 'ai',
          content: "Sorry, I encountered an error while trying to download your resume. Please try again."
        }]);
      }
      return;
    }

    try {
      setIsGenerating(true);
      await generateResumeMutation.mutateAsync(userMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  const [, navigate] = useLocation();

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] p-4">
      <Card className="flex-1 flex flex-col">
        <CardContent className="flex-1 flex flex-col p-4 gap-4">
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-4">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-3 ${
                      message.type === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    {message.content}
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
          </ScrollArea>

          <div className="flex flex-col gap-2">
            <Input
              type="file"
              ref={fileInputRef}
              className="hidden"
              onChange={handleFileUpload}
              accept=".pdf,.doc,.docx,.txt"
            />

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                disabled={isGenerating}
              >
                <Upload className="h-4 w-4" />
              </Button>

              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your experience, skills, or questions..."
                className="flex-1"
                rows={1}
                disabled={isGenerating}
              />

              <Button
                size="icon"
                onClick={handleSubmit}
                disabled={isGenerating || !input.trim()}
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>

            {generatedResume && (
              <div className="mt-4 space-y-4">
                {/* Use the ResumePreview component for consistency with desktop experience */}
                <ResumePreview 
                  content={generatedResume.content}
                  analysis={{ enhancedContent: generatedResume.content }}
                  resumeId={generatedResume.id}
                  title={generatedResume.title}
                />
                
                {/* Button to save to dashboard */}
                {!user && (
                  <div className="flex justify-center mt-4">
                    <Button
                      onClick={() => navigate('/auth')}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Save className="mr-2 h-4 w-4" />
                      Sign Up to Save Resume
                    </Button>
                  </div>
                )}
                
                {/* Simple preview */}
                <div 
                  className="border rounded-lg p-4 bg-white"
                  dangerouslySetInnerHTML={{ __html: generatedResume.content }} 
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}