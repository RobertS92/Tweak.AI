import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from "@/components/ui/button";
import { FileText, Info } from "lucide-react";
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
    keywordDensity?: { score: number; feedback: string[]; identifiedKeywords: string[]; description: string };
    recruiterFriendliness?: { score: number; feedback: string[]; description: string };
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
  analysis
}: ResumePreviewProps) {
  const [showContent, setShowContent] = React.useState(false);

  const calculateOverallScore = () => {
    if (!categoryScores) return atsScore || 0;

    const scores = Object.values(categoryScores)
      .map(category => category?.score || 0)
      .filter(score => score > 0);

    return scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 0;
  };

  const overallScore = calculateOverallScore();

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <Card className="bg-white shadow-lg">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-2xl font-bold text-gray-800">Resume Quality Score</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Main Score Display */}
          <div className="flex flex-col items-center mb-8">
            <div className="text-6xl font-bold text-primary mb-4">
              {overallScore}
            </div>
            <Progress value={overallScore} className="w-full h-3 bg-gray-200" />
          </div>

          {/* Category Breakdown */}
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-gray-700 mb-4">Category Breakdown</h3>
            <div className="space-y-4">
              {categoryScores && Object.entries(categoryScores).map(([key, category]) => (
                category && (
                  <div key={key} className="flex items-center justify-between">
                    <div className="flex-1">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-2 cursor-help">
                              <span className="text-sm font-medium text-gray-700">
                                {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                              </span>
                              <Info className="h-4 w-4 text-muted-foreground" />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs p-4">
                            <p className="font-medium mb-2">{category.description}</p>
                            <ul className="list-disc list-inside space-y-1">
                              {category.feedback.map((item, i) => (
                                <li key={i} className="text-sm">{item}</li>
                              ))}
                            </ul>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <div className="flex items-center gap-4 flex-1">
                      <Progress value={category.score} className="h-2 flex-1" />
                      <span className="text-sm font-medium text-gray-600 w-12">
                        {category.score}%
                      </span>
                    </div>
                  </div>
                )
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Version Section */}
      <Card className="bg-white shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-gray-800">Enhanced Version</CardTitle>
          <p className="text-sm text-gray-600">AI-enhanced version of your resume</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {analysis && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm font-medium text-gray-700">Content Improvements:</span>
                </div>
                <ul className="space-y-2 text-sm text-gray-600 ml-4">
                  {analysis.improvements?.map((improvement, i) => (
                    <li key={i}>• {improvement}</li>
                  ))}
                </ul>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-sm font-medium text-gray-700">Formatting Fixes:</span>
                </div>
                <ul className="space-y-2 text-sm text-gray-600 ml-4">
                  {analysis.formattingFixes?.map((fix, i) => (
                    <li key={i}>• {fix}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          <Button 
            onClick={() => setShowContent(true)} 
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
          >
            <FileText className="w-5 h-5" />
            View Enhanced Resume
          </Button>
        </CardContent>
      </Card>

      {/* Enhanced Resume Dialog */}
      <Dialog open={showContent} onOpenChange={setShowContent}>
        <DialogContent className="max-w-3xl h-[80vh]">
          <DialogHeader>
            <DialogTitle>Enhanced Resume Preview</DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1">
            <div className="whitespace-pre-wrap font-mono text-sm p-4">
              {analysis?.enhancedContent || content}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}