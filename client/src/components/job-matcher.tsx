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

  const downloadPdfMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/resumes/${resumeId}/download-pdf`, {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `optimized_resume_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },
    onSuccess: () => {
      toast({
        title: "Download Complete",
        description: "Your optimized resume has been downloaded",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Download Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const uploadJobDescriptionMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("jobDescription", file);

      const response = await fetch("/api/jobs/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to upload job description");
      }

      const data = await response.json();
      setJobDescription(data.content);
      return data;
    },
    onSuccess: () => {
      toast({
        title: "File uploaded",
        description: "Job description has been extracted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const matchMutation = useMutation({
    mutationFn: async () => {
      const jobResponse = await apiRequest("POST", "/api/jobs", {
        title: "Job Match",
        description: jobDescription,
      });

      if (!jobResponse.ok) {
        const error = await jobResponse.json();
        throw new Error(error.message || 'Failed to create job');
      }

      const job = await jobResponse.json();

      const matchResponse = await apiRequest(
        "POST",
        `/api/jobs/${job.id}/match/${resumeId}`
      );

      if (!matchResponse.ok) {
        const error = await matchResponse.json();
        throw new Error(error.message || 'Failed to analyze match');
      }

      return matchResponse.json();
    },
    onSuccess: (data: JobMatch) => {
      toast({
        title: "Match Analysis Complete",
        description: `Match score: ${data.matchScore}%`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Analysis failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const tweakResumeMutation = useMutation({
    mutationFn: async () => {
      const resumeResponse = await apiRequest("GET", `/api/resumes/${resumeId}`);
      if (!resumeResponse.ok) {
        throw new Error("Failed to fetch original resume");
      }
      const resume = await resumeResponse.json();
      setOriginalContent(resume.content);

      const response = await apiRequest("POST", `/api/resumes/${resumeId}/tweak`, {
        jobDescription,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to tweak resume');
      }

      const result = await response.json();
      setEnhancedContent(result.enhancedContent);
      return result;
    },
    onSuccess: () => {
      toast({
        title: "Resume Tweaked",
        description: "Your resume has been optimized for this job",
      });
      setShowEnhanced(true);
    },
    onError: (error: Error) => {
      toast({
        title: "Tweak failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const validTypes = [
        'application/pdf',
        'text/plain',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/png',
        'image/jpeg'
      ];

      if (!validTypes.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: "Please upload a PDF, Word, text file, or image (PNG/JPEG)",
          variant: "destructive",
        });
        return;
      }

      setUploadedFile(file);
      uploadJobDescriptionMutation.mutate(file);
    }
  };

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div>
          <h3 className="text-lg font-semibold mb-4">Job Description Matcher</h3>
          <div className="space-y-4">
            <div className="grid w-full max-w-sm items-center gap-1.5">
              <Label htmlFor="jobDescription">Upload Job Description</Label>
              <Input
                id="jobDescription"
                type="file"
                accept=".pdf,.txt,.doc,.docx,.png,.jpg,.jpeg"
                onChange={handleFileChange}
                className="cursor-pointer"
              />
              <p className="text-sm text-muted-foreground">
                Supported formats: PDF, Word, Text, PNG, JPEG
              </p>
            </div>

            <div className="relative">
              <Label htmlFor="description">Or paste job description</Label>
              <Textarea
                id="description"
                placeholder="Paste job description here..."
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                className="h-32 mt-1"
              />
            </div>
          </div>
        </div>

        <div className="flex space-x-4">
          <Button 
            onClick={() => matchMutation.mutate()}
            disabled={!jobDescription || matchMutation.isPending}
          >
            Analyze Match
          </Button>
        </div>

        {matchMutation.data && (
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <Progress value={matchMutation.data.matchScore} className="flex-1" />
              <Badge variant={matchMutation.data.matchScore >= 70 ? "success" : "destructive"}>
                {matchMutation.data.matchScore}% Match
              </Badge>
            </div>

            {matchMutation.data.matchScore >= 70 && (
              <Button
                variant="default"
                onClick={() => tweakResumeMutation.mutate()}
                disabled={tweakResumeMutation.isPending}
                className="w-full"
              >
                Tweak Resume for This Job
              </Button>
            )}

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
                    {showEnhanced && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadPdfMutation.mutate()}
                        disabled={downloadPdfMutation.isPending}
                        className="flex items-center gap-2"
                      >
                        <Download className="w-4 h-4" />
                        {downloadPdfMutation.isPending ? "Downloading..." : "Download PDF"}
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

            {matchMutation.data.missingKeywords?.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2">Missing Keywords</h4>
                <div className="flex flex-wrap gap-2">
                  {matchMutation.data.missingKeywords.map((keyword, i) => (
                    <Badge key={i} variant="outline">{keyword}</Badge>
                  ))}
                </div>
              </div>
            )}

            {matchMutation.data.suggestedEdits?.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2">Suggested Improvements</h4>
                <ul className="list-disc list-inside space-y-1">
                  {matchMutation.data.suggestedEdits.map((edit, i) => (
                    <li key={i} className="text-sm text-muted-foreground">{edit}</li>
                  ))}
                </ul>
              </div>
            )}

            {matchMutation.data.matchScore < 70 && matchMutation.data.suggestedRoles && (
              <div>
                <h4 className="text-sm font-semibold mb-2">Better Role Matches</h4>
                <div className="bg-muted p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-2">
                    Based on your skills and experience, these roles might be a better fit:
                  </p>
                  <ul className="list-disc list-inside space-y-1">
                    {matchMutation.data.suggestedRoles.map((role, i) => (
                      <li key={i} className="text-sm text-primary">{role}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}