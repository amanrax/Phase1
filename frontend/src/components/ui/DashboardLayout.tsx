import React from 'react';
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
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sidebar */}
      <Sidebar navGroups={navGroups} />

      {/* Main Content Area */}
      <div className="ml-64">
        {/* Top Bar */}
        <TopBar 
          title={pageTitle} 
          showSearch={showSearch}
          onSearchChange={onSearchChange}
        >
          {topBarActions}
        </TopBar>

        {/* Page Content */}
        <div className="pt-16">
          <div className="p-6 fade-in">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardLayout;
