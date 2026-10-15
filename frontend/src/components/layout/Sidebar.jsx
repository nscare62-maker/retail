import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Database,
  Binary,
  Cpu,
  TrendingUp,
  Award,
  Package,
  Layers,
  FileSpreadsheet,
  Settings,
  ChevronLeft,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import logoImg from '../../assets/retail-demand-intelligence-logo.png';

const navItems = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'Datasets', path: '/datasets', icon: Database },
  { name: 'Preprocessing', path: '/preprocessing', icon: Binary },
  { name: 'TFT Training', path: '/training', icon: Cpu },
  { name: 'Demand Forecasting', path: '/forecasting', icon: TrendingUp },
  { name: 'Model Evaluation', path: '/evaluation', icon: Award },
  { name: 'Inventory Planning', path: '/inventory', icon: Package },
  { name: 'Model Management', path: '/models', icon: Layers },
  { name: 'Reports & Export', path: '/reports', icon: FileSpreadsheet },
  { name: 'Settings', path: '/settings', icon: Settings },
];

export default function Sidebar({ collapsed, setCollapsed, user, onLogout }) {
  return (
    <aside
      style={{
        width: collapsed ? '80px' : '260px',
        backgroundColor: 'var(--dark-wine)',
        backgroundImage: 'linear-gradient(180deg, #4A1720 0%, #360E16 100%)',
        color: '#FFFFFF',
        transition: 'width 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 50,
        boxShadow: '4px 0 20px rgba(0, 0, 0, 0.15)',
        flexShrink: 0,
      }}
    >
      {/* Brand Header */}
      <div
        style={{
          padding: collapsed ? '1.25rem 0.75rem' : '1.25rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          overflow: 'hidden',
        }}
      >
        <img
          src={logoImg}
          alt="Retail Demand Intelligence Logo"
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '8px',
            objectFit: 'contain',
            backgroundColor: '#FFFFFF',
            padding: '2px',
            border: '1px solid var(--gold-accent)',
            flexShrink: 0,
          }}
          onError={(e) => {
            e.target.style.display = 'none';
          }}
        />
        {!collapsed && (
          <div style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}>
            <div
              style={{
                fontFamily: "'Outfit', sans-serif",
                fontSize: '1.05rem',
                fontWeight: 700,
                color: '#FFFFFF',
                letterSpacing: '-0.01em',
              }}
            >
              Retail Demand
            </div>
            <div
              style={{
                fontSize: '0.75rem',
                color: 'var(--gold-accent)',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}
            >
              Intelligence
            </div>
          </div>
        )}
      </div>

      {/* Navigation Links */}
      <nav style={{ flex: 1, padding: '1rem 0.5rem', overflowY: 'auto' }}>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '0.85rem',
                padding: collapsed ? '0.75rem 0' : '0.75rem 1rem',
                justifyContent: collapsed ? 'center' : 'flex-start',
                marginBottom: '0.35rem',
                borderRadius: '8px',
                color: isActive ? '#FFFFFF' : 'rgba(255, 255, 255, 0.75)',
                backgroundColor: isActive ? 'var(--primary-wine)' : 'transparent',
                fontWeight: isActive ? 600 : 500,
                fontSize: '0.88rem',
                textDecoration: 'none',
                position: 'relative',
                transition: 'var(--transition)',
              })}
              title={collapsed ? item.name : undefined}
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <div
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: '15%',
                        height: '70%',
                        width: '4px',
                        backgroundColor: 'var(--gold-accent)',
                        borderRadius: '0 4px 4px 0',
                      }}
                    />
                  )}
                  <Icon
                    size={20}
                    style={{
                      color: isActive ? 'var(--gold-accent)' : 'inherit',
                      flexShrink: 0,
                    }}
                  />
                  {!collapsed && (
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.name}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Tagline footer or collapse toggle */}
      <div
        style={{
          padding: '1rem',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
        }}
      >
        {!collapsed && (
          <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.3 }}>
            <div>Forecast smarter.</div>
            <div>Stock better. Grow faster.</div>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
            border: 'none',
            color: '#FFFFFF',
            padding: '0.4rem',
            borderRadius: '6px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'var(--transition)',
          }}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>
    </aside>
  );
}
