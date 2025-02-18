import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import ResumePreview from "@/components/resume-preview";
import JobMatcher from "@/components/job-matcher";
import { Button } from "@/components/ui/button";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Download, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

interface Resume {
  id: number;
  title: string;
  content: string;
  atsScore: number | null;
  enhancedContent: string | null;
  analysis?: {
    criteria?: {
      atsCompliance: { score: number; feedback: string[] };
      keywordDensity: { score: number; feedback: string[]; identifiedKeywords: string[] };
      roleAlignment: { score: number; feedback: string[] };
      recruiterFriendliness: { score: number; feedback: string[] };
      conciseness: { score: number; feedback: string[] };
    };
    strengths?: string[];
    weaknesses?: string[];
    improvements?: string[];
    formattingFixes?: string[];
  };
}

export default function ResumeEditor() {
  const { id } = useParams();
  const { toast } = useToast();
  const resumeId = id ? parseInt(id) : undefined;

  const { data: resume, isLoading } = useQuery<Resume>({
    queryKey: [`/api/resumes/${resumeId}`],
    enabled: !!resumeId,
  });

  const updateMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!resumeId) throw new Error("No resume ID provided");
      return apiRequest("PATCH", `/api/resumes/${resumeId}`, {
        content,
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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-lg text-muted-foreground">
          Loading resume...
        </div>
      </div>
    );
  }

  if (!resume) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardContent className="p-6">
            <p className="text-lg text-muted-foreground">Resume not found</p>
            <Link href="/">
              <Button className="mt-4">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Return Home
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <Link href="/dashboard">
              <Button variant="ghost" className="mb-2">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Button>
            </Link>
            <h1 className="text-3xl font-bold">{resume.title}</h1>
          </div>
          <Button onClick={() => window.print()}>
            <Download className="mr-2 h-4 w-4" />
            Download
          </Button>
        </div>

        <ResizablePanelGroup className="min-h-[600px] rounded-lg border">
          <ResizablePanel defaultSize={50}>
            <div className="h-full p-4">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle>Original Resume</CardTitle>
                  <CardDescription>
                    Your uploaded resume with analysis
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResumePreview
                    content={resume.content}
                    atsScore={resume.atsScore}
                    criteria={resume.analysis?.criteria}
                    strengths={resume.analysis?.strengths}
                    weaknesses={resume.analysis?.weaknesses}
                    improvements={resume.analysis?.improvements}
                    formattingFixes={resume.analysis?.formattingFixes}
                  />
                </CardContent>
              </Card>
            </div>
          </ResizablePanel>

          <ResizableHandle />

          <ResizablePanel defaultSize={50}>
            <div className="h-full p-4">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle>Enhanced Version</CardTitle>
                  <CardDescription>
                    AI-optimized version of your resume
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResumePreview
                    content={resume.enhancedContent || resume.content}
                  />
                </CardContent>
              </Card>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>

        <div className="mt-6">
          {resumeId && <JobMatcher resumeId={resumeId} />}
        </div>
      </div>
    </div>
  );
}