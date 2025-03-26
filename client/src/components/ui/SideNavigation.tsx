
import React from 'react';
import { useLocation } from 'wouter';
import { Card } from './card';

export function SideNavigation() {
  const [location, setLocation] = useLocation();

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: '📊' },
    { name: 'Resume Builder', path: '/resume-builder', icon: '📝' },
    { name: 'Interview Prep', path: '/interview-prep', icon: '🎯' },
    { name: 'Job Matcher', path: '/job-matcher', icon: '🔍' },
    { name: 'AI Assistant', path: '/ai-assistant', icon: '🤖' },
  ];

  return (
    <div className="w-[220px] h-screen bg-[#1e2a3b] fixed left-0 top-0 flex flex-col">
      {/* App Logo */}
      <div className="p-5">
        <div className="flex items-center justify-between">
          <h1 className="text-white text-xl font-bold">Tweak AI</h1>
          <div className="w-4 h-4 rounded-full bg-[#4f8df9]" />
        </div>
      </div>

      {/* Navigation Items */}
      <div className="flex-1 px-4 py-6 space-y-2">
        {navItems.map((item) => (
          <button
            key={item.path}
            onClick={() => setLocation(item.path)}
            className={`w-full px-4 py-3 rounded-lg flex items-center gap-3 transition-colors ${
              location === item.path
                ? 'bg-[#4f8df9] text-white'
                : 'bg-[#2c3e50] text-white hover:bg-[#3c536a]'
            }`}
          >
            <span className="w-6 h-6 flex items-center justify-center bg-white/10 rounded">
              {item.icon}
            </span>
            <span>{item.name}</span>
          </button>
        ))}
      </div>

      {/* Profile & Settings */}
      <div className="p-4 flex flex-col items-center gap-2">
        <div className="w-12 h-12 rounded-full bg-[#3498db] flex items-center justify-center text-white">
          RS
        </div>
        <span className="text-white text-sm">Settings</span>
      </div>
    </div>
  );
}
