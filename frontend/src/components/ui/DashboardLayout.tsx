import React, { useState } from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

interface NavItem {
  path: string;
  label: string;
  icon: string;
}

interface NavGroup {
  title: string;
  items: NavItem[];
  roles?: string[];
}

interface DashboardLayoutProps {
  children: React.ReactNode;
  navGroups: NavGroup[];
  pageTitle?: string;
  showSearch?: boolean;
  onSearchChange?: (value: string) => void;
  topBarActions?: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  navGroups,
  pageTitle,
  showSearch,
  onSearchChange,
  topBarActions
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Hidden on mobile, always visible on md+ */}
      <div className={`fixed md:static left-0 top-0 h-screen z-40 transition-transform duration-300 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      }`}>
        <Sidebar navGroups={navGroups} onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Main Content Area - Full width on mobile, with margin on desktop */}
      <div className="flex-1 flex flex-col w-full md:w-auto">
        {/* Top Bar with Mobile Menu Toggle */}
        <TopBar 
          title={pageTitle} 
          showSearch={showSearch}
          onSearchChange={onSearchChange}
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
          sidebarOpen={sidebarOpen}
        >
          {topBarActions}
        </TopBar>

        {/* Page Content - Properly padded and scrollable */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6 fade-in">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardLayout;
