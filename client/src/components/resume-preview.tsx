import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
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
    <div className="space-y-8">
      {/* Main Resume Quality Score */}
      {atsScore !== undefined && atsScore !== null && (
        <Card>
          <CardContent className="p-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-semibold mb-2">Resume Quality Score</h2>
              <div className="text-7xl font-bold text-primary mb-4">{atsScore}</div>
              <Progress value={atsScore} className="h-3 w-full max-w-md mx-auto" />
            </div>

            {/* Category Breakdown */}
            <div className="space-y-4">
              {categoryScores?.atsCompliance && (
                <div className="flex items-center gap-4">
                  <span className="w-48 font-medium">ATS Compliance</span>
                  <div className="flex-1">
                    <Progress value={categoryScores.atsCompliance.score} className="h-2" />
                  </div>
                  <span className="w-16 text-right text-sm">({categoryScores.atsCompliance.score}%)</span>
                </div>
              )}

              {categoryScores?.keywordDensity && (
                <div className="flex items-center gap-4">
                  <span className="w-48 font-medium">Keyword Density</span>
                  <div className="flex-1">
                    <Progress value={categoryScores.keywordDensity.score} className="h-2" />
                  </div>
                  <span className="w-16 text-right text-sm">({categoryScores.keywordDensity.score}%)</span>
                </div>
              )}

              {categoryScores?.recruiterFriendliness && (
                <div className="flex items-center gap-4">
                  <span className="w-48 font-medium">Recruiter Friendliness</span>
                  <div className="flex-1">
                    <Progress value={categoryScores.recruiterFriendliness.score} className="h-2" />
                  </div>
                  <span className="w-16 text-right text-sm">({categoryScores.recruiterFriendliness.score}%)</span>
                </div>
              )}

              {categoryScores?.conciseness && (
                <div className="flex items-center gap-4">
                  <span className="w-48 font-medium">Conciseness & Impact</span>
                  <div className="flex-1">
                    <Progress value={categoryScores.conciseness.score} className="h-2" />
                  </div>
                  <span className="w-16 text-right text-sm">({categoryScores.conciseness.score}%)</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

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
  );
}