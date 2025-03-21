
import { Link } from "wouter";
import { LayoutDashboard, FileEdit, FileText, Briefcase } from 'lucide-react';

export default function MobileNavigation() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t shadow-lg md:hidden z-50">
      <div className="container flex justify-around py-3">
        <Link href="/dashboard" className="flex flex-col items-center p-2 text-muted-foreground hover:text-foreground">
          <LayoutDashboard className="h-5 w-5" />
          <span className="text-xs mt-1">Dashboard</span>
        </Link>
        <Link href="/editor/new" className="flex flex-col items-center p-2 text-muted-foreground hover:text-foreground">
          <FileEdit className="h-5 w-5" />
          <span className="text-xs mt-1">Tweak</span>
        </Link>
        <Link href="/builder" className="flex flex-col items-center p-2 text-muted-foreground hover:text-foreground">
          <FileText className="h-5 w-5" />
          <span className="text-xs mt-1">Build</span>
        </Link>
        <Link href="/interview-prep" className="flex flex-col items-center p-2 text-muted-foreground hover:text-foreground">
          <Briefcase className="h-5 w-5" />
          <span className="text-xs mt-1">Prepare</span>
        </Link>
      </div>
    </nav>
  );
}
