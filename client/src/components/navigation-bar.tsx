import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, FileEdit, FileText, Briefcase } from "lucide-react";

export default function NavigationBar() {
  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="mr-4 hidden md:flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <FileText className="h-6 w-6" />
            <span className="hidden font-bold sm:inline-block">
              Resume AI
            </span>
          </Link>
          <nav className="flex items-center space-x-6 text-sm font-medium">
            <Link href="/dashboard">
              <Button variant="ghost" className="flex items-center">
                <LayoutDashboard className="mr-2 h-4 w-4" />
                Dashboard
              </Button>
            </Link>
            <Link href="/builder">
              <Button variant="ghost" className="flex items-center">
                <FileEdit className="mr-2 h-4 w-4" />
                Resume Builder
              </Button>
            </Link>
            <Link href="/job-search">
              <Button variant="ghost" className="flex items-center">
                <Briefcase className="mr-2 h-4 w-4" />
                Job Search
              </Button>
            </Link>
          </nav>
        </div>
      </div>
    </nav>
  );
}