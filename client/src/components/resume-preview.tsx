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
      {/* Main Score Card */}
      {atsScore !== undefined && atsScore !== null && (
        <Card>
          <CardContent className="py-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2">Resume Quality Score</h2>
              <div className="text-6xl font-bold text-primary mb-4">{atsScore}</div>
              <Badge variant={atsScore >= 80 ? "success" : "destructive"} className="text-lg">
                {atsScore >= 80 ? "Excellent" : "Needs Improvement"}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Category Scores */}
      <Card>
        <CardContent className="py-6 space-y-6">
          {categoryScores?.atsCompliance && (
            <div className="flex items-center gap-4">
              <div className="w-48 font-medium">ATS Compliance</div>
              <div className="flex-1">
                <Progress value={categoryScores.atsCompliance.score} className="h-4" />
              </div>
              <div className="w-12 text-right font-bold">{categoryScores.atsCompliance.score}%</div>
            </div>
          )}

          {categoryScores?.keywordDensity && (
            <div className="flex items-center gap-4">
              <div className="w-48 font-medium">Keyword Density</div>
              <div className="flex-1">
                <Progress value={categoryScores.keywordDensity.score} className="h-4" />
              </div>
              <div className="w-12 text-right font-bold">{categoryScores.keywordDensity.score}%</div>
            </div>
          )}

          {categoryScores?.recruiterFriendliness && (
            <div className="flex items-center gap-4">
              <div className="w-48 font-medium">Recruiter Friendliness</div>
              <div className="flex-1">
                <Progress value={categoryScores.recruiterFriendliness.score} className="h-4" />
              </div>
              <div className="w-12 text-right font-bold">{categoryScores.recruiterFriendliness.score}%</div>
            </div>
          )}

          {categoryScores?.conciseness && (
            <div className="flex items-center gap-4">
              <div className="w-48 font-medium">Conciseness & Impact</div>
              <div className="flex-1">
                <Progress value={categoryScores.conciseness.score} className="h-4" />
              </div>
              <div className="w-12 text-right font-bold">{categoryScores.conciseness.score}%</div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detailed Feedback Sections */}
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

        {/* Category Details */}
        {categoryScores && Object.entries(categoryScores).map(([key, data]) => (
          <Card key={key}>
            <CardContent className="p-4">
              <h3 className="font-semibold mb-2">{key.replace(/([A-Z])/g, ' $1').trim()} Details</h3>
              <p className="text-sm text-muted-foreground mb-2">{data.description}</p>
              <ul className="list-disc list-inside space-y-1">
                {data.feedback.map((item, i) => (
                  <li key={i} className="text-sm text-muted-foreground">{item}</li>
                ))}
              </ul>
              {'identifiedKeywords' in data && data.identifiedKeywords && (
                <div className="mt-4">
                  <p className="text-sm font-medium mb-2">Identified Keywords:</p>
                  <div className="flex flex-wrap gap-1">
                    {data.identifiedKeywords.map((keyword, i) => (
                      <Badge key={i} variant="secondary">{keyword}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}

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