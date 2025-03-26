
import { Link } from "wouter";
import { FileText, LayoutDashboard, FileEdit, Briefcase } from 'lucide-react';
import { cn } from "@/lib/utils";

export default function NavigationBar({ className }: { className?: string }) {
  return (
    <nav className={cn("bg-[#1e2a3b] h-[60px]", className)}>
      <div className="container flex h-full items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-[#4f8df9]" />
            <span className="font-bold text-white">Tweak AI</span>
          </Link>
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="text-sm text-white hover:text-[#4f8df9] transition-colors">
              Dashboard
            </Link>
            <Link href="/builder" className="text-sm text-[#4f8df9]">
              Resume Builder
            </Link>
            <Link href="/interview-prep" className="text-sm text-white hover:text-[#4f8df9] transition-colors">
              Interview Prep
            </Link>
            <Link href="/job-matcher" className="text-sm text-white hover:text-[#4f8df9] transition-colors">
              Job Matcher
            </Link>
            <Link href="/ai-assistant" className="text-sm text-white hover:text-[#4f8df9] transition-colors">
              AI Assistant
            </Link>
          </div>
        </div>
        <div className="flex items-center">
          <div className="w-10 h-10 rounded-full bg-[#3498db] flex items-center justify-center">
            <span className="text-white text-sm">RS</span>
          </div>
        </div>
      </div>
    </nav>
  );
}
