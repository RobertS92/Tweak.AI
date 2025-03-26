
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FileText, LayoutDashboard, FileEdit, Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";

export default function NavigationBar({ className }: { className?: string }) {
  return (
    <nav className={cn("border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60", className)}>
      <div className="container flex h-14 items-center">
        <div className="flex w-full">
          <Link href="/" className="mr-6 flex items-center space-x-2 hover:opacity-80 transition-opacity">
            <FileText className="h-6 w-6" />
            <span className="font-bold">
              Tweak AI
            </span>
          </Link>
          <nav className="flex items-center space-x-4 text-sm font-medium">
            <Link href="/dashboard">
              <Button 
                variant="ghost" 
                className="flex items-center hover:bg-accent hover:text-accent-foreground transition-colors data-[selected=true]:bg-accent"
                data-selected={window.location.pathname === '/dashboard'}
              >
                <LayoutDashboard className="mr-2 h-4 w-4" />
                Dashboard
              </Button>
            </Link>
            <Link href="/editor/new">
              <Button 
                variant="ghost" 
                className="flex items-center hover:bg-accent hover:text-accent-foreground transition-colors data-[selected=true]:bg-accent"
                data-selected={window.location.pathname.startsWith('/editor')}
              >
                <FileEdit className="mr-2 h-4 w-4" />
                Tweak
              </Button>
            </Link>
            <Link href="/builder">
              <Button 
                variant="ghost" 
                className="flex items-center hover:bg-accent hover:text-accent-foreground transition-colors data-[selected=true]:bg-accent"
                data-selected={window.location.pathname === '/builder'}
              >
                <FileText className="mr-2 h-4 w-4" />
                Build
              </Button>
            </Link>
            <Link href="/interview-prep">
              <Button 
                variant="ghost" 
                className="flex items-center hover:bg-accent hover:text-accent-foreground transition-colors data-[selected=true]:bg-accent"
                data-selected={window.location.pathname === '/interview-prep'}
              >
                <Briefcase className="mr-2 h-4 w-4" />
                Prep
              </Button>
            </Link>
          </nav>
        </div>
      </div>
    </nav>
  );
}
