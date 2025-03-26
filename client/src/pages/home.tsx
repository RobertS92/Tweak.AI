
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, Sparkles, Target } from "lucide-react";
import { Link } from "wouter";
import ResumeUpload from "@/components/resume-upload";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      <div className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Optimize Your Resume with AI
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Get instant ATS score analysis, personalized improvements, and match your resume to job descriptions to stand out from the competition.
          </p>
        </div>

        {/* Process Steps */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-16">
          {[
            { number: "1", title: "Upload", desc: "Upload your existing resume" },
            { number: "2", title: "Analyze", desc: "AI analyzes your content" },
            { number: "3", title: "Optimize", desc: "Get personalized improvements" },
            { number: "4", title: "Match", desc: "Target specific job descriptions" },
          ].map((step, i) => (
            <div key={i} className="flex flex-col items-center">
              <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center mb-4">
                <span className="text-2xl font-bold text-primary-foreground">{step.number}</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
              <p className="text-muted-foreground text-center">{step.desc}</p>
            </div>
          ))}
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <Card className="p-6 hover:shadow-lg transition-shadow">
            <CardContent className="space-y-4">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Upload className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">Upload Resume</h3>
              <p className="text-muted-foreground">Start by uploading your existing resume in multiple formats.</p>
              <ul className="space-y-2">
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Support for PDF, Word, and TXT</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Secure document handling</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Multiple resume management</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Version control and history</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-shadow">
            <CardContent className="space-y-4">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">AI Analysis</h3>
              <p className="text-muted-foreground">Our AI evaluates your resume against industry standards and ATS systems.</p>
              <ul className="space-y-2">
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>ATS compatibility scoring</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Keyword optimization</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Content and format evaluation</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Industry-specific recommendations</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-shadow">
            <CardContent className="space-y-4">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Target className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">Job Matching</h3>
              <p className="text-muted-foreground">Tailor your resume to specific job descriptions for higher match rates.</p>
              <ul className="space-y-2">
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Job description analysis</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Skill gap identification</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Targeted keyword suggestions</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Customized versions for each job</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Upload Section */}
        <ResumeUpload />

        {/* Testimonials */}
        <div className="py-16">
          <h2 className="text-3xl font-bold text-center mb-12">What Our Users Say</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                quote: "Thanks to Tweak AI, my resume's ATS score jumped from 65% to 92%. I received callbacks from 3 companies within a week!",
                name: "John Miller",
                role: "Software Engineer",
                initials: "JM",
                color: "bg-blue-500"
              },
              {
                quote: "The job matching feature is incredible. It showed me exactly what keywords I was missing for each application. Game changer!",
                name: "Sarah Adams",
                role: "Marketing Specialist",
                initials: "SA",
                color: "bg-red-500"
              },
              {
                quote: "As a career coach, I recommend Tweak AI to all my clients. It provides the data-driven insights that truly make a difference.",
                name: "David Rodriguez",
                role: "Career Coach",
                initials: "DR",
                color: "bg-emerald-500"
              }
            ].map((testimonial, i) => (
              <Card key={i} className="p-6">
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground">{testimonial.quote}</p>
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full ${testimonial.color} flex items-center justify-center text-white font-bold`}>
                      {testimonial.initials}
                    </div>
                    <div>
                      <p className="font-semibold">{testimonial.name}</p>
                      <p className="text-muted-foreground text-sm">{testimonial.role}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col items-center gap-4 mb-16">
          <Link href="/dashboard">
            <Button size="lg" className="w-64">View Dashboard</Button>
          </Link>
          <Link href="/about">
            <Button size="lg" variant="outline" className="w-64">Learn More</Button>
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-primary py-4">
        <p className="text-center text-primary-foreground">© 2025 Tweak AI. All rights reserved.</p>
      </footer>
    </div>
  );
}
