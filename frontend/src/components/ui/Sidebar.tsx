import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import useAuthStore from '../../store/authStore';

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

interface SidebarProps {
  navGroups: NavGroup[];
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ navGroups, onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleNavClick = (path: string) => {
    navigate(path);
    onClose?.();
  };

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  // Filter nav groups by user role
  const filteredGroups = navGroups.filter(group => {
    if (!group.roles) return true;
    return group.roles.includes(user?.role || '');
  });

  return (
    <div className="w-64 h-screen bg-gradient-to-b from-gray-900 to-gray-800 flex flex-col shadow-2xl">
      {/* Logo Area */}
      <div className="bg-gradient-to-r from-purple-700 to-blue-600 h-16 flex items-center justify-center border-b border-purple-800 shadow-lg flex-shrink-0">
        <div className="text-center">
          <i className="fa-solid fa-wheat-awn text-white text-2xl drop-shadow-lg"></i>
          <h1 className="text-white font-bold text-lg mt-1 drop-shadow-lg">ZIAMIS Pro</h1>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto">
        <div className="py-4">
          {filteredGroups.map((group, groupIndex) => (
            <div key={groupIndex}>
              {group.title && (
                <div className="px-4 mt-6 mb-2 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  {group.title}
                </div>
              )}
              {group.items.map((item) => (
                <button
                  key={item.path}
                  onClick={() => handleNavClick(item.path)}
                  className={`w-full flex items-center px-4 py-3 text-gray-300 hover:bg-gradient-to-r hover:from-purple-800 hover:to-blue-700 hover:text-white transition-all duration-300 cursor-pointer border-l-4 font-medium text-sm ${
                    isActive(item.path)
                      ? 'bg-gradient-to-r from-purple-700 to-blue-600 text-white border-blue-400 shadow-lg'
                      : 'border-transparent'
                  }`}
                >
                  <i className={`${item.icon} w-5 text-center flex-shrink-0`}></i>
                  <span className="ml-3">{item.label}</span>
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* User Info & Logout */}
      <div className="border-t border-gray-700 p-4 bg-gray-900 flex-shrink-0">
        <div className="flex items-center mb-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-500 rounded-full flex items-center justify-center text-white font-bold shadow-md flex-shrink-0">
            {user?.full_name?.charAt(0) || 'U'}
          </div>
          <div className="ml-3 flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">{user?.full_name || 'User'}</p>
            <p className="text-gray-400 text-xs truncate">{user?.role || 'Role'}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-all duration-300 font-medium text-sm shadow-md hover:shadow-lg hover:-translate-y-0.5"
        >
          <i className="fa-solid fa-right-from-bracket mr-2"></i>
          Logout
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
