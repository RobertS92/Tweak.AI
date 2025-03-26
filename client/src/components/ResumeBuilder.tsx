
import React from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';

export function ResumeBuilder() {
  const sections = [
    { id: 1, name: 'Personal Information', active: true },
    { id: 2, name: 'Professional Summary', active: false },
    { id: 3, name: 'Work Experience', active: false },
    { id: 4, name: 'Education', active: false },
    { id: 5, name: 'Skills', active: false },
    { id: 6, name: 'Projects & Certifications', active: false },
  ];

  return (
    <div className="min-h-screen bg-[#f5f7fa] pl-[220px]">
      {/* Top Bar */}
      <div className="h-[70px] bg-white border-b flex items-center justify-between px-8">
        <h1 className="text-2xl font-bold text-[#2c3e50]">Resume Builder</h1>
        <div className="flex items-center gap-4">
          <Button variant="outline" className="gap-2">
            <span>↑</span> Upload
          </Button>
          <Button variant="outline" className="gap-2">
            <span>+</span> New
          </Button>
          <Button className="bg-[#2c3e50]">
            <span>↓</span> PDF
          </Button>
        </div>
      </div>

      <div className="p-6 flex gap-6">
        {/* Left Column */}
        <Card className="w-[250px] p-4">
          <h2 className="text-lg font-bold mb-4">Resume Sections</h2>
          <div className="space-y-2">
            {sections.map((section) => (
              <div
                key={section.id}
                className={`p-4 rounded-lg flex items-center justify-between ${
                  section.active ? 'bg-[#4f8df9] text-white' : 'bg-[#ecf0f1]'
                }`}
              >
                <span>{section.name}</span>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                  section.active ? 'bg-white text-[#4f8df9]' : 'bg-[#e6e9ed] text-[#7f8c8d]'
                }`}>
                  {section.id}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Right Column */}
        <Card className="flex-1 p-6">
          <h2 className="text-2xl font-bold mb-2">Personal Information</h2>
          <p className="text-[#7f8c8d] mb-6">Basic contact details that appear at the top of your resume</p>
          
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="font-bold block mb-2">Full Name</label>
              <Input placeholder="e.g., John Smith" />
            </div>
            <div>
              <label className="font-bold block mb-2">Email</label>
              <Input placeholder="e.g., john.smith@email.com" />
            </div>
            <div>
              <label className="font-bold block mb-2">Phone</label>
              <Input placeholder="e.g., (123) 456-7890" />
            </div>
            <div>
              <label className="font-bold block mb-2">Location</label>
              <Input placeholder="e.g., New York, NY" />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
