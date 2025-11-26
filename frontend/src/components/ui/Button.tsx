import React from 'react';

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger';
  icon?: string;
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  className?: string;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  icon,
  children,
  onClick,
  type = 'button',
  disabled,
  className = '',
  fullWidth = false,
}) => {
  const baseClass = "font-semibold py-3 px-5 rounded-lg transition-all duration-300 inline-flex items-center justify-center gap-2";
  const variantClass = {
    primary: "bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg hover:-translate-y-0.5",
    secondary: "bg-gray-500 hover:bg-gray-600 text-white shadow-md hover:shadow-lg",
    danger: "bg-red-600 hover:bg-red-700 text-white shadow-md hover:shadow-lg"
  }[variant];
  
  const widthClass = fullWidth ? "w-full" : "";
  const disabledClass = disabled ? 'opacity-50 cursor-not-allowed' : '';
  
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseClass} ${variantClass} ${widthClass} ${disabledClass} ${className}`}
    >
      {icon && <i className={`${icon} mr-2`}></i>}
      {children}
    </button>
  );
};

export default Button;
