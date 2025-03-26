
import { Link } from "wouter";
import { LayoutDashboard, FileEdit, FileText, Briefcase } from 'lucide-react';

export default function MobileNavigation({ className = "" }) {
  return (
    <nav className={`fixed bottom-0 left-0 right-0 bg-[#1e2a3b] border-t border-[#2c3e50] z-50 ${className}`}>
      <div className="container flex justify-around py-3">
        <Link href="/dashboard" className="flex flex-col items-center p-2 text-white hover:text-[#4f8df9] transition-colors">
          <LayoutDashboard className="h-5 w-5" />
          <span className="text-xs mt-1">Dashboard</span>
        </Link>
        <Link href="/builder" className="flex flex-col items-center p-2 text-[#4f8df9]">
          <FileText className="h-5 w-5" />
          <span className="text-xs mt-1">Build</span>
        </Link>
        <Link href="/interview-prep" className="flex flex-col items-center p-2 text-white hover:text-[#4f8df9] transition-colors">
          <Briefcase className="h-5 w-5" />
          <span className="text-xs mt-1">Interview</span>
        </Link>
        <Link href="/ai-assistant" className="flex flex-col items-center p-2 text-white hover:text-[#4f8df9] transition-colors">
          <FileEdit className="h-5 w-5" />
          <span className="text-xs mt-1">AI Chat</span>
        </Link>
      </div>
    </nav>
  );
}
