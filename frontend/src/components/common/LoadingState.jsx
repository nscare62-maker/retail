import React from 'react';
import { RefreshCw } from 'lucide-react';

export default function LoadingState({ message = 'Loading analytics data...' }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '4rem 2rem',
        width: '100%',
        color: 'var(--secondary-text)',
      }}
    >
      <div
        style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          backgroundColor: 'var(--pale-wine-bg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '1rem',
          border: '1px solid var(--border-wine)',
        }}
      >
        <RefreshCw size={26} className="spinner" style={{ color: 'var(--primary-wine)' }} />
      </div>
      <p style={{ fontWeight: 600, color: 'var(--dark-wine)', fontSize: '1rem' }}>{message}</p>
      <p style={{ fontSize: '0.82rem', marginTop: '0.25rem' }}>Communicating with forecasting engine</p>
    </div>
  );
}
