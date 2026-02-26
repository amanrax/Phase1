import React from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: string;
  borderColor?: 'green' | 'orange' | 'blue' | 'purple';
  trend?: string;
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  icon,
  borderColor: _borderColor = 'green', // kept for API compatibility
  trend,
  onClick,
}) => {
  const cursorClass = onClick ? 'cursor-pointer' : '';

  return (
    <div 
      className={`bg-gradient-to-br from-purple-600 to-indigo-600 dark:from-purple-800 dark:to-indigo-900 text-white p-7 rounded-xl shadow-lg hover:shadow-xl ring-1 ring-white/10 dark:ring-white/5 transition-all duration-300 hover:-translate-y-1 ${cursorClass}`}
      onClick={onClick}
    >
      <div className="text-center">
        <div className="text-4xl font-bold mb-1">{value}</div>
        <div className="text-sm opacity-90 uppercase tracking-wide font-medium">{label}</div>
      </div>
      {icon && (
        <div className="text-center mt-3 opacity-80">
          <i className={`${icon} text-2xl`}></i>
        </div>
      )}
      {trend && (
        <div className="mt-3 text-center text-xs opacity-90 font-medium">
          <i className="fa-solid fa-arrow-trend-up mr-1"></i> {trend}
        </div>
      )}
    </div>
  );
};

export default StatCard;
