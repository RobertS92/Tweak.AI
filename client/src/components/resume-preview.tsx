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
    keywordDensity?: { score: number; feedback: string[]; description: string };
    roleAlignment?: { score: number; feedback: string[]; description: string };
    recruiterFriendliness?: { score: number; feedback: string[]; description: string };
    conciseness?: { score: number; feedback: string[]; description: string };
  };
}

export default function ResumePreview({
  content,
  atsScore,
  categoryScores
}: ResumePreviewProps) {
  const [showContent, setShowContent] = React.useState(false);

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
              {atsScore}
            </div>
            <Progress value={atsScore || 0} className="w-full h-3 bg-gray-200" />
          </div>

          {/* Category Breakdown */}
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-gray-700 mb-4">Category Breakdown</h3>
            <div className="space-y-4">
              {categoryScores?.atsCompliance && (
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-2 cursor-help">
                            <span className="text-sm font-medium text-gray-700">ATS Compliance</span>
                            <Info className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs p-4">
                          <p className="font-medium mb-2">{categoryScores.atsCompliance.description}</p>
                          <ul className="list-disc list-inside space-y-1">
                            {categoryScores.atsCompliance.feedback.map((item, i) => (
                              <li key={i} className="text-sm">{item}</li>
                            ))}
                          </ul>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <div className="flex items-center gap-4 flex-1">
                    <Progress value={categoryScores.atsCompliance.score} className="h-2 flex-1" />
                    <span className="text-sm font-medium text-gray-600 w-12">
                      {categoryScores.atsCompliance.score}%
                    </span>
                  </div>
                </div>
              )}

              {categoryScores?.keywordDensity && (
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-2 cursor-help">
                            <span className="text-sm font-medium text-gray-700">Keyword Density</span>
                            <Info className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs p-4">
                          <p className="font-medium mb-2">{categoryScores.keywordDensity.description}</p>
                          <ul className="list-disc list-inside space-y-1">
                            {categoryScores.keywordDensity.feedback.map((item, i) => (
                              <li key={i} className="text-sm">{item}</li>
                            ))}
                          </ul>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <div className="flex items-center gap-4 flex-1">
                    <Progress value={categoryScores.keywordDensity.score} className="h-2 flex-1" />
                    <span className="text-sm font-medium text-gray-600 w-12">
                      {categoryScores.keywordDensity.score}%
                    </span>
                  </div>
                </div>
              )}

              {categoryScores?.recruiterFriendliness && (
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-2 cursor-help">
                            <span className="text-sm font-medium text-gray-700">Recruiter-Friendliness</span>
                            <Info className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs p-4">
                          <p className="font-medium mb-2">{categoryScores.recruiterFriendliness.description}</p>
                          <ul className="list-disc list-inside space-y-1">
                            {categoryScores.recruiterFriendliness.feedback.map((item, i) => (
                              <li key={i} className="text-sm">{item}</li>
                            ))}
                          </ul>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <div className="flex items-center gap-4 flex-1">
                    <Progress value={categoryScores.recruiterFriendliness.score} className="h-2 flex-1" />
                    <span className="text-sm font-medium text-gray-600 w-12">
                      {categoryScores.recruiterFriendliness.score}%
                    </span>
                  </div>
                </div>
              )}

              {categoryScores?.conciseness && (
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-2 cursor-help">
                            <span className="text-sm font-medium text-gray-700">Conciseness & Impact</span>
                            <Info className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs p-4">
                          <p className="font-medium mb-2">{categoryScores.conciseness.description}</p>
                          <ul className="list-disc list-inside space-y-1">
                            {categoryScores.conciseness.feedback.map((item, i) => (
                              <li key={i} className="text-sm">{item}</li>
                            ))}
                          </ul>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <div className="flex items-center gap-4 flex-1">
                    <Progress value={categoryScores.conciseness.score} className="h-2 flex-1" />
                    <span className="text-sm font-medium text-gray-600 w-12">
                      {categoryScores.conciseness.score}%
                    </span>
                  </div>
                </div>
              )}
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
        <CardContent>
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
              {content}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}