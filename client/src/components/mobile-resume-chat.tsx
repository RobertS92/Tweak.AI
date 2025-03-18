import { useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Send, Upload, Download, Loader2 } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface Message {
  type: 'user' | 'ai';
  content: string;
}

export default function MobileResumeChat() {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([{
    type: 'ai',
    content: "Hello! I'm your AI resume assistant. You can either upload an existing resume for me to work with, or tell me about your experience, skills, and education. I'll help create a professional resume for you."
  }]);
  const [input, setInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedResume, setGeneratedResume] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const generateResumeMutation = useMutation({
    mutationFn: async (content: string) => {
      console.log("[DEBUG] Starting resume generation with content length:", content.length);
      
      const formattedContent = {
        content: content.trim(),
        format: 'conversational',
        type: 'generate'
      };
      
      console.log("[DEBUG] Formatted request payload:", formattedContent);

      try {
        const response = await apiRequest("POST", "/api/resumes/generate", formattedContent);
        console.log("[DEBUG] Resume generation response status:", response.status);
        
        const responseData = await response.json();
        console.log("[DEBUG] Resume generation response data:", responseData);

        if (!response.ok) {
          console.error("[DEBUG] Resume generation failed:", responseData);
          throw new Error(responseData.message || 'Failed to generate resume');
        }

        return responseData;
      } catch (error) {
        console.error("[DEBUG] Resume generation error:", error);
        throw error;
      }
    },
    onSuccess: (data) => {
      if (!data.content) {
        throw new Error("No resume content received");
      }

      setGeneratedResume(data.content);
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
      console.error("Resume generation error:", error);
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate resume. Please provide more detailed information about your experience.",
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

      const response = await fetch("/api/resumes/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to upload resume");
      }

      const data = await response.json();
      setMessages(prev => [...prev, 
        { type: 'user', content: `Uploaded resume: ${file.name}` },
        { type: 'ai', content: "I've received your resume. Would you like me to enhance it or create a new version based on it?" }
      ]);
    } catch (error) {
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
      // Handle download request
      const blob = new Blob([generatedResume], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `resume_${new Date().toISOString().split('T')[0]}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setMessages(prev => [...prev, {
        type: 'ai',
        content: "I've started the download for you. Is there anything else you'd like me to help you with?"
      }]);
      return;
    }

    try {
      setIsGenerating(true);
      await generateResumeMutation.mutateAsync(userMessage);
    } finally {
      setIsGenerating(false);
    }
  };

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
              <Button
                variant="outline"
                className="w-full"
                onClick={() => handleSubmit()}
              >
                <Download className="h-4 w-4 mr-2" />
                Download Resume
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}