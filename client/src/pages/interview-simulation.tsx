
import { useState, useEffect } from "react";
import InterviewSimulation from "@/components/interview-simulation";
import { useLocation } from "wouter";

export default function InterviewSimulationPage() {
  const [location] = useLocation();
  const [interviewData, setInterviewData] = useState({
    type: "",
    role: "",
    level: ""
  });

  useEffect(() => {
    // Parse URL parameters to get interview data
    const params = new URLSearchParams(window.location.search);
    setInterviewData({
      type: params.get("type") || "",
      role: params.get("role") || "",
      level: params.get("level") || ""
    });
  }, [location]);

  return (
    <div className="min-h-screen bg-[#f5f7fa] p-6">
      <div className="max-w-[1200px] mx-auto">
        <InterviewSimulation 
          interviewType={interviewData.type}
          role={interviewData.role}
          experienceLevel={interviewData.level}
        />
      </div>
    </div>
  );
}
