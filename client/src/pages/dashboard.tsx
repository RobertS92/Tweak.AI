import React from "react";

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-[#f5f7fa]">
      {/* Top Bar */}
      <div className="w-full h-[70px] bg-white border-b border-[#e6e9ed] flex items-center px-8">
        <h1 className="text-2xl font-bold text-[#2c3e50]">Resume Dashboard</h1>
        <p className="ml-4 text-sm text-[#7f8c8d]">Manage and optimize your resumes</p>
      </div>

      {/* Main Content */}
      <div className="p-8">
        {/* Upload Button */}
        <button className="bg-[#4f8df9] text-white px-6 py-2 rounded-full">
          Upload Resume
        </button>
      </div>
    </div>
  );
}