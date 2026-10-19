import React from 'react';

interface MetricCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  status?: 'nominal' | 'warning' | 'critical' | 'neutral';
  icon?: React.ReactNode;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  subValue,
  status = 'neutral',
  icon,
}) => {
  const statusColors = {
    nominal: 'text-[#1E6B58] border-[#25856B]/30',
    warning: 'text-[#93691F] border-[#D9A441]/30',
    critical: 'text-[#B33E3E] border-[#D95757]/30',
    neutral: 'text-[#4A6176] border-[#E1EAF3]',
  };

  return (
    <div className={`p-4 rounded border bg-[#FFFFFF] relative overflow-hidden transition-all duration-150 hover:border-[#2677C9]/40 ${statusColors[status]}`}>
      <div className="flex items-center justify-between text-xs font-mono uppercase tracking-wider text-[#718096] mb-2">
        <span>{label}</span>
        {icon && <span className="text-[#4A6176]">{icon}</span>}
      </div>
      <div className="text-2xl font-semibold tracking-tight text-[#17324D] font-mono">
        {value}
      </div>
      {subValue && (
        <div className="mt-1 text-xs text-[#718096] font-mono truncate">
          {subValue}
        </div>
      )}
    </div>
  );
};
