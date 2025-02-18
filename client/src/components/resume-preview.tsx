import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

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
  return (
    <div className="space-y-6">
      {/* Main Resume Quality Score */}
      {atsScore !== undefined && atsScore !== null && (
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2">Resume Quality Score</h2>
              <div className="text-6xl font-bold text-primary mb-4">{atsScore}</div>
              <Progress value={atsScore} className="h-4" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Category Scores */}
      <Card>
        <CardContent className="py-6">
          <div className="space-y-4">
            {categoryScores?.atsCompliance && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">ATS Compliance</span>
                  <span className="font-bold">{categoryScores.atsCompliance.score}%</span>
                </div>
                <Progress value={categoryScores.atsCompliance.score} className="h-3" />
              </div>
            )}

            {categoryScores?.keywordDensity && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">Keyword Density</span>
                  <span className="font-bold">{categoryScores.keywordDensity.score}%</span>
                </div>
                <Progress value={categoryScores.keywordDensity.score} className="h-3" />
              </div>
            )}

            {categoryScores?.recruiterFriendliness && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">Recruiter Friendliness</span>
                  <span className="font-bold">{categoryScores.recruiterFriendliness.score}%</span>
                </div>
                <Progress value={categoryScores.recruiterFriendliness.score} className="h-3" />
              </div>
            )}

            {categoryScores?.conciseness && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">Conciseness & Impact</span>
                  <span className="font-bold">{categoryScores.conciseness.score}%</span>
                </div>
                <Progress value={categoryScores.conciseness.score} className="h-3" />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Detailed Analysis */}
      <div className="space-y-4">
        {/* Strengths and Weaknesses */}
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

        {/* Resume Content */}
        <Card>
          <CardContent className="p-4">
            <ScrollArea className="h-[400px]">
              <div className="whitespace-pre-wrap font-mono text-sm">
                {content}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}