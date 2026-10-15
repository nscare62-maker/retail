import React from 'react';

export default function PageHeader({ title, subtitle, actions }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '1.75rem',
        flexWrap: 'wrap',
        gap: '1rem',
      }}
    >
      <div>
        <h2
          style={{
            fontSize: '1.65rem',
            fontWeight: 700,
            color: 'var(--dark-wine)',
            letterSpacing: '-0.02em',
          }}
        >
          {title}
        </h2>
        {subtitle && (
          <p
            style={{
              fontSize: '0.92rem',
              color: 'var(--secondary-text)',
              marginTop: '0.25rem',
            }}
          >
            {subtitle}
          </p>
        )}
      </div>

      {actions && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {actions}
        </div>
      )}
    </div>
  );
}
