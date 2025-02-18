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
    <div className="space-y-4">
      {/* Main Resume Quality Score */}
      {atsScore !== undefined && atsScore !== null && (
        <Card>
          <CardContent className="p-6">
            <div className="space-y-6">
              {/* Main Score */}
              <div className="text-center space-y-2">
                <h2 className="text-3xl font-bold">Resume Quality Score</h2>
                <div className="flex items-center justify-center gap-4">
                  <div className="text-5xl font-bold text-primary">
                    {atsScore}
                  </div>
                  <Badge variant={atsScore >= 80 ? "success" : "destructive"} className="text-lg">
                    {atsScore >= 80 ? "Excellent" : "Needs Improvement"}
                  </Badge>
                </div>
                <Progress value={atsScore} className="h-4" />
              </div>

              {/* Category Breakdown */}
              <div className="space-y-6 pt-4 border-t">
                <h3 className="font-semibold text-lg">Category Breakdown</h3>
                <div className="space-y-4">
                  {categoryScores?.atsCompliance && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold">ATS Compliance</h4>
                          <p className="text-sm text-muted-foreground">{categoryScores.atsCompliance.description}</p>
                        </div>
                        <Badge variant={categoryScores.atsCompliance.score >= 80 ? "success" : "destructive"}>
                          {categoryScores.atsCompliance.score}%
                        </Badge>
                      </div>
                      <Progress value={categoryScores.atsCompliance.score} className="h-2" />
                    </div>
                  )}

                  {categoryScores?.keywordDensity && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold">Keyword Density</h4>
                          <p className="text-sm text-muted-foreground">{categoryScores.keywordDensity.description}</p>
                        </div>
                        <Badge variant={categoryScores.keywordDensity.score >= 80 ? "success" : "destructive"}>
                          {categoryScores.keywordDensity.score}%
                        </Badge>
                      </div>
                      <Progress value={categoryScores.keywordDensity.score} className="h-2" />
                    </div>
                  )}

                  {categoryScores?.roleAlignment && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold">Role Alignment</h4>
                          <p className="text-sm text-muted-foreground">{categoryScores.roleAlignment.description}</p>
                        </div>
                        <Badge variant={categoryScores.roleAlignment.score >= 80 ? "success" : "destructive"}>
                          {categoryScores.roleAlignment.score}%
                        </Badge>
                      </div>
                      <Progress value={categoryScores.roleAlignment.score} className="h-2" />
                    </div>
                  )}

                  {categoryScores?.recruiterFriendliness && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold">Recruiter Friendliness</h4>
                          <p className="text-sm text-muted-foreground">{categoryScores.recruiterFriendliness.description}</p>
                        </div>
                        <Badge variant={categoryScores.recruiterFriendliness.score >= 80 ? "success" : "destructive"}>
                          {categoryScores.recruiterFriendliness.score}%
                        </Badge>
                      </div>
                      <Progress value={categoryScores.recruiterFriendliness.score} className="h-2" />
                    </div>
                  )}

                  {categoryScores?.conciseness && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold">Conciseness & Impact</h4>
                          <p className="text-sm text-muted-foreground">{categoryScores.conciseness.description}</p>
                        </div>
                        <Badge variant={categoryScores.conciseness.score >= 80 ? "success" : "destructive"}>
                          {categoryScores.conciseness.score}%
                        </Badge>
                      </div>
                      <Progress value={categoryScores.conciseness.score} className="h-2" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed Category Feedback */}
      {categoryScores && (
        <div className="grid md:grid-cols-2 gap-4">
          {Object.entries(categoryScores).map(([key, data]) => (
            <Card key={key}>
              <CardContent className="p-4">
                <h3 className="font-semibold capitalize mb-2">
                  {key.replace(/([A-Z])/g, ' $1').trim()} Details
                </h3>
                <ul className="list-disc list-inside space-y-1">
                  {data.feedback.map((item, i) => (
                    <li key={i} className="text-sm text-muted-foreground">
                      {item}
                    </li>
                  ))}
                </ul>
                {'identifiedKeywords' in data && data.identifiedKeywords && (
                  <div className="mt-4">
                    <p className="text-sm font-medium mb-1">Identified Keywords:</p>
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
        </div>
      )}

      {/* Strengths and Weaknesses */}
      <div className="grid md:grid-cols-2 gap-4">
        {strengths.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold mb-2">Strengths</h3>
              <ul className="list-disc list-inside space-y-1">
                {strengths.map((strength, i) => (
                  <li key={i} className="text-sm text-muted-foreground">
                    {strength}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {weaknesses.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold mb-2">Areas to Improve</h3>
              <ul className="list-disc list-inside space-y-1">
                {weaknesses.map((weakness, i) => (
                  <li key={i} className="text-sm text-muted-foreground">
                    {weakness}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Improvements and Formatting Fixes */}
      {improvements.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold mb-2">Suggested Improvements</h3>
            <ul className="list-disc list-inside space-y-1">
              {improvements.map((improvement, i) => (
                <li key={i} className="text-sm text-muted-foreground">
                  {improvement}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {formattingFixes.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold mb-2">Formatting Fixes</h3>
            <ul className="list-disc list-inside space-y-1">
              {formattingFixes.map((fix, i) => (
                <li key={i} className="text-sm text-muted-foreground">
                  {fix}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

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