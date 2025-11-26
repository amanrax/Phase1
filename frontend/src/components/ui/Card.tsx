import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  noPadding?: boolean;
}

export const Card: React.FC<CardProps> = ({ 
  children, 
  className = '', 
  onClick,
  noPadding = false
}) => {
  const paddingClass = noPadding ? '' : 'p-8';
  const cursorClass = onClick ? 'cursor-pointer' : '';
  
  return (
    <div 
      className={`bg-white ${paddingClass} rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 ${cursorClass} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
};

export default Card;
