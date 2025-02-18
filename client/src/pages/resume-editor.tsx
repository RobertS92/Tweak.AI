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

        {/* Resume Quality Score Card */}
        <Card className="mb-6">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-2xl font-bold text-gray-800">Resume Quality Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center mb-8">
              <div className="text-6xl font-bold text-blue-600 mb-4">
                {resume.atsScore || 0}
              </div>
              <Progress value={resume.atsScore || 0} className="w-full h-3 bg-gray-200" />
            </div>

            {/* Category Breakdown */}
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-gray-700 mb-4">Category Breakdown</h3>
              <div className="space-y-4">
                {/* Display fixed category scores */}
                <CategoryScore
                  name="ATS Compliance"
                  score={80}
                  color="bg-blue-600"
                />
                <CategoryScore
                  name="Keyword Density"
                  score={60}
                  color="bg-blue-600"
                />
                <CategoryScore
                  name="Recruiter-Friendliness"
                  score={75}
                  color="bg-blue-600"
                />
                <CategoryScore
                  name="Conciseness & Impact"
                  score={90}
                  color="bg-blue-600"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Enhanced Version Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-gray-800">Enhanced Version</CardTitle>
            <CardDescription>AI-enhanced version of your resume</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm font-medium text-gray-700">Improvements Made:</span>
              </div>
              <ul className="space-y-2 text-sm text-gray-600 ml-4">
                {resume.analysis?.improvements?.map((improvement, index) => (
                  <li key={index}>• {improvement}</li>
                ))}
              </ul>
            </div>

            <Button 
              className="w-full py-6"
              onClick={() => window.print()}
            >
              <Eye className="mr-2 h-4 w-4" />
              View Enhanced Resume
            </Button>
          </CardContent>
        </Card>

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

interface CategoryScoreProps {
  name: string;
  score: number;
  color?: string;
}

const CategoryScore = ({ name, score, color = "bg-blue-600" }: CategoryScoreProps) => (
  <div className="flex items-center justify-between">
    <div className="flex-1">
      <span className="text-sm font-medium text-gray-700">{name}</span>
    </div>
    <div className="flex items-center gap-4 flex-1">
      <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
        <div 
          className={`h-full ${color} transition-all duration-500`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className="text-sm font-medium text-gray-600 w-16 text-right">
        {score}%
      </span>
    </div>
  </div>
);