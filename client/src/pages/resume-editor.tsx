import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import ResumePreview from "@/components/resume-preview";
import JobMatcher from "@/components/job-matcher";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Download, ArrowLeft, Eye, Upload, Save } from "lucide-react";
import { Link } from "wouter";

interface Resume {
  id: number;
  title: string;
  content: string;
  atsScore: number | null;
  enhancedContent: string | null;
  analysis?: {
    categoryScores?: {
      atsCompliance: { score: number; feedback: string[]; description: string };
      keywordDensity: { score: number; feedback: string[]; description: string };
      roleAlignment: { score: number; feedback: string[]; description: string };
      recruiterFriendliness: { score: number; feedback: string[]; description: string };
      conciseness: { score: number; feedback: string[]; description: string };
    };
  };
}

export default function ResumeEditor() {
  const { id } = useParams();
  const { toast } = useToast();
  const resumeId = id ? parseInt(id) : undefined;
  const [showEnhanced, setShowEnhanced] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [resumeTitle, setResumeTitle] = useState("Untitled Resume");
  const [resumeContent, setResumeContent] = useState("");

  // Only fetch existing resume if ID is provided
  const { data: resume, isLoading } = useQuery<Resume>({
    queryKey: [`/api/resumes/${resumeId}`],
    enabled: !!resumeId,
    onSuccess: (data) => {
      if (data) {
        setResumeTitle(data.title);
        setResumeContent(data.content);
      }
    }
  });

  // Create new resume
  const createMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/resumes", {
        title: resumeTitle,
        content: resumeContent,
      }).then((r) => r.json());
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/resumes"] });
      toast({
        title: "Resume created",
        description: "Your resume has been saved and analyzed",
      });
      // Redirect to the new resume's edit page
      window.location.href = `/editor/${data.id}`;
    },
  });

  // Update existing resume
  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!resumeId) throw new Error("No resume ID provided");
      return apiRequest("PATCH", `/api/resumes/${resumeId}`, {
        title: resumeTitle,
        content: resumeContent,
      }).then((r) => r.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/resumes/${resumeId}`] });
      toast({
        title: "Resume updated",
        description: "Your changes have been saved",
      });
    },
  });

  const handleSave = () => {
    if (!resumeContent.trim()) {
      toast({
        title: "Error",
        description: "Please enter some resume content",
        variant: "destructive",
      });
      return;
    }

    if (resumeId) {
      updateMutation.mutate();
    } else {
      createMutation.mutate();
    }
  };

  const handleDownload = async () => {
    if (!resumeContent) {
      toast({
        title: "Error",
        description: "No resume content to download",
        variant: "destructive",
      });
      return;
    }

    setIsPrinting(true);
    try {
      const response = await fetch(`/api/resumes/download-pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: resumeContent }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${resumeTitle || 'resume'}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Download complete",
        description: "Your resume has been downloaded",
      });
    } catch (error) {
      toast({
        title: "Download failed",
        description: error instanceof Error ? error.message : "Failed to download",
        variant: "destructive",
      });
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Button>
            </Link>
            <Input
              value={resumeTitle}
              onChange={(e) => setResumeTitle(e.target.value)}
              className="max-w-xs"
              placeholder="Resume Title"
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={!resumeContent.trim()}>
              <Save className="mr-2 h-4 w-4" />
              {resumeId ? 'Save Changes' : 'Create Resume'}
            </Button>
            <Button
              onClick={handleDownload}
              disabled={isPrinting || !resumeContent}
              variant="outline"
            >
              <Download className="mr-2 h-4 w-4" />
              {isPrinting ? 'Preparing...' : 'Download PDF'}
            </Button>
          </div>
        </div>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Resume Content</CardTitle>
              <CardDescription>
                Enter or paste your resume content below
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={resumeContent}
                onChange={(e) => setResumeContent(e.target.value)}
                placeholder="Start typing or paste your resume here..."
                className="min-h-[400px] font-mono"
              />
            </CardContent>
          </Card>

          {resume?.atsScore !== undefined && (
            <Card>
              <CardHeader>
                <CardTitle>AI Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label>ATS Score</Label>
                      <span className="text-2xl font-bold">{resume.atsScore}%</span>
                    </div>
                    <Progress value={resume.atsScore || 0} className="h-2" />
                  </div>

                  {resume.analysis?.categoryScores && (
                    <div className="space-y-4">
                      {Object.entries(resume.analysis.categoryScores).map(([key, value]) => (
                        <div key={key}>
                          <div className="flex items-center justify-between mb-2">
                            <Label>{key.replace(/([A-Z])/g, ' $1').trim()}</Label>
                            <span>{value.score}%</span>
                          </div>
                          <Progress value={value.score} className="h-2" />
                          {value.feedback.length > 0 && (
                            <ul className="mt-2 text-sm text-muted-foreground">
                              {value.feedback.map((item, i) => (
                                <li key={i}>• {item}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {resumeId && resume?.enhancedContent && (
            <Card>
              <CardHeader>
                <CardTitle>Enhanced Version</CardTitle>
                <CardDescription>
                  AI-optimized version with improvements and formatting fixes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  className="w-full"
                  onClick={() => setShowEnhanced(true)}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  View Enhanced Resume
                </Button>
              </CardContent>
            </Card>
          )}

          {resumeId && <JobMatcher resumeId={resumeId} />}
        </div>

        <Dialog open={showEnhanced} onOpenChange={setShowEnhanced}>
          <DialogContent className="max-w-4xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>Enhanced Resume</DialogTitle>
              <DialogDescription>
                AI-optimized version with improvements applied
              </DialogDescription>
            </DialogHeader>
            {resume?.enhancedContent && (
              <ResumePreview
                content={resume.content}
                analysis={{ enhancedContent: resume.enhancedContent }}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}