import React, { useState } from 'react';

interface TopBarProps {
  title?: string;
  showSearch?: boolean;
  onSearchChange?: (value: string) => void;
  onMenuToggle?: () => void;
  sidebarOpen?: boolean;
  children?: React.ReactNode;
}

export const TopBar: React.FC<TopBarProps> = ({ 
  title, 
  showSearch = false, 
  onSearchChange,
  onMenuToggle,
  sidebarOpen = false,
  children 
}) => {
  const [searchValue, setSearchValue] = useState('');

  const handleSearchChange = (value: string) => {
    setSearchValue(value);
    onSearchChange?.(value);
  };

  return (
    <div className="h-16 bg-white shadow-sm flex items-center justify-between px-4 sm:px-6 sticky top-0 z-20">
      {/* Left Side - Menu Button (Mobile) + Title */}
      <div className="flex items-center gap-4 flex-1">
        {/* Hamburger Menu - Mobile Only */}
        <button 
          onClick={onMenuToggle}
          className="md:hidden flex items-center justify-center w-10 h-10 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <i className={`fa-solid ${sidebarOpen ? 'fa-xmark' : 'fa-bars'} text-xl text-gray-700`}></i>
        </button>

        {/* Title */}
        {title && <h2 className="text-lg sm:text-xl font-bold text-gray-800 truncate">{title}</h2>}
      </div>

      {/* Right Side - Search & Notifications */}
      <div className="flex items-center gap-2 sm:gap-4">
        {showSearch && (
          <div className="relative hidden sm:block">
            <input
              type="text"
              value={searchValue}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search..."
              className="bg-gray-100 rounded-full px-4 py-2 pl-10 focus:bg-white focus:ring-2 focus:ring-blue-400 outline-none transition-all duration-300 w-48 border border-transparent"
            />
            <i className="fa-solid fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
          </div>
        )}
        
        {children}

        {/* Notifications */}
        <button className="relative text-gray-500 hover:text-gray-700 p-2 flex-shrink-0">
          <i className="fa-solid fa-bell text-lg sm:text-xl"></i>
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>
      </div>
    </div>
  );
};

export default TopBar;
