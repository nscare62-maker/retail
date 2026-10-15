import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, Mail, Eye, EyeOff, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';
import logoImg from '../assets/retail-demand-intelligence-logo.png';
import { authService } from '../services/authService';

export default function Login({ onLoginSuccess }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const isFirebase = authService.isConfigured();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!email.trim() || !password) {
      setErrorMessage('Please enter both your work email and password.');
      return;
    }

    setLoading(true);

    try {
      const user = await authService.signIn(email, password);
      if (rememberMe) {
        localStorage.setItem('retail_remember_me', 'true');
      } else {
        localStorage.removeItem('retail_remember_me');
      }

      if (onLoginSuccess) {
        onLoginSuccess(user);
      }
      navigate('/', { replace: true });
    } catch (err) {
      setErrorMessage(err.message || 'Invalid email or password. Please try again.');
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
        padding: '1.5rem',
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
          maxWidth: '440px',
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

        <div style={{ padding: '2.5rem 2rem 2.25rem 2rem' }}>
          {/* Logo and Brand Title */}
          <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
            <div
              style={{
                width: '64px',
                height: '64px',
                margin: '0 auto 1rem auto',
                borderRadius: '14px',
                backgroundColor: '#FFFFFF',
                padding: '4px',
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
                fontSize: '1.4rem',
                fontWeight: 800,
                color: 'var(--dark-wine)',
                letterSpacing: '-0.02em',
                marginBottom: '0.35rem',
              }}
            >
              Retail Demand Intelligence
            </h1>
            <p
              style={{
                fontSize: '0.85rem',
                color: 'var(--secondary-text)',
                margin: 0,
              }}
            >
              Forecast smarter. Stock better. Grow faster.
            </p>
          </div>

          {/* Error Message Alert */}
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

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '1.25rem' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  color: 'var(--primary-text)',
                  marginBottom: '0.4rem',
                }}
              >
                Work Email Address
              </label>
              <div style={{ position: 'relative' }}>
                <div
                  style={{
                    position: 'absolute',
                    left: '0.85rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--secondary-text)',
                    pointerEvents: 'none',
                    display: 'flex',
                  }}
                >
                  <Mail size={16} />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  autoComplete="email"
                  style={{
                    width: '100%',
                    padding: '0.75rem 0.85rem 0.75rem 2.5rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-wine)',
                    backgroundColor: '#FAF7F7',
                    fontSize: '0.9rem',
                    color: 'var(--primary-text)',
                    outline: 'none',
                    transition: 'border-color 0.15s ease',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = 'var(--primary-wine)')}
                  onBlur={(e) => (e.target.style.borderColor = 'var(--border-wine)')}
                />
              </div>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <label
                  style={{
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    color: 'var(--primary-text)',
                  }}
                >
                  Password
                </label>
              </div>
              <div style={{ position: 'relative' }}>
                <div
                  style={{
                    position: 'absolute',
                    left: '0.85rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--secondary-text)',
                    pointerEvents: 'none',
                    display: 'flex',
                  }}
                >
                  <Lock size={16} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your account password"
                  autoComplete="current-password"
                  style={{
                    width: '100%',
                    padding: '0.75rem 2.5rem 0.75rem 2.5rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-wine)',
                    backgroundColor: '#FAF7F7',
                    fontSize: '0.9rem',
                    color: 'var(--primary-text)',
                    outline: 'none',
                    transition: 'border-color 0.15s ease',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = 'var(--primary-wine)')}
                  onBlur={(e) => (e.target.style.borderColor = 'var(--border-wine)')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '0.85rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--secondary-text)',
                    cursor: 'pointer',
                    padding: 0,
                    display: 'flex',
                  }}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '1.5rem',
              }}
            >
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.82rem',
                  color: 'var(--secondary-text)',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  style={{
                    accentColor: 'var(--primary-wine)',
                    width: '15px',
                    height: '15px',
                    cursor: 'pointer',
                  }}
                />
                <span>Remember me</span>
              </label>

              <span
                style={{
                  fontSize: '0.8rem',
                  color: 'var(--primary-wine)',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
                onClick={() => alert('Please contact your administrator or create a new planner account.')}
              >
                Need help?
              </span>
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
                opacity: loading ? 0.8 : 1,
              }}
            >
              {loading ? (
                <span>Authenticating...</span>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight size={16} style={{ color: 'var(--gold-accent)' }} />
                </>
              )}
            </button>
          </form>

          {/* Link to Register */}
          <div
            style={{
              textAlign: 'center',
              marginTop: '1.5rem',
              paddingTop: '1.25rem',
              borderTop: '1px solid var(--border-wine)',
              fontSize: '0.85rem',
              color: 'var(--secondary-text)',
            }}
          >
            Don't have an account yet?{' '}
            <Link
              to="/register"
              style={{ color: 'var(--primary-wine)', fontWeight: 700, textDecoration: 'none' }}
            >
              Create Account
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
            <span>Secure Retail Analytics</span>
          </div>
          <span className={`badge ${isFirebase ? 'badge-success' : 'badge-wine'}`}>
            {isFirebase ? 'Firebase Auth Live' : 'Firebase Ready'}
          </span>
        </div>
      </div>
    </div>
  );
}
