import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
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
          <CardContent className="p-6 text-center">
            <div className="text-7xl font-bold text-primary mb-4">{atsScore}</div>
            <Progress value={atsScore} className="h-3 mb-2" />
          </CardContent>
        </Card>
      )}

      {/* Category Breakdown */}
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            {categoryScores?.atsCompliance && (
              <div className="flex items-center gap-4">
                <div className="font-medium">ATS Compliance</div>
                <div className="flex-1">
                  <Progress value={categoryScores.atsCompliance.score} className="h-3" />
                </div>
                <div className="text-right font-bold">{categoryScores.atsCompliance.score}%</div>
              </div>
            )}

            {categoryScores?.keywordDensity && (
              <div className="flex items-center gap-4">
                <div className="font-medium">Keyword Density</div>
                <div className="flex-1">
                  <Progress value={categoryScores.keywordDensity.score} className="h-3" />
                </div>
                <div className="text-right font-bold">{categoryScores.keywordDensity.score}%</div>
              </div>
            )}

            {categoryScores?.recruiterFriendliness && (
              <div className="flex items-center gap-4">
                <div className="font-medium">Recruiter Friendly</div>
                <div className="flex-1">
                  <Progress value={categoryScores.recruiterFriendliness.score} className="h-3" />
                </div>
                <div className="text-right font-bold">{categoryScores.recruiterFriendliness.score}%</div>
              </div>
            )}

            {categoryScores?.conciseness && (
              <div className="flex items-center gap-4">
                <div className="font-medium">Conciseness</div>
                <div className="flex-1">
                  <Progress value={categoryScores.conciseness.score} className="h-3" />
                </div>
                <div className="text-right font-bold">{categoryScores.conciseness.score}%</div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* View Enhanced Resume Button */}
      <Button 
        onClick={() => setShowContent(true)}
        className="w-full"
        size="lg"
      >
        <FileText className="mr-2 h-4 w-4" />
        View Enhanced Resume
      </Button>

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