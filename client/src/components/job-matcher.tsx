import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Upload, FileText, ArrowLeftRight, Download } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

interface JobMatcherProps {
  resumeId: number;
}

interface JobMatch {
  matchScore: number;
  missingKeywords: string[];
  suggestedEdits: string[];
  suggestedRoles?: string[];
}

export default function JobMatcher({ resumeId }: JobMatcherProps) {
  const { toast } = useToast();
  const [jobDescription, setJobDescription] = useState("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [showEnhanced, setShowEnhanced] = useState(false);
  const [originalContent, setOriginalContent] = useState("");
  const [enhancedContent, setEnhancedContent] = useState("");

  const tweakResumeMutation = useMutation({
    mutationFn: async () => {
      if (!jobDescription.trim()) {
        throw new Error("Please provide a job description");
      }

      // First get the original resume content
      const resumeResponse = await apiRequest("GET", `/api/resumes/${resumeId}`);
      if (!resumeResponse.ok) {
        throw new Error("Failed to fetch original resume");
      }
      const resume = await resumeResponse.json();
      setOriginalContent(resume.content);

      // Then optimize it
      const response = await apiRequest("POST", `/api/resumes/${resumeId}/tweak`, {
        jobDescription: jobDescription.trim()
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to tweak resume');
      }

      const result = await response.json();
      console.log("Received optimization result:", result);

      if (!result.enhancedContent && !result.optimizedContent) {
        throw new Error("No optimized content received from the server");
      }

      // Store the enhanced content from the correct field
      const optimizedContent = result.optimizedContent || result.enhancedContent;
      setEnhancedContent(optimizedContent);
      return result;
    },
    onSuccess: () => {
      toast({
        title: "Resume Optimized",
        description: "Your resume has been optimized for this job",
      });
      setShowEnhanced(true);
    },
    onError: (error: Error) => {
      console.error("Tweak error:", error);
      toast({
        title: "Optimization Failed",
        description: error.message || "Failed to optimize resume. Please try again.",
        variant: "destructive"
      });
    }
  });

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        const text = await file.text();
        setJobDescription(text);
        setUploadedFile(file);
        toast({
          title: "File Uploaded",
          description: "Job description has been loaded successfully",
        });
      } catch (error) {
        toast({
          title: "Upload Failed",
          description: "Failed to read the file content. Please try copying and pasting the text instead.",
          variant: "destructive"
        });
      }
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setJobDescription(e.target.value);
    // Reset file input if user starts typing
    if (uploadedFile) {
      setUploadedFile(null);
    }
  };
  
  const downloadOptimizedPDF = async () => {
    if (!enhancedContent || !jobDescription) {
      toast({
        title: "No Optimized Content",
        description: "Please optimize your resume first",
        variant: "destructive"
      });
      return;
    }
    
    try {
      toast({
        title: "Generating PDF",
        description: "Please wait while we prepare your optimized resume...",
      });
      
      // Call the new endpoint for job-matched PDF generation
      const response = await fetch(`/api/resumes/${resumeId}/job-match-pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ jobDescription }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to generate PDF');
      }
      
      // Get the PDF blob
      const pdfBlob = await response.blob();
      
      // Create a download link
      const downloadUrl = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `optimized_resume_${resumeId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);
      
      toast({
        title: "PDF Downloaded",
        description: "Your optimized resume has been downloaded",
      });
    } catch (error) {
      console.error('PDF download error:', error);
      toast({
        title: "Download Failed",
        description: error instanceof Error ? error.message : "Failed to download PDF. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div>
          <h3 className="text-lg font-semibold mb-4">Resume Optimizer</h3>
          <div className="space-y-4">
            <div className="grid w-full max-w-sm items-center gap-1.5">
              <Label htmlFor="jobDescription">Upload Job Description</Label>
              <Input
                id="jobDescription"
                type="file"
                accept=".txt,.doc,.docx,.pdf"
                onChange={handleFileChange}
                className="cursor-pointer"
              />
              <p className="text-sm text-muted-foreground">
                Supported formats: TXT, DOC, DOCX, PDF
              </p>
            </div>

            <div className="relative">
              <Label htmlFor="description">Or paste job description</Label>
              <Textarea
                id="description"
                placeholder="Paste job description here..."
                value={jobDescription}
                onChange={handleTextChange}
                className="h-32 mt-1"
              />
            </div>

            <Button
              onClick={() => tweakResumeMutation.mutate()}
              disabled={!jobDescription.trim() || tweakResumeMutation.isPending}
              className="w-full"
            >
              {tweakResumeMutation.isPending ? "Optimizing..." : "Optimize Resume for This Job"}
            </Button>
          </div>
        </div>

        {(originalContent || enhancedContent) && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-semibold">
                {showEnhanced ? "Enhanced Resume" : "Original Resume"}
              </h4>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowEnhanced(!showEnhanced)}
                  className="flex items-center gap-2"
                >
                  <ArrowLeftRight className="w-4 h-4" />
                  Toggle Version
                </Button>
                {enhancedContent && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadOptimizedPDF()}
                    className="flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download PDF
                  </Button>
                )}
              </div>
            </div>
            <Card className="bg-muted/50">
              <ScrollArea className="h-[400px]">
                <div className="p-6 whitespace-pre-wrap font-mono text-sm">
                  <div 
                    className="prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ 
                      __html: showEnhanced ? enhancedContent : originalContent 
                    }} 
                  />
                </div>
              </ScrollArea>
            </Card>
          </div>
        )}
      </CardContent>
    </Card>
  );
}