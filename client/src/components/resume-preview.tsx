import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

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

      {/* Category Breakdown Card */}
      <Card>
        <CardContent className="py-6">
          <h3 className="text-xl font-semibold mb-6">Category Breakdown</h3>
          <div className="space-y-6">
            {categoryScores?.atsCompliance && (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <h4 className="font-medium">ATS Compliance</h4>
                  <span className="font-bold">{categoryScores.atsCompliance.score}%</span>
                </div>
                <Progress value={categoryScores.atsCompliance.score} className="h-3" />
              </div>
            )}

            {categoryScores?.keywordDensity && (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <h4 className="font-medium">Keyword Density</h4>
                  <span className="font-bold">{categoryScores.keywordDensity.score}%</span>
                </div>
                <Progress value={categoryScores.keywordDensity.score} className="h-3" />
              </div>
            )}

            {categoryScores?.roleAlignment && (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <h4 className="font-medium">Role Alignment</h4>
                  <span className="font-bold">{categoryScores.roleAlignment.score}%</span>
                </div>
                <Progress value={categoryScores.roleAlignment.score} className="h-3" />
              </div>
            )}

            {categoryScores?.recruiterFriendliness && (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <h4 className="font-medium">Recruiter Friendliness</h4>
                  <span className="font-bold">{categoryScores.recruiterFriendliness.score}%</span>
                </div>
                <Progress value={categoryScores.recruiterFriendliness.score} className="h-3" />
              </div>
            )}

            {categoryScores?.conciseness && (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <h4 className="font-medium">Conciseness & Impact</h4>
                  <span className="font-bold">{categoryScores.conciseness.score}%</span>
                </div>
                <Progress value={categoryScores.conciseness.score} className="h-3" />
              </div>
            )}
          </div>
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