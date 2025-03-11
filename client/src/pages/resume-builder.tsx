import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Download, Plus, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Section {
  id: string;
  title: string;
  content: string;
  items?: Array<{
    title: string;
    subtitle: string;
    date: string;
    description: string;
    bullets: string[];
  }>;
}

export default function ResumeBuilder() {
  const { toast } = useToast();
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [personalInfo, setPersonalInfo] = useState({
    name: "",
    email: "",
    phone: "",
    location: "",
    linkedin: ""
  });

  const [sections, setSections] = useState<Section[]>([
    {
      id: "summary",
      title: "Professional Summary",
      content: ""
    },
    {
      id: "experience",
      title: "Work Experience",
      content: "",
      items: []
    },
    {
      id: "education",
      title: "Education",
      content: "",
      items: []
    },
    {
      id: "skills",
      title: "Skills",
      content: ""
    },
    {
      id: "projects",
      title: "Projects",
      content: "",
      items: []
    },
    {
      id: "certifications",
      title: "Certifications",
      content: "",
      items: []
    }
  ]);

  const handleFileUpload = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      toast({
        title: "Processing Resume",
        description: "Your resume is being analyzed by AI..."
      });

      const response = await fetch('/api/ai-resume-parser', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to parse resume');
      }

      const data = await response.json();

      // Update personal information
      if (data.personalInfo) {
        setPersonalInfo({
          name: data.personalInfo.name || "",
          email: data.personalInfo.email || "",
          phone: data.personalInfo.phone || "",
          location: data.personalInfo.location || "",
          linkedin: data.personalInfo.linkedin || ""
        });
      }

      // Update sections with parsed data
      const updatedSections = sections.map(section => {
        const sectionData = data[section.id];
        if (!sectionData) return section;

        switch (section.id) {
          case "summary":
            return {
              ...section,
              content: data.summary || ""
            };

          case "experience":
            return {
              ...section,
              items: (data.experience || []).map((exp: any) => ({
                title: exp.position || "",
                subtitle: exp.company || "",
                date: `${exp.startDate || ""} - ${exp.endDate || "Present"}`,
                description: exp.description || "",
                bullets: exp.responsibilities || []
              }))
            };

          case "education":
            return {
              ...section,
              items: (data.education || []).map((edu: any) => ({
                title: edu.degree || "",
                subtitle: edu.institution || "",
                date: `${edu.startDate || ""} - ${edu.endDate || ""}`,
                description: edu.description || "",
                bullets: edu.highlights || []
              }))
            };

          case "skills":
            return {
              ...section,
              content: Array.isArray(data.skills) ? data.skills.join(", ") : data.skills || ""
            };

          case "projects":
            return {
              ...section,
              items: (data.projects || []).map((proj: any) => ({
                title: proj.name || "",
                subtitle: proj.technologies || "",
                date: proj.duration || "",
                description: proj.description || "",
                bullets: proj.highlights || []
              }))
            };

          case "certifications":
            return {
              ...section,
              items: (data.certifications || []).map((cert: any) => ({
                title: cert.name || "",
                subtitle: cert.issuer || "",
                date: cert.date || "",
                description: cert.description || "",
                bullets: cert.details || []
              }))
            };

          default:
            return section;
        }
      });

      setSections(updatedSections);

      toast({
        title: "Resume Parsed Successfully",
        description: "All sections have been populated. Please review and edit as needed."
      });
    } catch (error) {
      console.error('Error parsing resume:', error);
      toast({
        title: "Parsing Failed",
        description: "Failed to parse resume. Please try again or enter details manually.",
        variant: "destructive"
      });
    }
  };

  const addSectionItem = (sectionId: string) => {
    setSections(prev => prev.map(section => {
      if (section.id === sectionId && section.items) {
        return {
          ...section,
          items: [
            ...section.items,
            { title: "", subtitle: "", date: "", description: "", bullets: [] }
          ]
        };
      }
      return section;
    }));
  };

  const handleNewResume = () => {
    setPersonalInfo({
      name: "",
      email: "",
      phone: "",
      location: "",
      linkedin: ""
    });
    setSections(sections.map(section => ({
      ...section,
      content: "",
      items: section.items ? [] : undefined
    })));
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-[1200px] mx-auto">
        {/* Header with buttons */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Resume Builder</h1>
          <div className="flex gap-3">
            <Button 
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.pdf,.doc,.docx,.txt';
                input.onchange = (e) => {
                  const file = (e.target as HTMLInputElement).files?.[0];
                  if (file) handleFileUpload(file);
                };
                input.click();
              }}
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload Resume
            </Button>
            <Button variant="outline" onClick={handleNewResume}>
              <Plus className="w-4 h-4 mr-2" />
              New Resume
            </Button>
            <Button>
              <Download className="w-4 h-4 mr-2" />
              Download PDF
            </Button>
          </div>
        </div>

        {/* Main content */}
        <div className="grid grid-cols-[240px_1fr] gap-6">
          {/* Left sidebar */}
          <Card className="h-fit">
            <CardContent className="p-4">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full text-left px-4 py-2 rounded-md transition-colors ${
                    activeSection === section.id
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  }`}
                >
                  {section.title}
                </button>
              ))}
            </CardContent>
          </Card>

          {/* Right content area */}
          <div className="space-y-6">
            {/* Personal Information */}
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    placeholder="Full Name"
                    value={personalInfo.name}
                    onChange={(e) => setPersonalInfo(prev => ({ ...prev, name: e.target.value }))}
                  />
                  <Input
                    placeholder="Email"
                    type="email"
                    value={personalInfo.email}
                    onChange={(e) => setPersonalInfo(prev => ({ ...prev, email: e.target.value }))}
                  />
                  <Input
                    placeholder="Phone"
                    value={personalInfo.phone}
                    onChange={(e) => setPersonalInfo(prev => ({ ...prev, phone: e.target.value }))}
                  />
                  <Input
                    placeholder="Location"
                    value={personalInfo.location}
                    onChange={(e) => setPersonalInfo(prev => ({ ...prev, location: e.target.value }))}
                  />
                  <Input
                    placeholder="LinkedIn URL"
                    value={personalInfo.linkedin}
                    onChange={(e) => setPersonalInfo(prev => ({ ...prev, linkedin: e.target.value }))}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Sections */}
            {sections.map((section) => (
              <Card key={section.id}>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>{section.title}</CardTitle>
                  {section.items && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addSectionItem(section.id)}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Entry
                    </Button>
                  )}
                </CardHeader>
                <CardContent>
                  {section.items ? (
                    <div className="space-y-4">
                      {section.items.map((item, index) => (
                        <div key={index} className="space-y-4 p-4 border rounded-lg">
                          <Input
                            placeholder={`${section.title} Title`}
                            value={item.title}
                            onChange={(e) =>
                              setSections(prev =>
                                prev.map(s =>
                                  s.id === section.id
                                    ? {
                                        ...s,
                                        items: s.items?.map((i, idx) =>
                                          idx === index
                                            ? { ...i, title: e.target.value }
                                            : i
                                        )
                                      }
                                    : s
                                )
                              )
                            }
                          />
                          <Input
                            placeholder="Organization/Company"
                            value={item.subtitle}
                            onChange={(e) =>
                              setSections(prev =>
                                prev.map(s =>
                                  s.id === section.id
                                    ? {
                                        ...s,
                                        items: s.items?.map((i, idx) =>
                                          idx === index
                                            ? { ...i, subtitle: e.target.value }
                                            : i
                                        )
                                      }
                                    : s
                                )
                              )
                            }
                          />
                          <Input
                            placeholder="Date Range"
                            value={item.date}
                            onChange={(e) =>
                              setSections(prev =>
                                prev.map(s =>
                                  s.id === section.id
                                    ? {
                                        ...s,
                                        items: s.items?.map((i, idx) =>
                                          idx === index
                                            ? { ...i, date: e.target.value }
                                            : i
                                        )
                                      }
                                    : s
                                )
                              )
                            }
                          />
                          <Textarea
                            placeholder="Description"
                            value={item.description}
                            onChange={(e) =>
                              setSections(prev =>
                                prev.map(s =>
                                  s.id === section.id
                                    ? {
                                        ...s,
                                        items: s.items?.map((i, idx) =>
                                          idx === index
                                            ? { ...i, description: e.target.value }
                                            : i
                                        )
                                      }
                                    : s
                                )
                              )
                            }
                          />
                          {/* Bullet points */}
                          <div className="space-y-2">
                            {item.bullets.map((bullet, bulletIndex) => (
                              <Input
                                key={bulletIndex}
                                value={bullet}
                                placeholder="Bullet point"
                                onChange={(e) =>
                                  setSections(prev =>
                                    prev.map(s =>
                                      s.id === section.id
                                        ? {
                                            ...s,
                                            items: s.items?.map((i, idx) =>
                                              idx === index
                                                ? {
                                                    ...i,
                                                    bullets: i.bullets.map(
                                                      (b, bidx) =>
                                                        bidx === bulletIndex
                                                          ? e.target.value
                                                          : b
                                                    )
                                                  }
                                                : i
                                            )
                                          }
                                        : s
                                    )
                                  )
                                }
                              />
                            ))}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setSections(prev =>
                                  prev.map(s =>
                                    s.id === section.id
                                      ? {
                                          ...s,
                                          items: s.items?.map((i, idx) =>
                                            idx === index
                                              ? {
                                                  ...i,
                                                  bullets: [...i.bullets, ""]
                                                }
                                              : i
                                          )
                                        }
                                      : s
                                  )
                                )
                              }
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              Add Bullet Point
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <Textarea
                      value={section.content}
                      onChange={(e) =>
                        setSections(prev =>
                          prev.map(s =>
                            s.id === section.id
                              ? { ...s, content: e.target.value }
                              : s
                          )
                        )
                      }
                      placeholder={`Enter your ${section.title.toLowerCase()}...`}
                      className="min-h-[120px]"
                    />
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}