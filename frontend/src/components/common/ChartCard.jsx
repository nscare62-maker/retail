import React from 'react';

export default function ChartCard({ title, subtitle, headerAction, children, style }) {
  return (
    <div className="wine-card" style={{ display: 'flex', flexDirection: 'column', ...style }}>
      {(title || headerAction) && (
        <div className="wine-card-header">
          <div>
            {title && <h3 className="wine-card-title">{title}</h3>}
            {subtitle && <p className="wine-card-subtitle">{subtitle}</p>}
          </div>
          {headerAction && <div>{headerAction}</div>}
        </div>
      )}
      <div style={{ flex: 1, minHeight: '320px', width: '100%', position: 'relative' }}>
        {children}
      </div>
    </div>
  );
}
