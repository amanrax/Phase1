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
    green: 'bg-green-100 text-green-800 ring-1 ring-green-200',
    yellow: 'bg-yellow-100 text-yellow-800 ring-1 ring-yellow-200',
    red: 'bg-red-100 text-red-800 ring-1 ring-red-200',
    blue: 'bg-blue-100 text-blue-800 ring-1 ring-blue-200',
    gray: 'bg-gray-100 text-gray-800 ring-1 ring-gray-200'
  };

  return (
    <span className={`px-3 py-1.5 text-xs font-bold rounded-full ${variantClasses[variant]} ${className} transition-all duration-200`}>
      {children}
    </span>
  );
};

export default Badge;
