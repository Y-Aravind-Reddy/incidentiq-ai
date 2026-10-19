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
    nominal: 'text-[#4F6555] border-[#718777]/30',
    warning: 'text-[#8A6030] border-[#D4A15D]/30',
    critical: 'text-[#A73832] border-[#C74F46]/30',
    neutral: 'text-[#655D51] border-[#D4C1A1]',
  };

  return (
    <div className={`p-4 rounded border bg-[#FAF6EE] relative overflow-hidden transition-all duration-150 hover:border-[#B86B43]/40 ${statusColors[status]}`}>
      <div className="flex items-center justify-between text-xs font-mono uppercase tracking-wider text-[#756B5D] mb-2">
        <span>{label}</span>
        {icon && <span className="text-[#655D51]">{icon}</span>}
      </div>
      <div className="text-2xl font-semibold tracking-tight text-[#332B20] font-mono">
        {value}
      </div>
      {subValue && (
        <div className="mt-1 text-xs text-[#756B5D] font-mono truncate">
          {subValue}
        </div>
      )}
    </div>
  );
};
