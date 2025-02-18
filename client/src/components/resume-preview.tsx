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
    <div className="space-y-8">
      {/* Main Resume Quality Score */}
      {atsScore !== undefined && atsScore !== null && (
        <Card className="bg-background/50 backdrop-blur supports-[backdrop-filter]:bg-background/50">
          <CardContent className="pt-6">
            <div className="text-center">
              <h2 className="text-3xl font-semibold mb-2">Resume Quality Score</h2>
              <div className="text-7xl font-bold text-primary mb-6">{atsScore}</div>
              <Progress 
                value={atsScore} 
                className="h-3 w-full max-w-md mx-auto" 
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Category Scores */}
      <Card>
        <CardContent className="p-6">
          <div className="space-y-6">
            {/* ATS Compliance */}
            {categoryScores?.atsCompliance && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="font-medium">ATS Compliance</div>
                    <div className="text-sm text-muted-foreground">
                      {categoryScores.atsCompliance.description}
                    </div>
                  </div>
                  <span className="text-lg font-bold tabular-nums">
                    {categoryScores.atsCompliance.score}%
                  </span>
                </div>
                <Progress value={categoryScores.atsCompliance.score} className="h-2" />
              </div>
            )}

            {/* Keyword Density */}
            {categoryScores?.keywordDensity && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="font-medium">Keyword Density</div>
                    <div className="text-sm text-muted-foreground">
                      {categoryScores.keywordDensity.description}
                    </div>
                  </div>
                  <span className="text-lg font-bold tabular-nums">
                    {categoryScores.keywordDensity.score}%
                  </span>
                </div>
                <Progress value={categoryScores.keywordDensity.score} className="h-2" />
              </div>
            )}

            {/* Recruiter Friendliness */}
            {categoryScores?.recruiterFriendliness && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="font-medium">Recruiter Friendliness</div>
                    <div className="text-sm text-muted-foreground">
                      {categoryScores.recruiterFriendliness.description}
                    </div>
                  </div>
                  <span className="text-lg font-bold tabular-nums">
                    {categoryScores.recruiterFriendliness.score}%
                  </span>
                </div>
                <Progress value={categoryScores.recruiterFriendliness.score} className="h-2" />
              </div>
            )}

            {/* Conciseness & Impact */}
            {categoryScores?.conciseness && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="font-medium">Conciseness & Impact</div>
                    <div className="text-sm text-muted-foreground">
                      {categoryScores.conciseness.description}
                    </div>
                  </div>
                  <span className="text-lg font-bold tabular-nums">
                    {categoryScores.conciseness.score}%
                  </span>
                </div>
                <Progress value={categoryScores.conciseness.score} className="h-2" />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

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