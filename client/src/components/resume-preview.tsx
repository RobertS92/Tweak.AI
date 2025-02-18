import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ResumePreviewProps {
  content: string;
  atsScore?: number | null;
  categoryScores?: {
    atsCompliance?: { score: number; feedback: string[]; description: string };
    keywordDensity?: { score: number; feedback: string[]; identifiedKeywords: string[]; description: string };
    roleAlignment?: { score: number; feedback: string[]; description: string };
    recruiterFriendliness?: { score: number; feedback: string[]; description: string };
    conciseness?: { score: number; feedback: string[]; description: string };
  };
  strengths?: string[];
  weaknesses?: string[];
  improvements?: string[];
  formattingFixes?: string[];
}

export default function ResumePreview({
  content,
  atsScore,
  categoryScores,
  strengths = [],
  weaknesses = [],
  improvements = [],
  formattingFixes = []
}: ResumePreviewProps) {
  const [showContent, setShowContent] = useState(false);

  return (
    <div className="space-y-4">
      {/* Resume Quality Score */}
      {atsScore !== undefined && atsScore !== null && (
        <Card>
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-2xl font-bold">Resume Quality Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center mb-8">
              <div className="text-6xl font-bold text-primary mb-4">
                {atsScore}
              </div>
              <Progress value={atsScore} className="w-full h-3" />
            </div>

            {/* Category Breakdown */}
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-gray-700 mb-4">Category Breakdown</h3>
              <div className="space-y-4">
                {categoryScores?.atsCompliance && (
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <span className="text-sm font-medium">ATS Compliance</span>
                    </div>
                    <div className="flex items-center gap-4 flex-1">
                      <Progress value={categoryScores.atsCompliance.score} className="h-2 flex-1" />
                      <span className="text-sm font-medium w-12 text-right">
                        {categoryScores.atsCompliance.score}%
                      </span>
                    </div>
                  </div>
                )}

                {categoryScores?.keywordDensity && (
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <span className="text-sm font-medium">Keyword Density</span>
                    </div>
                    <div className="flex items-center gap-4 flex-1">
                      <Progress value={categoryScores.keywordDensity.score} className="h-2 flex-1" />
                      <span className="text-sm font-medium w-12 text-right">
                        {categoryScores.keywordDensity.score}%
                      </span>
                    </div>
                  </div>
                )}

                {categoryScores?.recruiterFriendliness && (
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <span className="text-sm font-medium">Recruiter-Friendliness</span>
                    </div>
                    <div className="flex items-center gap-4 flex-1">
                      <Progress value={categoryScores.recruiterFriendliness.score} className="h-2 flex-1" />
                      <span className="text-sm font-medium w-12 text-right">
                        {categoryScores.recruiterFriendliness.score}%
                      </span>
                    </div>
                  </div>
                )}

                {categoryScores?.conciseness && (
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <span className="text-sm font-medium">Conciseness & Impact</span>
                    </div>
                    <div className="flex items-center gap-4 flex-1">
                      <Progress value={categoryScores.conciseness.score} className="h-2 flex-1" />
                      <span className="text-sm font-medium w-12 text-right">
                        {categoryScores.conciseness.score}%
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Enhanced Version Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-semibold">Enhanced Version</CardTitle>
          <p className="text-sm text-muted-foreground">AI-enhanced version of your resume</p>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={() => setShowContent(true)}
            className="w-full"
            size="lg"
          >
            <FileText className="mr-2 h-4 w-4" />
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