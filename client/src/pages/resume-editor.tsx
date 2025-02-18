import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import ResumePreview from "@/components/resume-preview";
import JobMatcher from "@/components/job-matcher";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Download, ArrowLeft, Eye } from "lucide-react";
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
      <div className="container mx-auto p-4 max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <Link href="/dashboard">
            <Button variant="ghost">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>
          <Button onClick={() => window.print()}>
            <Download className="mr-2 h-4 w-4" />
            Download
          </Button>
        </div>

        {/* Resume Quality Score and Analysis */}
        {resume.analysis?.categoryScores && (
          <ResumePreview 
            content={resume.content} 
            atsScore={resume.atsScore}
            categoryScores={resume.analysis.categoryScores}
            analysis={resume.analysis}
          />
        )}

        {/* Job Matcher Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-gray-800">Job Description Matcher</CardTitle>
          </CardHeader>
          <CardContent>
            {resumeId && <JobMatcher resumeId={resumeId} />}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}