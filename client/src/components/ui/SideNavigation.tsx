
import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export function SideNavigation() {
  const [location, setLocation] = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: '📊' },
    { name: 'Build', path: '/resume-builder', icon: '📝' },
    { name: 'Prep', path: '/interview-prep', icon: '🎯' },
    { name: 'Tweak', path: '/job-matcher', icon: '🔍' },
  ];

  const toggleSidebar = () => {
    setCollapsed(!collapsed);
  };

  return (
    <div 
      className={`${collapsed ? 'w-[60px]' : 'w-[220px]'} h-screen bg-[#1e2a3b] fixed left-0 top-0 flex flex-col transition-all duration-300`}
    >
      {/* App Logo */}
      <div className="p-5 flex items-center justify-between">
        {!collapsed && <h1 className="text-white text-xl font-bold">Tweak AI</h1>}
        <button 
          onClick={toggleSidebar}
          className="text-white hover:bg-[#2c3e50] p-2 rounded-full"
        >
          {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>

      {/* Navigation Items */}
      <div className="flex-1 mt-5">
        {navItems.map((item) => (
          <button
            key={item.path}
            onClick={() => setLocation(item.path)}
            className={`w-full text-left px-5 py-3 flex items-center ${
              location === item.path ? 'bg-[#4f8df9]' : 'hover:bg-[#2c3e50]'
            }`}
          >
            <span className="text-xl">{item.icon}</span>
            {!collapsed && <span className="text-white ml-3">{item.name}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}
