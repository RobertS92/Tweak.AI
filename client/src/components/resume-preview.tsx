import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
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
    <div className="space-y-6">
      {/* Main Score Card */}
      {atsScore !== undefined && atsScore !== null && (
        <Card className="bg-gradient-to-br from-background to-muted">
          <CardContent className="py-8">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-4">Resume Quality Score</h2>
              <div className="text-7xl font-bold text-primary mb-6">{atsScore}</div>
              <Progress value={atsScore} className="h-4 mb-2" />
              <Badge variant={atsScore >= 80 ? "success" : "destructive"} className="text-lg">
                {atsScore >= 80 ? "Excellent" : "Needs Improvement"}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Category Breakdown */}
      <Card>
        <CardContent className="py-6">
          <h3 className="text-xl font-semibold mb-6">Category Breakdown</h3>
          <div className="space-y-6">
            {categoryScores?.atsCompliance && (
              <div className="flex items-center gap-4">
                <div className="w-48 font-medium">ATS Compliance</div>
                <div className="flex-1">
                  <Progress value={categoryScores.atsCompliance.score} className="h-3" />
                </div>
                <div className="w-16 text-right font-bold">{categoryScores.atsCompliance.score}%</div>
              </div>
            )}

            {categoryScores?.keywordDensity && (
              <div className="flex items-center gap-4">
                <div className="w-48 font-medium">Keyword Density</div>
                <div className="flex-1">
                  <Progress value={categoryScores.keywordDensity.score} className="h-3" />
                </div>
                <div className="w-16 text-right font-bold">{categoryScores.keywordDensity.score}%</div>
              </div>
            )}

            {categoryScores?.recruiterFriendliness && (
              <div className="flex items-center gap-4">
                <div className="w-48 font-medium">Recruiter Friendliness</div>
                <div className="flex-1">
                  <Progress value={categoryScores.recruiterFriendliness.score} className="h-3" />
                </div>
                <div className="w-16 text-right font-bold">{categoryScores.recruiterFriendliness.score}%</div>
              </div>
            )}

            {categoryScores?.conciseness && (
              <div className="flex items-center gap-4">
                <div className="w-48 font-medium">Conciseness & Impact</div>
                <div className="flex-1">
                  <Progress value={categoryScores.conciseness.score} className="h-3" />
                </div>
                <div className="w-16 text-right font-bold">{categoryScores.conciseness.score}%</div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Resume Preview Button & Dialog */}
      <Card>
        <CardContent className="py-6">
          <div className="text-center">
            <Button 
              onClick={() => setShowContent(true)}
              className="w-full"
              size="lg"
            >
              <FileText className="mr-2 h-4 w-4" />
              View Enhanced Resume
            </Button>
          </div>
        </CardContent>
      </Card>

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

      {/* Detailed Feedback Sections */}
      <div className="space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          {strengths.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-2">Strengths</h3>
                <ul className="list-disc list-inside space-y-1">
                  {strengths.map((strength, i) => (
                    <li key={i} className="text-sm text-muted-foreground">{strength}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {weaknesses.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-2">Areas to Improve</h3>
                <ul className="list-disc list-inside space-y-1">
                  {weaknesses.map((weakness, i) => (
                    <li key={i} className="text-sm text-muted-foreground">{weakness}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}