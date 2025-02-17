import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, Sparkles, Award, Book } from "lucide-react";
import ResumeUpload from "@/components/resume-upload";
import { Link } from "wouter";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Optimize Your Resume with AI
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Get instant ATS score analysis, personalized improvements, and match your resume to job descriptions.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <Card className="p-6 hover:shadow-lg transition-shadow">
            <CardContent className="space-y-4">
              <Upload className="h-12 w-12 text-primary" />
              <h3 className="text-xl font-semibold">Upload Resume</h3>
              <p className="text-muted-foreground">
                Support for PDF, Word, and TXT formats
              </p>
            </CardContent>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-shadow">
            <CardContent className="space-y-4">
              <Sparkles className="h-12 w-12 text-primary" />
              <h3 className="text-xl font-semibold">AI Analysis</h3>
              <p className="text-muted-foreground">
                Get instant ATS score and optimization suggestions
              </p>
            </CardContent>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-shadow">
            <CardContent className="space-y-4">
              <Award className="h-12 w-12 text-primary" />
              <h3 className="text-xl font-semibold">Job Matching</h3>
              <p className="text-muted-foreground">
                Match your resume to job descriptions
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="max-w-2xl mx-auto">
          <ResumeUpload />
        </div>

        <div className="text-center mt-16">
          <Link href="/dashboard">
            <Button size="lg" className="mr-4">
              <Book className="mr-2 h-4 w-4" />
              View Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
