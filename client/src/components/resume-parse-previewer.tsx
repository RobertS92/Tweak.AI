import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface HighlightSection {
  text: string;
  field: string;
  fieldType: 'personal' | 'experience' | 'education' | 'skills' | 'projects' | 'certifications';
  confidence: number;
}

interface ResumeParsePreviewer {
  content: string;
  highlights: HighlightSection[];
  isAnalyzing: boolean;
  onHighlightClick: (field: string, value: string) => void;
}

export default function ResumeParsePreviewer({ 
  content, 
  highlights, 
  isAnalyzing,
  onHighlightClick,
  onAddAiContent
}: ResumeParsePreviewer & { onAddAiContent?: (content: string) => void }) {
  const [previewText, setPreviewText] = useState<string>(content);
  const [activeHighlight, setActiveHighlight] = useState<string | null>(null);

  // Update preview text when content or highlights change
  useEffect(() => {
    let text = content;
    // Sort highlights by their position in the text to avoid overlap issues
    const sortedHighlights = [...highlights].sort((a, b) => 
      content.indexOf(a.text) - content.indexOf(b.text)
    );

    // Replace each matched text with a highlighted version
    sortedHighlights.forEach((highlight) => {
      const index = text.indexOf(highlight.text);
      if (index !== -1) {
        const before = text.substring(0, index);
        const after = text.substring(index + highlight.text.length);
        text = `${before}<span class="highlight ${highlight.fieldType} ${
          activeHighlight === highlight.field ? 'active' : ''
        }" data-field="${highlight.field}" data-confidence="${highlight.confidence}">${
          highlight.text
        }</span>${after}`;
      }
    });

    setPreviewText(text);
  }, [content, highlights, activeHighlight]);

  return (
    <Card className="h-full">
      <CardHeader className="py-3 px-4 border-b">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          Resume Preview
          {isAnalyzing && (
            <Badge variant="secondary" className="ml-2 animate-pulse">
              Analyzing...
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[calc(100vh-20rem)] w-full">
          <div className="p-4">
            <div 
              className="font-mono whitespace-pre-wrap text-sm resume-preview"
              dangerouslySetInnerHTML={{ __html: previewText }}
              onClick={(e) => {
                const target = e.target as HTMLElement;
                if (target.classList.contains('highlight')) {
                  const field = target.getAttribute('data-field');
                  const text = target.textContent;
                  if (field && text) {
                    setActiveHighlight(field);
                    onHighlightClick(field, text);
                  }
                }
              }}
            />
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
