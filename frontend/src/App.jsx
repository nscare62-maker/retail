import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Sidebar from './components/layout/Sidebar';
import Topbar from './components/layout/Topbar';

import Login from './pages/Login';
import Register from './pages/Register';
import { authService } from './services/authService';
import Dashboard from './pages/Dashboard';
import Datasets from './pages/Datasets';
import Preprocessing from './pages/Preprocessing';
import Training from './pages/Training';
import Forecasting from './pages/Forecasting';
import Evaluation from './pages/Evaluation';
import Inventory from './pages/Inventory';
import Models from './pages/Models';
import Reports from './pages/Reports';
import Settings from './pages/Settings';

function ProtectedLayout({ user, onLogout, sidebarCollapsed, setSidebarCollapsed, children }) {
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="app-container">
      <Sidebar
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        user={user}
        onLogout={onLogout}
      />

      <div className="main-wrapper">
        <Topbar user={user} onLogout={onLogout} />
        <main className="content-area">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('retail_auth_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const handleLoginSuccess = (userData) => {
    setUser(userData);
  };

  const handleLogout = async () => {
    await authService.signOut();
    setUser(null);
  };

  useEffect(() => {
    const unsubscribe = authService.subscribeToAuth((fbUser) => {
      if (fbUser) {
        setUser((prev) => ({ ...prev, ...fbUser }));
      }
    });
    return () => unsubscribe();
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Login Route */}
        <Route
          path="/login"
          element={
            user ? (
              <Navigate to="/" replace />
            ) : (
              <Login onLoginSuccess={handleLoginSuccess} />
            )
          }
        />

        {/* Public Register Route for Multiple Users */}
        <Route
          path="/register"
          element={
            user ? (
              <Navigate to="/" replace />
            ) : (
              <Register onLoginSuccess={handleLoginSuccess} />
            )
          }
        />

        {/* Protected Application Routes */}
        <Route
          path="/"
          element={
            <ProtectedLayout
              user={user}
              onLogout={handleLogout}
              sidebarCollapsed={sidebarCollapsed}
              setSidebarCollapsed={setSidebarCollapsed}
            >
              <Dashboard />
            </ProtectedLayout>
          }
        />

        <Route
          path="/datasets"
          element={
            <ProtectedLayout
              user={user}
              onLogout={handleLogout}
              sidebarCollapsed={sidebarCollapsed}
              setSidebarCollapsed={setSidebarCollapsed}
            >
              <Datasets />
            </ProtectedLayout>
          }
        />

        <Route
          path="/preprocessing"
          element={
            <ProtectedLayout
              user={user}
              onLogout={handleLogout}
              sidebarCollapsed={sidebarCollapsed}
              setSidebarCollapsed={setSidebarCollapsed}
            >
              <Preprocessing />
            </ProtectedLayout>
          }
        />

        <Route
          path="/training"
          element={
            <ProtectedLayout
              user={user}
              onLogout={handleLogout}
              sidebarCollapsed={sidebarCollapsed}
              setSidebarCollapsed={setSidebarCollapsed}
            >
              <Training />
            </ProtectedLayout>
          }
        />

        <Route
          path="/forecasting"
          element={
            <ProtectedLayout
              user={user}
              onLogout={handleLogout}
              sidebarCollapsed={sidebarCollapsed}
              setSidebarCollapsed={setSidebarCollapsed}
            >
              <Forecasting />
            </ProtectedLayout>
          }
        />

        <Route
          path="/evaluation"
          element={
            <ProtectedLayout
              user={user}
              onLogout={handleLogout}
              sidebarCollapsed={sidebarCollapsed}
              setSidebarCollapsed={setSidebarCollapsed}
            >
              <Evaluation />
            </ProtectedLayout>
          }
        />

        <Route
          path="/inventory"
          element={
            <ProtectedLayout
              user={user}
              onLogout={handleLogout}
              sidebarCollapsed={sidebarCollapsed}
              setSidebarCollapsed={setSidebarCollapsed}
            >
              <Inventory />
            </ProtectedLayout>
          }
        />

        <Route
          path="/models"
          element={
            <ProtectedLayout
              user={user}
              onLogout={handleLogout}
              sidebarCollapsed={sidebarCollapsed}
              setSidebarCollapsed={setSidebarCollapsed}
            >
              <Models />
            </ProtectedLayout>
          }
        />

        <Route
          path="/reports"
          element={
            <ProtectedLayout
              user={user}
              onLogout={handleLogout}
              sidebarCollapsed={sidebarCollapsed}
              setSidebarCollapsed={setSidebarCollapsed}
            >
              <Reports />
            </ProtectedLayout>
          }
        />

        <Route
          path="/settings"
          element={
            <ProtectedLayout
              user={user}
              onLogout={handleLogout}
              sidebarCollapsed={sidebarCollapsed}
              setSidebarCollapsed={setSidebarCollapsed}
            >
              <Settings onLogout={handleLogout} />
            </ProtectedLayout>
          }
        />

        {/* Fallback to Dashboard / Login */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
