import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<button\b[^<]*(?:(?!<\/button>)<[^<]*)*<\/button>/gi, '')
      .replace(/class="[^"]*"/g, '')
      .replace(/style="[^"]*"/g, '')
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
      });

      if (!response.ok) {
        throw new Error("Failed to generate PDF");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `enhanced_resume_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);

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
    <div className="space-y-8">
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
              onClick={() => setShowContent(!showContent)}
              className="flex-1 py-3 flex items-center justify-center gap-2"
            >
              <FileText className="w-5 h-5" />
              {showContent ? "Hide Resume" : "View Enhanced Resume"}
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
      </Card>

      {showContent && analysis?.enhancedContent && (
        <div className="bg-white rounded-lg shadow-lg overflow-y-auto max-h-[80vh]"> {/*Added overflow-y-auto and max-h for scrolling*/}
          <style>
            {`
              .resume-content {
                max-width: 850px;
                margin: 0 auto;
                padding: 40px;
                font-family: 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                line-height: 1.6;
                color: #333;
              }
              .resume-content h1 {
                font-size: 28px;
                margin-bottom: 8px;
                color: #2C3E50;
                font-weight: 600;
                text-align: center;
              }
              .resume-content .contact-info {
                text-align: center;
                font-size: 14px;
                margin-bottom: 5px;
                color: #555;
              }
              .resume-content h2 {
                font-size: 18px;
                color: #2C3E50;
                margin: 20px 0 10px;
                padding-bottom: 5px;
                border-bottom: 2px solid #3E7CB1;
                font-weight: 600;
              }
              .resume-content h3 {
                font-size: 16px;
                color: #2C3E50;
                margin: 15px 0 4px;
                font-weight: 600;
              }
              .resume-content ul {
                padding-left: 20px;
                margin: 8px 0;
                list-style-type: disc;
              }
              .resume-content li {
                margin-bottom: 4px;
                font-size: 14px;
              }
              .resume-content p {
                margin: 8px 0;
                font-size: 14px;
              }
              .resume-content section {
                margin: 20px 0;
              }
            `}
          </style>
          <div className="resume-content" >
            <div dangerouslySetInnerHTML={{ 
              __html: cleanResumeContent(analysis.enhancedContent) 
            }} />
          </div>
        </div>
      )}
    </div>
  );
}