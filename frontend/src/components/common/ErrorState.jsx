import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default function ErrorState({ title = 'Operation Failed', message, onRetry }) {
  return (
    <div
      className="wine-card"
      style={{
        borderLeft: '5px solid var(--error)',
        padding: '1.5rem',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '1rem',
        backgroundColor: '#FFFBFB',
      }}
    >
      <div
        style={{
          width: '38px',
          height: '38px',
          borderRadius: '50%',
          backgroundColor: 'var(--error-bg)',
          color: 'var(--error)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <AlertCircle size={20} />
      </div>

      <div style={{ flex: 1 }}>
        <h4 style={{ color: 'var(--error)', fontWeight: 700, fontSize: '1rem' }}>{title}</h4>
        <p style={{ color: 'var(--primary-text)', fontSize: '0.88rem', marginTop: '0.25rem', lineHeight: 1.4 }}>
          {message || 'An unexpected error occurred while communicating with the retail forecasting engine.'}
        </p>

        {onRetry && (
          <button
            className="btn-secondary"
            onClick={onRetry}
            style={{ marginTop: '0.85rem', padding: '0.4rem 0.85rem', fontSize: '0.8rem' }}
          >
            <RefreshCw size={13} />
            <span>Try Again</span>
          </button>
        )}
      </div>
    </div>
  );
}
