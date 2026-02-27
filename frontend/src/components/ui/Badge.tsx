import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'green' | 'yellow' | 'red' | 'blue' | 'gray';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ 
  children, 
  variant = 'green',
  className = '' 
}) => {
  const variantClasses = {
    green: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 ring-1 ring-green-200 dark:ring-green-800',
    yellow: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 ring-1 ring-yellow-200 dark:ring-yellow-800',
    red: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 ring-1 ring-red-200 dark:ring-red-800',
    blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 ring-1 ring-blue-200 dark:ring-blue-800',
    gray: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100 ring-1 ring-gray-200 dark:ring-gray-600'
  };

  return (
    <span className={`px-3 py-1.5 text-xs font-bold rounded-full ${variantClasses[variant]} ${className} transition-all duration-200`}>
      {children}
    </span>
  );
};

export default Badge;
