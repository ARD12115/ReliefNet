import React from 'react';

const StatCard = ({ title, value, subtitle, Icon, color, trend }) => {
  const trendConfigs = {
    success: { text: 'text-primary-600', bg: 'bg-primary-50' },
    danger: { text: 'text-danger-600', bg: 'bg-danger-50' },
    neutral: { text: 'text-ink-500', bg: 'bg-ink-50' },
  };
  const trendStyle = trendConfigs[trend || 'neutral'];

  return (
    <div className="stat-card">
      <div className="flex items-start justify-between">
        <div>
          <p className="stat-label">{title}</p>
          <p className="stat-value">{value}</p>
          {subtitle && <p className="text-sm text-ink-500 mt-1">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-xl ${color}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
      {trend && (
        <div className={`mt-3 flex items-center gap-1 text-xs font-medium ${trendStyle.text}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${trendStyle.bg === 'bg-primary-50' ? 'bg-primary-600' : trendStyle.bg === 'bg-danger-50' ? 'bg-danger-600' : 'bg-ink-500'}`} />
          {trend === 'success' ? 'Stable' : trend === 'danger' ? 'Attention needed' : '—'}
        </div>
      )}
    </div>
  );
};

export default StatCard;
