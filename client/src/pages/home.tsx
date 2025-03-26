
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-[1200px] mx-auto px-6 py-24">
        <div className="max-w-3xl">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Optimize Your Resume with AI
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Get instant ATS score analysis, personalized improvements, and match your resume
            to job descriptions to stand out from the competition.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link to="/builder">
              <Button size="lg" className="gap-2">
                Build Your Resume
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link to="/dashboard">
              <Button variant="outline" size="lg">
                View Dashboard
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid md:grid-cols-4 gap-12 mt-24">
          <div>
            <div className="text-2xl mb-2">1</div>
            <h3 className="text-xl font-semibold mb-2">Upload</h3>
            <p className="text-gray-600">
              Upload your existing resume in multiple formats.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-gray-500">
              <li>Support for PDF, Word, and TXT</li>
              <li>Secure document handling</li>
              <li>Multiple resume management</li>
            </ul>
          </div>

          <div>
            <div className="text-2xl mb-2">2</div>
            <h3 className="text-xl font-semibold mb-2">Analyze</h3>
            <p className="text-gray-600">
              AI analyzes your content
            </p>
            <ul className="mt-4 space-y-2 text-sm text-gray-500">
              <li>ATS compatibility scoring</li>
              <li>Keyword optimization</li>
              <li>Industry-specific recommendations</li>
            </ul>
          </div>

          <div>
            <div className="text-2xl mb-2">3</div>
            <h3 className="text-xl font-semibold mb-2">Optimize</h3>
            <p className="text-gray-600">
              Get personalized improvements
            </p>
            <ul className="mt-4 space-y-2 text-sm text-gray-500">
              <li>AI-powered content suggestions</li>
              <li>Format optimization</li>
              <li>Section-by-section guidance</li>
            </ul>
          </div>

          <div>
            <div className="text-2xl mb-2">4</div>
            <h3 className="text-xl font-semibold mb-2">Match</h3>
            <p className="text-gray-600">
              Target specific job descriptions
            </p>
            <ul className="mt-4 space-y-2 text-sm text-gray-500">
              <li>Job description analysis</li>
              <li>Skill gap identification</li>
              <li>Customized versions for each job</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
