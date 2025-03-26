import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useLocation } from 'wouter';
import { SideNavigation } from "@/components/ui/SideNavigation";

export default function Home() {
  const [location, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-[#f5f7fa]">
      <SideNavigation />
      <div className="pl-[220px] p-8">
        <div className="max-w-5xl mx-auto pt-20">
          <h1 className="text-4xl font-bold text-center mb-4">
            Welcome to Tweak AI
          </h1>
          <p className="text-xl text-center text-gray-600 mb-12">
            Your AI-powered resume optimization and job matching assistant
          </p>

          {/* Feature Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
            <Card className="p-6">
              <h3 className="text-xl font-semibold mb-2">Resume Builder</h3>
              <p className="text-gray-600 mb-4">
                Create and optimize your resume with AI assistance
              </p>
            </Card>
            <Card className="p-6">
              <h3 className="text-xl font-semibold mb-2">Job Matcher</h3>
              <p className="text-gray-600 mb-4">
                Find the perfect job matches for your skills
              </p>
            </Card>
            <Card className="p-6">
              <h3 className="text-xl font-semibold mb-2">Interview Prep</h3>
              <p className="text-gray-600 mb-4">
                Practice with AI-powered mock interviews
              </p>
            </Card>
          </div>

          {/* CTA Buttons */}
          <div className="text-center mt-16 mb-20">
            <Button
              className="bg-[#1e2a3b] text-white px-8 py-2 rounded-md"
              onClick={() => setLocation('/dashboard')}
            >
              View Dashboard
            </Button>
            <Button variant="outline" className="ml-4 px-8 py-2 rounded-md">
              Learn More
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}