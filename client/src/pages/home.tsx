import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useNavigate } from "react-router-dom"

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#f5f7fa]">
      {/* Navigation */}
      <nav className="h-[70px] bg-white border-b border-[#e6e9ed] px-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-[30px] h-[30px] bg-[#4f8df9] rounded-full flex items-center justify-center">
            <span className="text-white font-bold">T</span>
          </div>
          <span className="text-[#1e2a3b] font-bold text-lg">Tweak AI</span>
        </div>
        <div className="flex gap-6 text-[#2c3e50]">
          <span>Home</span>
          <span>Dashboard</span>
          <span>Tweak</span>
          <span>Build</span>
          <span>Prep</span>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-4xl mx-auto text-center mt-16 px-4">
        <h1 className="text-4xl font-bold text-[#1e2a3b]">Optimize Your Resume with AI</h1>
        <p className="text-[#7f8c8d] mt-4">
          Get instant ATS score analysis, personalized improvements, and match your resume<br />
          to job descriptions to stand out from the competition.
        </p>
      </div>

      {/* Process Steps */}
      <div className="max-w-5xl mx-auto mt-16 px-4">
        <div className="flex justify-center items-center gap-8">
          {[
            { number: "1", title: "Upload", desc: "Upload your existing resume" },
            { number: "2", title: "Analyze", desc: "AI analyzes your content" },
            { number: "3", title: "Optimize", desc: "Get personalized improvements" },
            { number: "4", title: "Match", desc: "Target specific job descriptions" }
          ].map((step, i) => (
            <div key={i} className="flex flex-col items-center">
              <div className="relative">
                <div className="w-20 h-20 rounded-full bg-[#4f8df9] flex items-center justify-center">
                  <span className="text-2xl font-bold text-white">{step.number}</span>
                </div>
                {i < 3 && (
                  <div className="absolute top-1/2 left-full w-12 h-0.5 bg-[#e6e9ed]" />
                )}
              </div>
              <h3 className="mt-6 font-semibold text-[#2c3e50]">{step.title}</h3>
              <p className="mt-2 text-sm text-[#7f8c8d] text-center max-w-[200px]">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Feature Cards */}
      <div className="max-w-5xl mx-auto mt-20 px-4 grid grid-cols-3 gap-8">
        <Card className="p-6 text-center">
          <div className="w-12 h-12 mx-auto mb-4 bg-blue-50 rounded-full flex items-center justify-center">
            <span className="text-2xl">↑</span>
          </div>
          <h3 className="font-semibold mb-2">Upload Resume</h3>
          <p className="text-sm text-gray-600 mb-4">Start by uploading your existing resume in multiple formats.</p>
          <ul className="text-sm text-left space-y-2">
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-400 rounded-full" />
              <span>Support for PDF, Word, and TXT</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-400 rounded-full" />
              <span>Secure document handling</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-400 rounded-full" />
              <span>Multiple resume management</span>
            </li>
          </ul>
        </Card>

        <Card className="p-6 text-center">
          <div className="w-12 h-12 mx-auto mb-4 bg-blue-50 rounded-full flex items-center justify-center">
            <span className="text-2xl">✨</span>
          </div>
          <h3 className="font-semibold mb-2">AI Analysis</h3>
          <p className="text-sm text-gray-600 mb-4">Our AI evaluates your resume against industry standards and ATS systems.</p>
          <ul className="text-sm text-left space-y-2">
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-400 rounded-full" />
              <span>ATS compatibility scoring</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-400 rounded-full" />
              <span>Keyword optimization</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-400 rounded-full" />
              <span>Industry-specific recommendations</span>
            </li>
          </ul>
        </Card>

        <Card className="p-6 text-center">
          <div className="w-12 h-12 mx-auto mb-4 bg-blue-50 rounded-full flex items-center justify-center">
            <span className="text-2xl">🎯</span>
          </div>
          <h3 className="font-semibold mb-2">Job Matching</h3>
          <p className="text-sm text-gray-600 mb-4">Tailor your resume to specific job descriptions for higher match rates.</p>
          <ul className="text-sm text-left space-y-2">
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-400 rounded-full" />
              <span>Job description analysis</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-400 rounded-full" />
              <span>Skill gap identification</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-400 rounded-full" />
              <span>Customized versions for each job</span>
            </li>
          </ul>
        </Card>
      </div>

      {/* Upload Section */}
      <div className="max-w-2xl mx-auto mt-20 px-4">
        <Card className="p-8 border-dashed border-2">
          <div className="text-center">
            <h3 className="text-xl font-semibold mb-4">Upload Your Resume</h3>
            <p className="text-sm text-gray-600 mb-4">Drag and drop your resume here or click to browse</p>
            <p className="text-xs text-gray-500 mb-6">Supported formats: PDF or TXT (Max 5MB)</p>
            <Button className="bg-[#4f8df9]">Select File</Button>
            <p className="text-xs text-gray-500 mt-4">You can upload multiple resumes by returning to this page</p>
          </div>
        </Card>
      </div>

      {/* Testimonials */}
      <div className="max-w-5xl mx-auto mt-20 px-4">
        <h2 className="text-2xl font-bold text-center mb-8">What Our Users Say</h2>
        <div className="grid grid-cols-3 gap-8">
          {[
            {
              initials: "JM",
              name: "John Miller",
              role: "Software Engineer",
              color: "bg-blue-500",
              quote: "Thanks to Tweak AI, my resume's ATS score jumped from 65% to 90%. I received callbacks from 3 companies within a week!"
            },
            {
              initials: "SA",
              name: "Sarah Adams",
              role: "Marketing Specialist",
              color: "bg-red-500",
              quote: "The job matching feature is incredible. It showed me exactly what keywords I was missing for each application. Game changer!"
            },
            {
              initials: "DR",
              name: "David Rodriguez",
              role: "Career Coach",
              color: "bg-green-500",
              quote: "As a career coach, I recommend Tweak AI to all my clients. It provides the data-driven insights that truly make a difference."
            }
          ].map((testimonial, i) => (
            <Card key={i} className="p-6">
              <p className="text-sm text-gray-600 mb-4">"{testimonial.quote}"</p>
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 ${testimonial.color} rounded-full flex items-center justify-center text-white text-sm`}>
                  {testimonial.initials}
                </div>
                <div>
                  <p className="font-semibold text-sm">{testimonial.name}</p>
                  <p className="text-xs text-gray-500">{testimonial.role}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* CTA Buttons */}
      <div className="text-center mt-16 mb-20">
        <Button className="bg-[#1e2a3b] text-white px-8 py-2 rounded-md" onClick={() => navigate('/dashboard')}>
          View Dashboard
        </Button>
        <Button variant="outline" className="ml-4 px-8 py-2 rounded-md">
          Learn More
        </Button>
      </div>

      {/* Footer */}
      <div className="text-center py-6 text-sm text-gray-500 border-t">
        © 2025 Tweak AI. All rights reserved.
      </div>
    </div>
  )
}