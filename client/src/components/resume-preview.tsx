import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface ResumePreviewProps {
  content: string;
  atsScore?: number | null;
  strengths?: string[];
  weaknesses?: string[];
}

export default function ResumePreview({ 
  content,
  atsScore,
  strengths = [],
  weaknesses = []
}: ResumePreviewProps) {
  return (
    <div className="space-y-4">
      {atsScore !== undefined && atsScore !== null && (
        <div className="flex items-center space-x-4">
          <div className="text-2xl font-bold">
            ATS Score: {atsScore}
          </div>
          <Badge variant={atsScore >= 80 ? "success" : "destructive"}>
            {atsScore >= 80 ? "Excellent" : "Needs Improvement"}
          </Badge>
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

      <Card className="mt-4">
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
