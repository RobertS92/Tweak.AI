
import { Link, useLocation } from "wouter";
import { FileText, LayoutDashboard, FileEdit, Briefcase, User, LogOut, Settings, ArrowRightLeft } from 'lucide-react';
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";

export default function NavigationBar({ className }: { className?: string }) {
  const [location] = useLocation();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const { user, logoutMutation } = useAuth();
  
  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setShowProfileMenu(false);
    };
    
    if (showProfileMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => {
        document.removeEventListener('click', handleClickOutside);
      };
    }
  }, [showProfileMenu]);
  
  const isActive = (path: string) => {
    // Special case for root
    if (path === '/' && location === '/') return true;
    // For other paths, check if the location starts with the path
    if (path !== '/' && location.startsWith(path)) return true;
    return false;
  };

  const handleProfileClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowProfileMenu(!showProfileMenu);
  };
  
  const handleLogout = (e: React.MouseEvent) => {
    e.preventDefault();
    logoutMutation.mutate();
  };
  
  // Get user initials for profile icon
  const getInitials = () => {
    if (!user || !user.name) return user?.username?.substring(0, 2).toUpperCase() || "U";
    
    const names = user.name.split(' ');
    if (names.length === 1) return names[0].substring(0, 2).toUpperCase();
    return (names[0][0] + names[names.length - 1][0]).toUpperCase();
  };
  
  return (
    <nav className={cn("bg-[#1e2a3b] h-[60px]", className)}>
      <div className="container flex h-full items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-[#4f8df9]" />
            <span className="font-bold text-white">Tweak AI</span>
          </Link>
          <div className="flex items-center gap-6">
            <Link href="/dashboard" 
              className={`text-sm ${isActive('/dashboard') ? 'text-[#4f8df9]' : 'text-white hover:text-[#4f8df9]'} transition-colors`}>
              Dashboard
            </Link>
            <Link href="/builder" 
              className={`text-sm ${isActive('/builder') ? 'text-[#4f8df9]' : 'text-white hover:text-[#4f8df9]'} transition-colors`}>
              Resume Builder
            </Link>
            <Link href="/editor" 
              className={`text-sm ${isActive('/editor') ? 'text-[#4f8df9]' : 'text-white hover:text-[#4f8df9]'} transition-colors`}>
              Resume Tweaking
            </Link>
            <Link href="/interview-prep" 
              className={`text-sm ${isActive('/interview') ? 'text-[#4f8df9]' : 'text-white hover:text-[#4f8df9]'} transition-colors`}>
              Interview Prep
            </Link>
          </div>
        </div>
        <div className="flex items-center">
          {user ? (
            <div 
              className="w-10 h-10 rounded-full bg-[#3498db] flex items-center justify-center cursor-pointer relative"
              onClick={handleProfileClick}
            >
              <span className="text-white text-sm">{getInitials()}</span>
              
              {showProfileMenu && (
                <div className="absolute top-full right-0 mt-2 w-60 bg-white rounded-md shadow-lg py-2 z-50">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="text-sm font-semibold">{user.name || user.username}</p>
                    <p className="text-xs text-gray-500">{user.email}</p>
                  </div>
                  <Link href="/profile" className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    <User size={16} />
                    <span>Profile</span>
                  </Link>
                  <Link href="/settings" className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    <Settings size={16} />
                    <span>Settings</span>
                  </Link>
                  <div className="border-t border-gray-100 my-1"></div>
                  <a 
                    href="#" 
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                  >
                    <LogOut size={16} />
                    <span>{logoutMutation.isPending ? "Logging out..." : "Log out"}</span>
                  </a>
                </div>
              )}
            </div>
          ) : (
            <Link href="/auth" className="text-sm text-white hover:text-[#4f8df9] transition-colors">
              Login
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
