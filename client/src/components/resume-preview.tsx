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

  const cleanResumeContent = (htmlContent: string) => {
    if (!htmlContent) return '';
    return htmlContent
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove scripts
      .replace(/<button\b[^<]*(?:(?!<\/button>)<[^<]*)*<\/button>/gi, '') // Remove buttons
      .replace(/<div[^>]*>/g, '<div>') // Clean div tags
      .replace(/class="[^"]*"/g, '') // Remove classes
      .replace(/style="[^"]*"/g, '') // Remove inline styles
      .trim();
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
        // Important: Set responseType to blob
        responseType: 'blob'
      });

      if (!response.ok) {
        throw new Error("Failed to generate PDF");
      }

      // Get the blob from response
      const blob = await response.blob();

      // Verify blob type
      if (blob.type !== 'application/pdf') {
        throw new Error("Invalid file format received");
      }

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `enhanced_resume_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: "Your enhanced resume has been downloaded",
      });
    } catch (error) {
      console.error("Download failed:", error);
      toast({
        title: "Download failed",
        description: error instanceof Error ? error.message : "Failed to download resume",
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
        <DialogContent className="max-w-4xl h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Enhanced Resume</DialogTitle>
          </DialogHeader>
          <div className="resume-preview p-8 bg-white">
            {analysis?.enhancedContent ? (
              <div 
                className="mx-auto max-w-[850px]"
                style={{
                  fontFamily: "'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
                  lineHeight: 1.6,
                  color: '#333',
                }}
              >
                <style>
                  {`
                    .resume-preview h1 {
                      font-size: 28px;
                      margin-bottom: 8px;
                      color: #2C3E50;
                      font-weight: 600;
                      text-align: center;
                    }
                    .resume-preview .contact-info {
                      text-align: center;
                      font-size: 14px;
                      margin-bottom: 5px;
                      color: #555;
                    }
                    .resume-preview h2 {
                      font-size: 18px;
                      color: #2C3E50;
                      margin-bottom: 10px;
                      padding-bottom: 5px;
                      border-bottom: 2px solid #3E7CB1;
                      font-weight: 600;
                    }
                    .resume-preview h3 {
                      font-size: 16px;
                      color: #2C3E50;
                      margin-bottom: 4px;
                      font-weight: 600;
                    }
                    .resume-preview ul {
                      padding-left: 20px;
                      margin-bottom: 8px;
                    }
                    .resume-preview li {
                      margin-bottom: 4px;
                      font-size: 14px;
                    }
                  `}
                </style>
                <div dangerouslySetInnerHTML={{ __html: cleanResumeContent(analysis.enhancedContent) }} />
              </div>
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