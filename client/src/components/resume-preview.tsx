import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { FileText, Info, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ResumePreviewProps {
  content: string;
  atsScore?: number | null;
  categoryScores?: {
    atsCompliance?: { score: number; feedback: string[]; description: string };
    keywordDensity?: {
      score: number;
      feedback: string[];
      identifiedKeywords: string[];
      description: string;
    };
    recruiterFriendliness?: {
      score: number;
      feedback: string[];
      description: string;
    };
    conciseness?: { score: number; feedback: string[]; description: string };
  };
  analysis?: {
    improvements?: string[];
    formattingFixes?: string[];
    enhancedContent?: string;
  };
}

export default function ResumePreview({
  content,
  atsScore,
  categoryScores,
  analysis,
}: ResumePreviewProps) {
  const [showContent, setShowContent] = React.useState(false);
  const [isDownloading, setIsDownloading] = React.useState(false);
  const { toast } = useToast();

  const downloadEnhancedResume = async () => {
    if (!analysis?.enhancedContent) {
      toast({
        title: "Error",
        description: "No enhanced content available to download",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsDownloading(true);

      const response = await fetch("/api/resumes/download-pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: analysis.enhancedContent,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to generate PDF");
      }

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/pdf")) {
        throw new Error("Invalid response format");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `enhanced_resume_${new Date().toISOString().split('T')[0]}.pdf`;

      document.body.appendChild(a);
      a.click();

      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Success",
        description: "Your enhanced resume has been downloaded",
      });
    } catch (error) {
      console.error("Failed to download PDF:", error);
      toast({
        title: "Download failed",
        description: error instanceof Error ? error.message : "There was an error downloading your resume. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const calculateOverallScore = () => {
    if (!categoryScores) return atsScore || 0;

    const scores = Object.values(categoryScores)
      .map((category) => category?.score || 0)
      .filter((score) => score > 0);

    return scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 0;
  };

  const overallScore = calculateOverallScore();

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <Card className="bg-white shadow-lg">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-2xl font-bold text-gray-800">
            Resume Quality Score
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center mb-8">
            <div className="text-6xl font-bold text-primary mb-4">
              {overallScore}
            </div>
            <Progress value={overallScore} className="w-full h-3 bg-gray-200" />
          </div>

          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-gray-700 mb-4">
              Category Breakdown
            </h3>
            <div className="space-y-4">
              {categoryScores &&
                Object.entries(categoryScores).map(([key, category]) =>
                  category ? (
                    <div key={key} className="flex items-center justify-between">
                      <div className="flex-1">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-2 cursor-help">
                                <span className="text-sm font-medium text-gray-700">
                                  {key
                                    .replace(/([A-Z])/g, " $1")
                                    .replace(/^./, (str) => str.toUpperCase())}
                                </span>
                                <Info className="h-4 w-4 text-muted-foreground" />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs p-4">
                              <p className="font-medium mb-2">
                                {category.description}
                              </p>
                              <ul className="list-disc list-inside space-y-1">
                                {category.feedback.map((item, i) => (
                                  <li key={i} className="text-sm">
                                    {item}
                                  </li>
                                ))}
                              </ul>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <div className="flex items-center gap-4 flex-1">
                        <Progress
                          value={category.score}
                          className="h-2 flex-1"
                        />
                        <span className="text-sm font-medium text-gray-600 w-12">
                          {category.score}%
                        </span>
                      </div>
                    </div>
                  ) : null
                )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-gray-800">
            Enhanced Resume
          </CardTitle>
          <p className="text-sm text-gray-600">
            AI-optimized version with all improvements and formatting fixes applied
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm font-medium text-gray-700">
                  Content Improvements:
                </span>
              </div>
              <ul className="space-y-2 text-sm text-gray-600 ml-4">
                {analysis?.improvements?.map((improvement, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="font-medium">•</span>
                    <span>{improvement}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-sm font-medium text-gray-700">
                  Formatting Fixes:
                </span>
              </div>
              <ul className="space-y-2 text-sm text-gray-600 ml-4">
                {analysis?.formattingFixes?.map((fix, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="font-medium">•</span>
                    <span>{fix}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => setShowContent(true)}
              className="flex-1 py-3 flex items-center justify-center gap-2"
            >
              <FileText className="w-5 h-5" />
              View Enhanced Resume
            </Button>
            <Button
              onClick={downloadEnhancedResume}
              disabled={isDownloading || !analysis?.enhancedContent}
              className="py-3 flex items-center justify-center gap-2"
            >
              <Download className="w-5 h-5" />
              {isDownloading ? "Downloading..." : "Download PDF"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showContent} onOpenChange={setShowContent}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden p-6">
          <DialogHeader className="pb-4">
            <DialogTitle>Enhanced Resume</DialogTitle>
          </DialogHeader>

          <div className="h-[calc(90vh-8rem)] bg-white rounded-lg">
            <ScrollArea className="h-full">
              <div className="p-8">
                <div className="max-w-[850px] mx-auto">
                  {analysis?.enhancedContent ? (
                    <div
                      dangerouslySetInnerHTML={{
                        __html: analysis.enhancedContent,
                      }}
                      className="prose max-w-none"
                    />
                  ) : (
                    <div className="text-center text-muted-foreground py-8">
                      No enhanced content available yet.
                    </div>
                  )}
                </div>
              </div>
            </ScrollArea>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button
              onClick={downloadEnhancedResume}
              disabled={isDownloading || !analysis?.enhancedContent}
            >
              <Download className="w-4 h-4 mr-2" />
              {isDownloading ? "Downloading..." : "Download PDF"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const calculateOverallScore = () => {
  if (!categoryScores) return atsScore || 0;

  const scores = Object.values(categoryScores)
    .map((category) => category?.score || 0)
    .filter((score) => score > 0);

  return scores.length > 0
    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    : 0;
};