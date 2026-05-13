import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ToastContainer from './components/ui/Toast';
import Layout from './components/layout/Layout';

// ── Pages (lazy-friendly imports) ──
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import LocationsPage from './pages/LocationsPage';
import ServicesPage from './pages/ServicesPage';
import ProvidersPage from './pages/ProvidersPage';
import BookingsPage from './pages/BookingsPage';
import ComplaintsPage from './pages/ComplaintsPage';

// ─── Protected Route Wrapper ───────────────────────────────────────────
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    // Full-screen loading spinner while checking session
    return (
      <div style={{
        minHeight: '100vh', background: '#0d1f1a',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', gap: '16px',
      }}>
        <div style={{
          width: '44px', height: '44px', borderRadius: '50%',
          border: '3px solid #1e3d30', borderTopColor: '#00674F',
          animation: 'spin 0.8s linear infinite',
        }} />
        <span style={{ color: '#4a6b5e', fontSize: '14px' }}>Loading…</span>
      </div>
    );
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

// ─── App Routes ────────────────────────────────────────────────────────
const AppRoutes: React.FC = () => {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      {/* Public */}
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />}
      />

      {/* Protected — wrapped in Layout */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Layout><DashboardPage /></Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/bookings"
        element={
          <ProtectedRoute>
            <Layout><BookingsPage /></Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/locations"
        element={
          <ProtectedRoute>
            <Layout><LocationsPage /></Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/services"
        element={
          <ProtectedRoute>
            <Layout><ServicesPage /></Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/providers"
        element={
          <ProtectedRoute>
            <Layout><ProvidersPage /></Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/complaints"
        element={
          <ProtectedRoute>
            <Layout><ComplaintsPage /></Layout>
          </ProtectedRoute>
        }
      />

      {/* Default redirect */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

// ─── Root App ──────────────────────────────────────────────────────────
const App: React.FC = () => (
  <BrowserRouter>
    <AuthProvider>
      <AppRoutes />
      <ToastContainer />
    </AuthProvider>
  </BrowserRouter>
);

export default App;
