import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ResumePreviewProps {
  content: string;
  analysis?: {
    enhancedContent?: string;
  };
}

export default function ResumePreview({ content, analysis }: ResumePreviewProps) {
  const [showContent, setShowContent] = React.useState(false);
  const [isDownloading, setIsDownloading] = React.useState(false);
  const { toast } = useToast();

  // Clean the resume content of any unwanted HTML or styling
  const cleanResumeContent = (htmlContent: string) => {
    const cleanedContent = htmlContent
      .replace(/<\/?div[^>]*>/g, '') // Remove div tags
      .replace(/class="[^"]*"/g, '') // Remove classes
      .replace(/style="[^"]*"/g, '') // Remove inline styles
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove scripts
      .replace(/<button\b[^<]*(?:(?!<\/button>)<[^<]*)*<\/button>/gi, '') // Remove buttons
      .trim();

    // Wrap content in proper resume structure
    return `
      <div class="resume">
        ${cleanedContent}
      </div>
    `;
  };

  const downloadEnhancedResume = async () => {
    if (!analysis?.enhancedContent) {
      toast({
        title: "Error",
        description: "No enhanced content available to download",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsDownloading(true);
      const cleanContent = cleanResumeContent(analysis.enhancedContent);

      const response = await fetch("/api/resumes/download-pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content: cleanContent }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to generate PDF");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `enhanced_resume_${new Date().toISOString().split('T')[0]}.pdf`;

      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Success",
        description: "Your enhanced resume has been downloaded",
      });
    } catch (error) {
      console.error("Failed to download PDF:", error);
      toast({
        title: "Download failed",
        description: error instanceof Error ? error.message : "There was an error downloading your resume. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Card className="bg-white shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl font-semibold text-gray-800">
          Enhanced Resume
        </CardTitle>
        <p className="text-sm text-gray-600">
          AI-optimized version with all improvements and formatting fixes applied
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button
            onClick={() => setShowContent(true)}
            className="flex-1 py-3 flex items-center justify-center gap-2"
          >
            <FileText className="w-5 h-5" />
            View Enhanced Resume
          </Button>
          <Button
            onClick={downloadEnhancedResume}
            disabled={isDownloading || !analysis?.enhancedContent}
            className="py-3 flex items-center justify-center gap-2"
          >
            <Download className="w-5 h-5" />
            {isDownloading ? "Downloading..." : "Download PDF"}
          </Button>
        </div>
      </CardContent>

      <Dialog open={showContent} onOpenChange={setShowContent}>
        <DialogContent className="max-w-4xl h-[90vh]">
          <DialogHeader>
            <DialogTitle>Enhanced Resume Preview</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto p-8 bg-white">
            {analysis?.enhancedContent ? (
              <div
                id="resume-preview"
                className="resume-container"
                dangerouslySetInnerHTML={{
                  __html: cleanResumeContent(analysis.enhancedContent)
                }}
              />
            ) : (
              <div className="text-center text-muted-foreground py-8">
                No enhanced content available yet.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}