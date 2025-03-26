import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, Plus, Eye, Download, ArrowRight, ArrowLeft } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface ResumeSection {
  id: string;
  title: string;
  content?: string;
  items?: SectionItem[];
  categories?: SkillCategory[];
}

interface SectionItem {
  title: string;
  subtitle: string;
  date: string;
  description: string;
  bullets: string[];
  content?: string; 
}

interface SkillCategory {
  name: string;
  skills: string[];
}

const sections = [
  { id: 'personal-info', title: 'Personal Information', number: 1 },
  { id: 'professional-summary', title: 'Professional Summary', number: 2 },
  { id: 'work-experience', title: 'Work Experience', number: 3 },
  { id: 'education', title: 'Education', number: 4 },
  { id: 'skills', title: 'Skills', number: 5 },
  { id: 'projects', title: 'Projects & Certs', number: 6 },
];

export default function ResumeBuilder() {
  const [activeSection, setActiveSection] = useState('personal-info');
  const [personalInfo, setPersonalInfo] = useState({
    name: '',
    email: '',
    phone: '',
    location: '',
    linkedin: '',
    portfolio: '',
    github: '',
  });

  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentSectionIndex = sections.findIndex(s => s.id === activeSection);
  const progress = ((currentSectionIndex + 1) / sections.length) * 100;

  const handleFileUpload = (file: File) => {
    //Existing file upload logic -  This needs to be implemented based on the original code's /api/resume-parser endpoint
    console.log("File upload not yet implemented")
  };

  const handleNewResume = () => {
    //Existing new resume logic - This needs to be implemented based on the original code's state resetting
    console.log("New Resume function not yet implemented")
    toast({
      title: "New Resume Started",
      description: "Resume cleared.  Start adding information."
    })
  };

  const handleDownloadPDF = () => {
    //Existing PDF download logic - This needs to be implemented based on the original code's PDF generation using jspdf
    console.log("PDF download not yet implemented")
  };

  return (
    <div className="min-h-screen bg-[#f5f7fa]">
      {/* Main Header */}
      <div className="h-[70px] bg-white border-b">
        <div className="max-w-[1200px] mx-auto h-full flex items-center justify-between px-4">
          <h1 className="text-2xl font-bold text-[#2c3e50]">Resume Builder</h1>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Progress value={progress} className="w-[300px] h-1.5" />
              <span className="text-sm text-gray-500">{currentSectionIndex + 1} of {sections.length} Sections</span>
            </div>

            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
              <Upload className="w-4 h-4 mr-2" />
              Upload
            </Button>
            <Button variant="outline" size="sm" onClick={handleNewResume}>
              <Plus className="w-4 h-4 mr-2" />
              New
            </Button>
            <Button size="sm" onClick={handleDownloadPDF}>
              <Download className="w-4 h-4 mr-2" />
              PDF
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1200px] mx-auto px-4 py-6">
        {/* Section Navigation */}
        <div className="bg-white rounded-lg p-4 mb-6 border">
          <div className="flex gap-2">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`flex-1 h-[50px] rounded-lg px-4 flex items-center justify-between ${
                  activeSection === section.id ? 'bg-[#4f8df9] text-white' : 'bg-[#ecf0f1] text-[#2c3e50]'
                }`}
              >
                <span>{section.title}</span>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                  activeSection === section.id ? 'bg-white text-[#4f8df9]' : 'bg-[#e6e9ed] text-[#7f8c8d]'
                }`}>
                  {section.number}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex gap-6">
          {/* Main Form */}
          <div className="flex-1">
            <Card className="p-6">
              {activeSection === 'personal-info' && (
              <>
              <h2 className="text-2xl font-bold text-[#2c3e50] mb-2">Personal Information</h2>
              <p className="text-[#7f8c8d] mb-6">Basic contact details that appear at the top of your resume</p>

              {/* AI Tips */}
              <div className="bg-[#f0f7ff] border border-[#4f8df9] rounded-lg p-4 mb-6">
                <div className="flex gap-3">
                  <div className="w-8 h-8 bg-[#4f8df9] rounded-full flex items-center justify-center text-white">
                    💡
                  </div>
                  <div>
                    <h3 className="font-bold text-[#2c3e50]">Pro Tips</h3>
                    <p className="text-sm text-[#2c3e50]">
                      Use a professional email address, and include your LinkedIn URL if it's up-to-date with relevant experience.
                    </p>
                  </div>
                </div>
              </div>

              {/* Form Fields */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <Label>Full Name</Label>
                  <Input
                    placeholder="e.g., John Smith"
                    value={personalInfo.name}
                    onChange={(e) => setPersonalInfo({ ...personalInfo, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    placeholder="e.g., john.smith@email.com"
                    value={personalInfo.email}
                    onChange={(e) => setPersonalInfo({ ...personalInfo, email: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input
                    placeholder="e.g., (123) 456-7890"
                    value={personalInfo.phone}
                    onChange={(e) => setPersonalInfo({ ...personalInfo, phone: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Location</Label>
                  <Input
                    placeholder="e.g., New York, NY"
                    value={personalInfo.location}
                    onChange={(e) => setPersonalInfo({ ...personalInfo, location: e.target.value })}
                  />
                </div>
                <div className="col-span-2">
                  <Label>LinkedIn URL</Label>
                  <Input
                    placeholder="e.g., linkedin.com/in/johnsmith"
                    value={personalInfo.linkedin}
                    onChange={(e) => setPersonalInfo({ ...personalInfo, linkedin: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Portfolio Website (Optional)</Label>
                  <Input
                    placeholder="e.g., johnsmith.com"
                    value={personalInfo.portfolio}
                    onChange={(e) => setPersonalInfo({ ...personalInfo, portfolio: e.target.value })}
                  />
                </div>
                <div>
                  <Label>GitHub (Optional)</Label>
                  <Input
                    placeholder="e.g., github.com/johnsmith"
                    value={personalInfo.github}
                    onChange={(e) => setPersonalInfo({ ...personalInfo, github: e.target.value })}
                  />
                </div>
              </div>

              {/* Navigation Buttons */}
              <div className="flex items-center justify-between mt-12">
                <Button variant="outline" disabled={currentSectionIndex === 0}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Previous
                </Button>

                <div className="flex items-center gap-2 bg-[#f9f9fa] px-6 py-2 rounded-full border">
                  <span className="text-[#7f8c8d]">Current ATS Score:</span>
                  <span className="font-bold text-[#f39c12]">65/100</span>
                  <Button variant="ghost" className="text-[#3498db] text-xs ml-4">
                    Improve Score
                  </Button>
                </div>

                <Button onClick={() => {
                  if (currentSectionIndex < sections.length - 1) {
                    setActiveSection(sections[currentSectionIndex + 1].id);
                  }
                }}>
                  Next
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
              </>
              )}
              {/* Add other sections here based on the activeSection state */}
            </Card>
          </div>

          {/* AI Assistant Panel */}
          <div className="w-[190px]">
            <Card className="p-4">
              <h3 className="text-center font-bold text-[#2c3e50] mb-4">AI Assistant</h3>
              <div className="border-t pt-4">
                <p className="text-center text-sm text-[#7f8c8d] mb-4">Ask for help with any section</p>
                <div className="bg-[#f9f9fa] p-4 rounded-lg mb-4 min-h-[380px] flex items-center justify-center text-center">
                  <p className="text-sm text-[#aaaaaa]">Type your question<br />or select a suggestion</p>
                </div>
                <div className="space-y-2">
                  {['Write a professional bio', 'Format my phone number', 'Help with LinkedIn URL'].map((suggestion) => (
                    <button
                      key={suggestion}
                      className="w-full px-4 py-2 text-xs text-[#4f8df9] bg-[#f0f7ff] border border-[#4f8df9] rounded-full"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept=".pdf,.doc,.docx,.txt"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileUpload(file);
        }}
      />
    </div>
  );
}