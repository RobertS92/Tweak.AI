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
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-2xl font-bold">
              Resume Quality Score: {atsScore}
            </div>
            <Badge variant={atsScore >= 80 ? "success" : "destructive"}>
              {atsScore >= 80 ? "Excellent" : "Needs Improvement"}
            </Badge>
          </div>
          <Progress value={atsScore} className="h-2" />
        </div>
      )}

      {criteria && (
        <div className="grid md:grid-cols-2 gap-4">
          {Object.entries(criteria).map(([key, data]) => (
            <Card key={key}>
              <CardContent className="p-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold capitalize">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </h3>
                    <Badge variant={data.score >= 80 ? "success" : "destructive"}>
                      {data.score}%
                    </Badge>
                  </div>
                  <Progress value={data.score} className="h-2" />
                  <ul className="list-disc list-inside space-y-1 mt-2">
                    {data.feedback.map((item, i) => (
                      <li key={i} className="text-sm text-muted-foreground">
                        {item}
                      </li>
                    ))}
                  </ul>
                  {key === 'keywordDensity' && data.identifiedKeywords && (
                    <div className="mt-2">
                      <p className="text-sm font-medium mb-1">Identified Keywords:</p>
                      <div className="flex flex-wrap gap-1">
                        {data.identifiedKeywords.map((keyword, i) => (
                          <Badge key={i} variant="secondary">{keyword}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

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