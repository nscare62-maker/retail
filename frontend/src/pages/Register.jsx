import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, Mail, User, Briefcase, Eye, EyeOff, ArrowRight, ShieldCheck, AlertCircle, CheckCircle2 } from 'lucide-react';
import logoImg from '../assets/retail-demand-intelligence-logo.png';
import { authService } from '../services/authService';

export default function Register({ onLoginSuccess }) {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('Retail Demand Planner');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const isFirebase = authService.isConfigured();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!name.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }
    if (!email.trim()) {
      setErrorMessage('Please enter your work email address.');
      return;
    }
    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please re-enter.');
      return;
    }

    setLoading(true);
    try {
      const user = await authService.signUp(email, password, name.trim(), role);
      setSuccessMessage('Account created successfully! Redirecting...');
      setTimeout(() => {
        if (onLoginSuccess) {
          onLoginSuccess(user);
        }
        navigate('/', { replace: true });
      }, 600);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to create account. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        backgroundColor: '#4A1720',
        backgroundImage:
          'radial-gradient(circle at 50% 20%, rgba(114, 47, 55, 0.7) 0%, rgba(74, 23, 32, 0.95) 50%, #29080F 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1.5rem',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Decorative ambient elements */}
      <div
        style={{
          position: 'absolute',
          top: '-10%',
          right: '-10%',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(201, 162, 39, 0.15) 0%, rgba(201, 162, 39, 0) 70%)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '-15%',
          left: '-10%',
          width: '600px',
          height: '600px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(166, 77, 96, 0.2) 0%, rgba(74, 23, 32, 0) 70%)',
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          width: '100%',
          maxWidth: '480px',
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(201, 162, 39, 0.3)',
          overflow: 'hidden',
          position: 'relative',
          zIndex: 10,
        }}
      >
        {/* Top Gold Border Accent */}
        <div style={{ height: '4px', background: 'linear-gradient(90deg, #722F37 0%, #C9A227 50%, #722F37 100%)' }} />

        <div style={{ padding: '2.25rem 2rem 2rem 2rem' }}>
          {/* Logo and Brand Title */}
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <div
              style={{
                width: '58px',
                height: '58px',
                margin: '0 auto 0.75rem auto',
                borderRadius: '12px',
                backgroundColor: '#FFFFFF',
                padding: '3px',
                border: '2px solid var(--gold-accent)',
                boxShadow: '0 4px 14px rgba(74, 23, 32, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <img
                src={logoImg}
                alt="Retail Demand Intelligence"
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            </div>

            <h1
              style={{
                fontSize: '1.35rem',
                fontWeight: 800,
                color: 'var(--dark-wine)',
                letterSpacing: '-0.02em',
                marginBottom: '0.25rem',
              }}
            >
              Create Planner Account
            </h1>
            <p style={{ fontSize: '0.82rem', color: 'var(--secondary-text)', margin: 0 }}>
              Join the Retail Demand Intelligence forecasting workspace
            </p>
          </div>

          {/* Error & Success Messages */}
          {errorMessage && (
            <div
              style={{
                backgroundColor: '#FEE2E2',
                border: '1px solid #FCA5A5',
                color: '#DC2626',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                marginBottom: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
                fontSize: '0.85rem',
              }}
            >
              <AlertCircle size={17} style={{ flexShrink: 0 }} />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div
              style={{
                backgroundColor: '#DCFCE7',
                border: '1px solid #86EFAC',
                color: '#16803D',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                marginBottom: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
                fontSize: '0.85rem',
                fontWeight: 600,
              }}
            >
              <CheckCircle2 size={17} style={{ flexShrink: 0 }} />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Sign Up Form */}
          <form onSubmit={handleSubmit}>
            {/* Full Name */}
            <div style={{ marginBottom: '1rem' }}>
              <label className="input-label" style={{ fontSize: '0.82rem' }}>Full Name</label>
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--secondary-text)', pointerEvents: 'none', display: 'flex' }}>
                  <User size={16} />
                </div>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Sarah Jenkins"
                  autoComplete="name"
                  required
                  style={{
                    width: '100%',
                    padding: '0.7rem 0.85rem 0.7rem 2.5rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-wine)',
                    backgroundColor: '#FAF7F7',
                    fontSize: '0.9rem',
                    color: 'var(--primary-text)',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            {/* Email */}
            <div style={{ marginBottom: '1rem' }}>
              <label className="input-label" style={{ fontSize: '0.82rem' }}>Work Email Address</label>
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--secondary-text)', pointerEvents: 'none', display: 'flex' }}>
                  <Mail size={16} />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  autoComplete="email"
                  required
                  style={{
                    width: '100%',
                    padding: '0.7rem 0.85rem 0.7rem 2.5rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-wine)',
                    backgroundColor: '#FAF7F7',
                    fontSize: '0.9rem',
                    color: 'var(--primary-text)',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            {/* Role / Title */}
            <div style={{ marginBottom: '1rem' }}>
              <label className="input-label" style={{ fontSize: '0.82rem' }}>Role / Department</label>
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--secondary-text)', pointerEvents: 'none', display: 'flex' }}>
                  <Briefcase size={16} />
                </div>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.7rem 0.85rem 0.7rem 2.5rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-wine)',
                    backgroundColor: '#FAF7F7',
                    fontSize: '0.9rem',
                    color: 'var(--primary-text)',
                    outline: 'none',
                  }}
                >
                  <option value="Retail Demand Planner">Retail Demand Planner</option>
                  <option value="Merchandise Planning Lead">Merchandise Planning Lead</option>
                  <option value="Inventory & Supply Chain Manager">Inventory & Supply Chain Manager</option>
                  <option value="Store Operations Director">Store Operations Director</option>
                  <option value="Retail Data Analyst">Retail Data Analyst</option>
                </select>
              </div>
            </div>

            {/* Password */}
            <div style={{ marginBottom: '1rem' }}>
              <label className="input-label" style={{ fontSize: '0.82rem' }}>Password (min 6 characters)</label>
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--secondary-text)', pointerEvents: 'none', display: 'flex' }}>
                  <Lock size={16} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a secure password"
                  autoComplete="new-password"
                  required
                  style={{
                    width: '100%',
                    padding: '0.7rem 2.5rem 0.7rem 2.5rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-wine)',
                    backgroundColor: '#FAF7F7',
                    fontSize: '0.9rem',
                    color: 'var(--primary-text)',
                    outline: 'none',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: '0.85rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--secondary-text)', cursor: 'pointer', padding: 0, display: 'flex' }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label className="input-label" style={{ fontSize: '0.82rem' }}>Confirm Password</label>
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--secondary-text)', pointerEvents: 'none', display: 'flex' }}>
                  <Lock size={16} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  autoComplete="new-password"
                  required
                  style={{
                    width: '100%',
                    padding: '0.7rem 0.85rem 0.7rem 2.5rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-wine)',
                    backgroundColor: '#FAF7F7',
                    fontSize: '0.9rem',
                    color: 'var(--primary-text)',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
              style={{
                width: '100%',
                padding: '0.85rem',
                fontSize: '0.95rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                borderRadius: '8px',
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? (
                <span>Registering Account...</span>
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight size={16} style={{ color: 'var(--gold-accent)' }} />
                </>
              )}
            </button>
          </form>

          {/* Link back to Login */}
          <div style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.85rem', color: 'var(--secondary-text)' }}>
            Already have an account?{' '}
            <Link
              to="/login"
              style={{ color: 'var(--primary-wine)', fontWeight: 700, textDecoration: 'none' }}
            >
              Sign In
            </Link>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            backgroundColor: 'var(--pale-wine-bg)',
            padding: '0.85rem 2rem',
            borderTop: '1px solid var(--border-wine)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.78rem',
            color: 'var(--secondary-text)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <ShieldCheck size={14} style={{ color: 'var(--gold-accent)' }} />
            <span>Multi-User Authentication</span>
          </div>
          <span className={`badge ${isFirebase ? 'badge-success' : 'badge-wine'}`}>
            {isFirebase ? 'Firebase Auth Live' : 'Firebase Ready'}
          </span>
        </div>
      </div>
    </div>
  );
}
