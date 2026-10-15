import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Sparkles, UploadCloud, TrendingUp, Bell, CheckCircle2, AlertCircle, LogOut } from 'lucide-react';
import { apiService } from '../../services/api';

const routeNames = {
  '/': 'Executive Dashboard',
  '/datasets': 'Dataset Management & Validation',
  '/preprocessing': 'Data Preprocessing & Splitting',
  '/training': 'Temporal Fusion Transformer Training',
  '/forecasting': 'Demand Forecasting Studio',
  '/evaluation': 'Model Evaluation & Residual Analysis',
  '/inventory': 'Inventory Planning & Recommendations',
  '/models': 'Trained Model Checkpoints',
  '/reports': 'Analytics & Reports Export',
  '/settings': 'Application Settings & Preferences',
};

export default function Topbar({ user, onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [backendStatus, setBackendStatus] = useState('checking'); // 'healthy', 'offline', 'checking'

  const checkHealth = async () => {
    try {
      await apiService.getHealth();
      setBackendStatus('healthy');
    } catch {
      setBackendStatus('offline');
    }
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const currentTitle = routeNames[location.pathname] || 'Retail Demand Intelligence';

  return (
    <header
      style={{
        height: '68px',
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid var(--border-wine)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 2rem',
        position: 'sticky',
        top: 0,
        zIndex: 40,
        boxShadow: '0 2px 8px rgba(74, 23, 32, 0.03)',
      }}
    >
      {/* Title & Breadcrumbs */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--secondary-text)' }}>
          <span>Platform</span>
          <span>/</span>
          <span style={{ color: 'var(--primary-wine)', fontWeight: 600 }}>{currentTitle}</span>
        </div>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--dark-wine)', marginTop: '2px' }}>
          {currentTitle}
        </h1>
      </div>

      {/* Right Controls & Quick Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {/* Backend Status Badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.35rem 0.75rem',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            fontWeight: 600,
            backgroundColor: backendStatus === 'healthy' ? '#DCFCE7' : backendStatus === 'offline' ? '#FEE2E2' : '#F5F5F4',
            color: backendStatus === 'healthy' ? '#16803D' : backendStatus === 'offline' ? '#DC2626' : '#78716C',
            border: `1px solid ${backendStatus === 'healthy' ? '#86EFAC' : backendStatus === 'offline' ? '#FCA5A5' : '#E7E5E4'}`,
          }}
          title={backendStatus === 'healthy' ? 'FastAPI Backend Online' : 'Cannot reach backend at 127.0.0.1:8000'}
        >
          {backendStatus === 'healthy' ? (
            <CheckCircle2 size={13} />
          ) : (
            <AlertCircle size={13} />
          )}
          <span>{backendStatus === 'healthy' ? 'API Online' : backendStatus === 'offline' ? 'API Offline' : 'Connecting...'}</span>
        </div>

        {/* Upload Dataset Quick Link */}
        <button
          className="btn-secondary"
          onClick={() => navigate('/datasets')}
          style={{ padding: '0.5rem 0.9rem', fontSize: '0.82rem' }}
          title="Upload custom retail sales CSV dataset"
        >
          <UploadCloud size={14} style={{ color: 'var(--primary-wine)' }} />
          <span>Upload Dataset</span>
        </button>

        {/* Generate Forecast CTA */}
        <button
          className="btn-primary"
          onClick={() => navigate('/forecasting')}
          style={{ padding: '0.5rem 1rem', fontSize: '0.82rem' }}
        >
          <TrendingUp size={14} style={{ color: 'var(--gold-accent)' }} />
          <span>Generate Forecast</span>
        </button>

        {/* User Pill & Logout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.35rem 0.65rem',
              borderRadius: '9999px',
              backgroundColor: 'var(--pale-wine-bg)',
              border: '1px solid var(--border-wine)',
            }}
          >
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                backgroundColor: 'var(--primary-wine)',
                color: 'var(--gold-accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '0.75rem',
                border: '1px solid var(--gold-accent)',
              }}
            >
              {user?.name ? user.name.slice(0, 2).toUpperCase() : 'SN'}
            </div>
            <span
              style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--dark-wine)' }}
              title={user?.email || 'san@gmail.com'}
            >
              {user?.name || user?.email || 'San'}
            </span>
          </div>

          {onLogout && (
            <button
              onClick={onLogout}
              className="btn-secondary"
              style={{
                padding: '0.45rem',
                borderRadius: '8px',
                color: 'var(--error)',
                borderColor: '#FCA5A5',
              }}
              title="Sign Out"
            >
              <LogOut size={15} />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
