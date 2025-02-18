import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
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
    categoryScores?: {
      atsCompliance: { score: number; feedback: string[]; description: string };
      keywordDensity: { score: number; feedback: string[]; identifiedKeywords: string[]; description: string };
      roleAlignment: { score: number; feedback: string[]; description: string };
      recruiterFriendliness: { score: number; feedback: string[]; description: string };
      conciseness: { score: number; feedback: string[]; description: string };
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
        {/* Header */}
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
            Download PDF
          </Button>
        </div>

        {/* Main Content */}
        <ResizablePanelGroup direction="horizontal" className="min-h-[800px] rounded-lg border">
          <ResizablePanel defaultSize={50}>
            <div className="h-full p-4 overflow-auto">
              <ResumePreview
                content={resume.content}
                atsScore={resume.atsScore}
                categoryScores={resume.analysis?.categoryScores}
                strengths={resume.analysis?.strengths}
                weaknesses={resume.analysis?.weaknesses}
                improvements={resume.analysis?.improvements}
                formattingFixes={resume.analysis?.formattingFixes}
              />
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          <ResizablePanel defaultSize={50}>
            <div className="h-full p-4 overflow-auto">
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-2xl font-semibold mb-4">Enhanced Version</h2>
                  <ResumePreview
                    content={resume.enhancedContent || resume.content}
                  />
                </CardContent>
              </Card>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>

        {/* Job Matcher Section */}
        <div className="mt-6">
          {resumeId && <JobMatcher resumeId={resumeId} />}
        </div>
      </div>
    </div>
  );
}