import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface ResumePreviewProps {
  content: string;
  atsScore?: number | null;
  criteria?: {
    atsCompliance?: { score: number; feedback: string[] };
    keywordDensity?: { score: number; feedback: string[]; identifiedKeywords: string[] };
    recruiterFriendliness?: { score: number; feedback: string[] };
    conciseness?: { score: number; feedback: string[] };
  };
  strengths?: string[];
  weaknesses?: string[];
  improvements?: string[];
  formattingFixes?: string[];
}

export default function ResumePreview({ 
  content,
  atsScore,
  criteria,
  strengths = [],
  weaknesses = [],
  improvements = [],
  formattingFixes = []
}: ResumePreviewProps) {
  return (
    <div className="space-y-4">
      {atsScore !== undefined && atsScore !== null && (
        <Card>
          <CardContent className="p-6">
            <div className="space-y-6">
              {/* Main Resume Quality Score */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-2xl font-bold">
                    Resume Quality Score: {atsScore}
                  </div>
                  <Badge variant={atsScore >= 80 ? "success" : "destructive"}>
                    {atsScore >= 80 ? "Excellent" : "Needs Improvement"}
                  </Badge>
                </div>
                <Progress value={atsScore} className="h-3" />
              </div>

              {/* Category Scores */}
              <div className="space-y-4">
                {criteria?.atsCompliance && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">ATS Compliance</h3>
                        <p className="text-sm text-muted-foreground">Formatting, parsing, and keyword optimization</p>
                      </div>
                      <Badge variant={criteria.atsCompliance.score >= 80 ? "success" : "destructive"}>
                        {criteria.atsCompliance.score}%
                      </Badge>
                    </div>
                    <Progress value={criteria.atsCompliance.score} className="h-2" />
                  </div>
                )}

                {criteria?.keywordDensity && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">Keyword Density</h3>
                        <p className="text-sm text-muted-foreground">Industry-relevant skills assessment</p>
                      </div>
                      <Badge variant={criteria.keywordDensity.score >= 80 ? "success" : "destructive"}>
                        {criteria.keywordDensity.score}%
                      </Badge>
                    </div>
                    <Progress value={criteria.keywordDensity.score} className="h-2" />
                  </div>
                )}

                {criteria?.recruiterFriendliness && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">Recruiter-Friendliness</h3>
                        <p className="text-sm text-muted-foreground">Clarity, structure, and readability</p>
                      </div>
                      <Badge variant={criteria.recruiterFriendliness.score >= 80 ? "success" : "destructive"}>
                        {criteria.recruiterFriendliness.score}%
                      </Badge>
                    </div>
                    <Progress value={criteria.recruiterFriendliness.score} className="h-2" />
                  </div>
                )}

                {criteria?.conciseness && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">Conciseness & Impact</h3>
                        <p className="text-sm text-muted-foreground">Action-oriented language and brevity</p>
                      </div>
                      <Badge variant={criteria.conciseness.score >= 80 ? "success" : "destructive"}>
                        {criteria.conciseness.score}%
                      </Badge>
                    </div>
                    <Progress value={criteria.conciseness.score} className="h-2" />
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed Analysis Cards */}
      <div className="grid md:grid-cols-2 gap-4">
        {criteria && Object.entries(criteria).map(([key, data]) => (
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
              {key === 'keywordDensity' && data.identifiedKeywords && (
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