import React from 'react';
import { Database, Plus, RefreshCw } from 'lucide-react';

export default function EmptyState({
  title = 'No Data Found',
  description = 'No records are currently available. Get started by uploading your custom retail sales dataset.',
  icon: Icon = Database,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
}) {
  return (
    <div
      className="wine-card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '4rem 2rem',
        textAlign: 'center',
        backgroundColor: '#FFFFFF',
      }}
    >
      <div
        style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          backgroundColor: 'var(--pale-wine-bg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '1.25rem',
          color: 'var(--primary-wine)',
          border: '1px solid var(--border-wine)',
        }}
      >
        <Icon size={30} />
      </div>

      <h3
        style={{
          fontSize: '1.25rem',
          fontWeight: 700,
          color: 'var(--dark-wine)',
          marginBottom: '0.4rem',
        }}
      >
        {title}
      </h3>

      <p
        style={{
          fontSize: '0.9rem',
          color: 'var(--secondary-text)',
          maxWidth: '460px',
          marginBottom: '1.5rem',
          lineHeight: 1.5,
        }}
      >
        {description}
      </p>

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        {actionLabel && onAction && (
          <button className="btn-primary" onClick={onAction}>
            <Plus size={16} />
            <span>{actionLabel}</span>
          </button>
        )}
        {secondaryActionLabel && onSecondaryAction && (
          <button className="btn-secondary" onClick={onSecondaryAction}>
            <span>{secondaryActionLabel}</span>
          </button>
        )}
      </div>
    </div>
  );
}
