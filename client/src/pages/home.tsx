import { Button } from "@/components/ui/button";
import { Link, useLocation, useRouter } from "wouter";
import { toast } from "@/hooks/use-toast";

export default function HomePage() {
  const [location, setLocation] = useLocation();
  const navigate = useRouter();

  return (
    <div className="min-h-screen bg-background">
      <nav className="h-[70px] bg-white border-b border-[#e6e9ed] px-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-[30px] h-[30px] bg-[#4f8df9] rounded-full flex items-center justify-center">
            <span className="text-white font-bold">T</span>
          </div>
          <span className="text-[#1e2a3b] font-bold text-lg">Tweak AI</span>
        </div>
        <div className="flex gap-6 text-[#2c3e50]">
          <Link href="/">Home</Link>
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/tweak">Tweak</Link>
          <Link href="/build">Build</Link>
          <Link href="/prep">Prep</Link>
        </div>
      </nav>
      <main className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold tracking-tight mb-4">Optimize Your Resume with AI</h1>
          <p className="text-xl text-muted-foreground mb-8">
            Get instant ATS score analysis, personalized improvements, and match your resume
            to job descriptions to stand out from the competition.
          </p>
        </div>

        <div className="grid md:grid-cols-4 gap-8 mb-16">
          <div className="text-center">
            <h3 className="text-xl font-semibold mb-2">1. Upload</h3>
            <p>Upload your existing resume</p>
          </div>
          <div className="text-center">
            <h3 className="text-xl font-semibold mb-2">2. Analyze</h3>
            <p>AI analyzes your content</p>
          </div>
          <div className="text-center">
            <h3 className="text-xl font-semibold mb-2">3. Optimize</h3>
            <p>Get personalized improvements</p>
          </div>
          <div className="text-center">
            <h3 className="text-xl font-semibold mb-2">4. Match</h3>
            <p>Target specific job descriptions</p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="p-6 rounded-lg border">
            <h2 className="text-2xl font-semibold mb-4">📄 Upload Resume</h2>
            <p className="mb-4">Start by uploading your existing resume in multiple formats.</p>
            <ul className="list-disc list-inside space-y-2">
              <li>Support for PDF, Word, and TXT</li>
              <li>Secure document handling</li>
              <li>Multiple resume management</li>
            </ul>
          </div>

          <div className="p-6 rounded-lg border">
            <h2 className="text-2xl font-semibold mb-4">✨ AI Analysis</h2>
            <p className="mb-4">Our AI evaluates your resume against industry standards and ATS systems.</p>
            <ul className="list-disc list-inside space-y-2">
              <li>ATS compatibility scoring</li>
              <li>Keyword optimization</li>
              <li>Industry-specific recommendations</li>
            </ul>
          </div>

          <div className="p-6 rounded-lg border">
            <h2 className="text-2xl font-semibold mb-4">🎯 Job Matching</h2>
            <p className="mb-4">Tailor your resume to specific job descriptions for higher match rates.</p>
            <ul className="list-disc list-inside space-y-2">
              <li>Job description analysis</li>
              <li>Skill gap identification</li>
              <li>Customized versions for each job</li>
            </ul>
          </div>
        </div>

        <div className="text-center mt-16">
          <Link href="/dashboard">
            <Button size="lg" className="font-semibold">
              Get Started
            </Button>
          </Link>
        </div>
      </main>
      <div className="text-center py-6 text-sm text-gray-500 border-t">
        © 2025 Tweak AI. All rights reserved.
      </div>
    </div>
  );
}