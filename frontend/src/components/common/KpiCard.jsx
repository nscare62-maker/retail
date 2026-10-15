import React from 'react';

export default function KpiCard({ title, value, subtext, icon: Icon, badge, color = 'wine' }) {
  return (
    <div className="kpi-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div className="kpi-icon-wrap">
          {Icon && <Icon size={22} />}
        </div>
        {badge && (
          <span className={`badge ${badge.type ? `badge-${badge.type}` : 'badge-gold'}`}>
            {badge.text}
          </span>
        )}
      </div>

      <div className="kpi-value">{value}</div>
      <div className="kpi-label">{title}</div>
      {subtext && <div className="kpi-subtext">{subtext}</div>}
    </div>
  );
}
