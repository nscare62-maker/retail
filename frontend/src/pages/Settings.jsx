import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Settings as SettingsIcon,
  User,
  UserPlus,
  Sliders,
  Package,
  TrendingUp,
  Save,
  CheckCircle2,
  LogOut,
  RotateCcw,
  ShieldCheck,
  Flame,
  ExternalLink
} from 'lucide-react';
import PageHeader from '../components/common/PageHeader';
import { authService } from '../services/authService';

export default function Settings({ onLogout }) {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(() => authService.getCurrentUser() || {});
  const [userEmail, setUserEmail] = useState(currentUser.email || 'san@gmail.com');
  const [userName, setUserName] = useState(currentUser.name || 'San');
  const [userRole, setUserRole] = useState(currentUser.role || 'Retail Planning Lead');
  const [authProvider, setAuthProvider] = useState(currentUser.provider || 'local');
  
  const [defaultHorizon, setDefaultHorizon] = useState('7');
  const [defaultServiceLevel, setDefaultServiceLevel] = useState('0.95');
  const [defaultLeadTime, setDefaultLeadTime] = useState('7');
  const [nonNegativeDemand, setNonNegativeDemand] = useState(true);
  const [autoCalendarFeatures, setAutoCalendarFeatures] = useState(true);
  const [stockoutAlertThreshold, setStockoutAlertThreshold] = useState('high');
  const [savedSuccess, setSavedSuccess] = useState(false);

  const isFirebase = authService.isConfigured();
  const projectInfo = authService.getProjectInfo();

  useEffect(() => {
    try {
      const u = authService.getCurrentUser();
      if (u) {
        setCurrentUser(u);
        if (u.email) setUserEmail(u.email);
        if (u.name) setUserName(u.name);
        if (u.role) setUserRole(u.role);
        if (u.provider) setAuthProvider(u.provider);
      }
      const savedPrefs = localStorage.getItem('retail_planner_settings');
      if (savedPrefs) {
        const p = JSON.parse(savedPrefs);
        if (p.defaultHorizon) setDefaultHorizon(p.defaultHorizon);
        if (p.defaultServiceLevel) setDefaultServiceLevel(p.defaultServiceLevel);
        if (p.defaultLeadTime) setDefaultLeadTime(p.defaultLeadTime);
        if (p.nonNegativeDemand !== undefined) setNonNegativeDemand(p.nonNegativeDemand);
        if (p.autoCalendarFeatures !== undefined) setAutoCalendarFeatures(p.autoCalendarFeatures);
        if (p.stockoutAlertThreshold) setStockoutAlertThreshold(p.stockoutAlertThreshold);
      }
    } catch {
      // Ignore parse errors
    }
  }, []);

  const handleSavePreferences = (e) => {
    e.preventDefault();
    const prefs = {
      defaultHorizon,
      defaultServiceLevel,
      defaultLeadTime,
      nonNegativeDemand,
      autoCalendarFeatures,
      stockoutAlertThreshold,
    };
    localStorage.setItem('retail_planner_settings', JSON.stringify(prefs));
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleResetDefaults = () => {
    setDefaultHorizon('7');
    setDefaultServiceLevel('0.95');
    setDefaultLeadTime('7');
    setNonNegativeDemand(true);
    setAutoCalendarFeatures(true);
    setStockoutAlertThreshold('high');
    localStorage.removeItem('retail_planner_settings');
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleSignOut = async () => {
    if (onLogout) {
      await onLogout();
    } else {
      await authService.signOut();
      window.location.href = '/login';
    }
  };

  return (
    <div>
      <PageHeader
        title="Application Settings & Planning Preferences"
        subtitle="Manage user session, multi-user accounts, default demand forecasting horizons, and inventory replenishment rules"
        actions={
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn-secondary" onClick={() => navigate('/register')}>
              <UserPlus size={14} />
              <span>Create Another Account</span>
            </button>
            <button className="btn-secondary" onClick={handleResetDefaults}>
              <RotateCcw size={14} />
              <span>Reset to Defaults</span>
            </button>
          </div>
        }
      />

      {savedSuccess && (
        <div
          style={{
            backgroundColor: '#DCFCE7',
            border: '1px solid #86EFAC',
            color: '#16803D',
            padding: '0.85rem 1.25rem',
            borderRadius: '8px',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            fontWeight: 600,
            fontSize: '0.9rem',
          }}
        >
          <CheckCircle2 size={18} />
          <span>Application and replenishment preferences saved successfully.</span>
        </div>
      )}

      {/* Top Row: User Account & Firebase Integration Info */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '1.5rem', marginBottom: '1.75rem' }}>
        {/* User Account Profile */}
        <div className="wine-card">
          <div className="wine-card-header">
            <h3 className="wine-card-title">
              <User size={18} style={{ color: 'var(--primary-wine)' }} />
              <span>Active Account Profile</span>
            </h3>
            <span className={`badge ${authProvider === 'firebase' ? 'badge-success' : 'badge-wine'}`}>
              {authProvider === 'firebase' ? 'Firebase Authenticated' : 'Multi-User Mode'}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.65rem 0', borderBottom: '1px solid var(--border-wine)' }}>
              <span style={{ color: 'var(--secondary-text)', fontSize: '0.88rem' }}>Planner Name</span>
              <strong style={{ color: 'var(--dark-wine)', fontSize: '0.88rem' }}>{userName}</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.65rem 0', borderBottom: '1px solid var(--border-wine)' }}>
              <span style={{ color: 'var(--secondary-text)', fontSize: '0.88rem' }}>Work Email</span>
              <strong style={{ color: 'var(--dark-wine)', fontSize: '0.88rem' }}>{userEmail}</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.65rem 0', borderBottom: '1px solid var(--border-wine)' }}>
              <span style={{ color: 'var(--secondary-text)', fontSize: '0.88rem' }}>Assigned Role</span>
              <span className="badge badge-wine">{userRole}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.65rem 0', borderBottom: '1px solid var(--border-wine)' }}>
              <span style={{ color: 'var(--secondary-text)', fontSize: '0.88rem' }}>Session State</span>
              <span className="badge badge-success">Active & Verified</span>
            </div>

            <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => navigate('/register')}
                className="btn-secondary"
                style={{ padding: '0.45rem 0.85rem', fontSize: '0.82rem' }}
              >
                <UserPlus size={14} />
                <span>Add / Switch Account</span>
              </button>

              <button
                type="button"
                onClick={handleSignOut}
                className="btn-secondary"
                style={{ color: 'var(--error)', borderColor: '#FCA5A5', padding: '0.45rem 0.85rem', fontSize: '0.82rem' }}
              >
                <LogOut size={14} />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>

        {/* Firebase Authentication Integration Guide */}
        <div className="wine-card">
          <div className="wine-card-header">
            <h3 className="wine-card-title">
              <Flame size={18} style={{ color: 'var(--gold-accent)' }} />
              <span>Firebase Cloud Authentication</span>
            </h3>
            <span className={`badge ${isFirebase ? 'badge-success' : 'badge-gold'}`}>
              {isFirebase ? 'Live Project Connected' : 'Configuration Ready'}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <p style={{ fontSize: '0.85rem', color: 'var(--secondary-text)', margin: 0, lineHeight: 1.5 }}>
              The application uses the official Firebase Web SDK (v11) to manage user identity and authentication across multiple users.
            </p>

            <div style={{ backgroundColor: 'var(--pale-wine-bg)', padding: '0.85rem 1rem', borderRadius: '8px', border: '1px solid var(--border-wine)' }}>
              <div style={{ fontWeight: 700, color: 'var(--dark-wine)', fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                Setup Steps in Firebase Console:
              </div>
              <ol style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.8rem', color: 'var(--primary-text)', lineHeight: 1.5 }}>
                <li>Go to <a href="https://console.firebase.google.com" target="_blank" rel="noreferrer" style={{ color: 'var(--primary-wine)', fontWeight: 600 }}>console.firebase.google.com</a> and create a project.</li>
                <li>In <strong>Build &gt; Authentication</strong>, click <em>Get Started</em> and enable <strong>Email/Password</strong>.</li>
                <li>In <strong>Project Settings &gt; General &gt; Your Apps</strong>, click the <strong>&lt;/&gt; Web icon</strong> to register a web app.</li>
                <li>Copy the configuration keys into <code>frontend/.env</code>.</li>
              </ol>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', paddingTop: '0.25rem' }}>
              <span style={{ color: 'var(--secondary-text)' }}>Active Firebase Project:</span>
              <strong style={{ color: isFirebase ? 'var(--success)' : 'var(--dark-wine)' }}>
                {isFirebase ? projectInfo.projectId : 'Using Local Multi-User Fallback'}
              </strong>
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSavePreferences}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '1.5rem', marginBottom: '1.75rem' }}>
          {/* Forecasting Preferences */}
          <div className="wine-card">
            <div className="wine-card-header">
              <h3 className="wine-card-title">
                <TrendingUp size={18} style={{ color: 'var(--primary-wine)' }} />
                <span>Forecasting Engine Preferences</span>
              </h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label className="input-label">Default Forecast Horizon</label>
                <select
                  className="select-field"
                  value={defaultHorizon}
                  onChange={(e) => setDefaultHorizon(e.target.value)}
                >
                  <option value="7">7 Days (Weekly replenishment cycle)</option>
                  <option value="14">14 Days (Bi-weekly tactical planning)</option>
                  <option value="30">30 Days (Monthly inventory projection)</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', cursor: 'pointer', fontSize: '0.88rem', color: 'var(--primary-text)' }}>
                  <input
                    type="checkbox"
                    checked={nonNegativeDemand}
                    onChange={(e) => setNonNegativeDemand(e.target.checked)}
                    style={{ width: '16px', height: '16px', accentColor: 'var(--primary-wine)', cursor: 'pointer' }}
                  />
                  <span>Enforce non-negative unit demand post-processing</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', cursor: 'pointer', fontSize: '0.88rem', color: 'var(--primary-text)' }}>
                  <input
                    type="checkbox"
                    checked={autoCalendarFeatures}
                    onChange={(e) => setAutoCalendarFeatures(e.target.checked)}
                    style={{ width: '16px', height: '16px', accentColor: 'var(--primary-wine)', cursor: 'pointer' }}
                  />
                  <span>Automatically extract seasonal calendar covariates during preprocessing</span>
                </label>
              </div>
            </div>
          </div>

          {/* Replenishment & Inventory Parameters */}
          <div className="wine-card">
            <div className="wine-card-header">
              <h3 className="wine-card-title">
                <Package size={18} style={{ color: 'var(--primary-wine)' }} />
                <span>Inventory & Replenishment Rules</span>
              </h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label className="input-label">Default Supplier Lead Time (Days)</label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  className="input-field"
                  value={defaultLeadTime}
                  onChange={(e) => setDefaultLeadTime(e.target.value)}
                />
                <p style={{ fontSize: '0.78rem', color: 'var(--secondary-text)', marginTop: '0.25rem' }}>
                  Standard delivery window between purchase order issuance and warehouse receipt.
                </p>
              </div>

              <div>
                <label className="input-label">Default Target Service Level</label>
                <select
                  className="select-field"
                  value={defaultServiceLevel}
                  onChange={(e) => setDefaultServiceLevel(e.target.value)}
                >
                  <option value="0.99">99.0% (Critical SKUs - High Safety Stock)</option>
                  <option value="0.95">95.0% (Balanced Standard Retail Service Level)</option>
                  <option value="0.90">90.0% (Cost-optimized / Low Holding Cost)</option>
                </select>
              </div>

              <div>
                <label className="input-label">Stockout Alert Sensitivity</label>
                <select
                  className="select-field"
                  value={stockoutAlertThreshold}
                  onChange={(e) => setStockoutAlertThreshold(e.target.value)}
                >
                  <option value="high">High Sensitivity (Alert when coverage &lt; 5 days)</option>
                  <option value="standard">Standard Sensitivity (Alert when coverage &lt; lead time)</option>
                  <option value="low">Low Sensitivity (Alert only on zero stock)</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Save Bar */}
        <div className="wine-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 600, color: 'var(--dark-wine)', fontSize: '0.95rem' }}>
              Planning Workflow Synchronization
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--secondary-text)', marginTop: '0.2rem' }}>
              Your saved defaults apply directly to new forecasting horizons, inventory calculations, and reports.
            </div>
          </div>

          <button type="submit" className="btn-primary" style={{ padding: '0.65rem 1.75rem' }}>
            <Save size={16} style={{ color: 'var(--gold-accent)' }} />
            <span>Save System Preferences</span>
          </button>
        </div>
      </form>
    </div>
  );
}
