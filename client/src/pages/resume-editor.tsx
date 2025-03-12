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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Download, ArrowLeft, Eye, Upload } from "lucide-react";
import { Link } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Resume {
  id: number;
  title: string;
  content: string;
  atsScore: number | null;
  enhancedContent: string | null;
  analysis?: {
    categoryScores?: {
      atsCompliance: { score: number; feedback: string[]; description: string };
      keywordDensity: {
        score: number;
        feedback: string[];
        identifiedKeywords: string[];
        description: string;
      };
      roleAlignment: { score: number; feedback: string[]; description: string };
      recruiterFriendliness: {
        score: number;
        feedback: string[];
        description: string;
      };
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
  const [showEnhanced, setShowEnhanced] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

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

  const handleDownload = async () => {
    setIsPrinting(true);
    try {
      const response = await fetch(`/api/resumes/${resumeId}/download-pdf`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }

      // Create blob from response and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${resume?.title || 'resume'}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Download complete",
        description: "Your enhanced resume has been downloaded",
      });
    } catch (error) {
      toast({
        title: "Download failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsPrinting(false);
    }
  };

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

  const categoryScores = resume.analysis?.categoryScores || {
    atsCompliance: { score: 0, feedback: [], description: "" },
    keywordDensity: { score: 0, feedback: [], description: "" },
    recruiterFriendliness: { score: 0, feedback: [], description: "" },
    conciseness: { score: 0, feedback: [], description: "" },
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 max-w-4xl">
        <h1 className="text-3xl font-bold text-center mb-6">
          {resume?.title || "Resume"}
        </h1>

        <div className="flex items-center justify-between mb-6">
          <Link href="/dashboard">
            <Button variant="ghost">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>
          <div className="flex gap-2">
            <Link href="/upload">
              <Button variant="outline">
                <Upload className="mr-2 h-4 w-4" />
                Upload Another Resume
              </Button>
            </Link>
            <Button
              onClick={handleDownload}
              disabled={isPrinting}
            >
              <Download className="mr-2 h-4 w-4" />
              {isPrinting ? 'Preparing...' : 'Download Enhanced Resume'}
            </Button>
          </div>
        </div>

        <Card className="mb-6">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-2xl font-bold text-gray-800">
              Resume Quality Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center mb-8">
              <div className="text-6xl font-bold text-blue-600 mb-4">
                {resume.atsScore || 0}
              </div>
              <Progress
                value={resume.atsScore || 0}
                className="w-full h-3 bg-gray-200"
              />
            </div>

            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-gray-700 mb-4">
                Category Breakdown
              </h3>
              <div className="space-y-4">
                <CategoryScore
                  name="ATS Compliance"
                  score={categoryScores.atsCompliance.score}
                  color="bg-blue-600"
                />
                <CategoryScore
                  name="Keyword Density"
                  score={categoryScores.keywordDensity.score}
                  color="bg-blue-600"
                />
                <CategoryScore
                  name="Recruiter-Friendliness"
                  score={categoryScores.recruiterFriendliness.score}
                  color="bg-blue-600"
                />
                <CategoryScore
                  name="Conciseness & Impact"
                  score={categoryScores.conciseness.score}
                  color="bg-blue-600"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-gray-800">
              Enhanced Version
            </CardTitle>
            <CardDescription>
              AI-enhanced version of your resume
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm font-medium text-gray-700">
                  Improvements Made:
                </span>
              </div>
              <ul className="space-y-2 text-sm text-gray-600 ml-4">
                {resume.analysis?.improvements?.map((improvement, index) => (
                  <li key={index}>• {improvement}</li>
                ))}
              </ul>
            </div>

            <Button
              className="w-full py-6"
              onClick={() => setShowEnhanced(true)}
            >
              <Eye className="mr-2 h-4 w-4" />
              View Enhanced Resume
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-gray-800">
              Job Description Matcher
            </CardTitle>
          </CardHeader>
          <CardContent>
            {resumeId && <JobMatcher resumeId={resumeId} />}
          </CardContent>
        </Card>

        <Dialog open={showEnhanced} onOpenChange={setShowEnhanced}>
          <DialogContent className="max-w-4xl max-h-[90vh] p-6">
            <DialogHeader className="pb-4">
              <DialogTitle>Enhanced Resume</DialogTitle>
              <DialogDescription>
                AI-optimized version with all improvements and formatting fixes
                applied
              </DialogDescription>
            </DialogHeader>

            <div className="h-[calc(90vh-8rem)]">
              <Tabs defaultValue="enhanced" className="h-full flex flex-col">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="original">Original Resume</TabsTrigger>
                  <TabsTrigger value="enhanced">Enhanced Version</TabsTrigger>
                </TabsList>

                <div className="flex-1 mt-4 relative">
                  <TabsContent
                    value="original"
                    className="absolute inset-0 h-full"
                  >
                    <ScrollArea className="h-full border rounded-lg">
                      <div className="p-6">
                        <pre className="whitespace-pre-wrap font-sans text-sm">
                          {resume.content}
                        </pre>
                      </div>
                    </ScrollArea>
                  </TabsContent>
                  <TabsContent
                    value="enhanced"
                    className="absolute inset-0 h-full"
                  >
                    <ScrollArea className="h-full border rounded-lg">
                      <div className="p-6">
                        <div
                          dangerouslySetInnerHTML={{
                            __html: resume.enhancedContent || "",
                          }}
                          className="prose max-w-none 
                            [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mb-3 [&_h2]:text-gray-900
                            [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mb-1 [&_h3]:text-gray-800
                            [&_p]:mb-2 [&_p]:text-gray-700
                            [&_ul]:list-disc [&_ul]:pl-4 [&_ul]:mb-4
                            [&_li]:mb-2 [&_li]:text-gray-700
                            [&_.job]:mb-6
                            [&_.job-title]:text-gray-600 [&_.job-title]:mb-2
                            [&_.section]:mb-8"
                        />
                      </div>
                    </ScrollArea>
                  </TabsContent>
                </div>
              </Tabs>
            </div>

            <div className="absolute bottom-4 right-4">
              <Button onClick={() => window.print()} size="sm">
                <Download className="w-4 h-4 mr-2" />
                Download Enhanced Resume
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

interface CategoryScoreProps {
  name: string;
  score: number;
  color?: string;
}

const CategoryScore = ({
  name,
  score,
  color = "bg-blue-600",
}: CategoryScoreProps) => (
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