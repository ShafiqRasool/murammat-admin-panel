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
import CommissionsPage from './pages/CommissionsPage';
import ReviewsPage from './pages/ReviewsPage';
import BookingsPage from './pages/BookingsPage';
import ComplaintsPage from './pages/ComplaintsPage';
import CustomersPage from './pages/CustomersPage';
import BlogsPage from './pages/BlogsPage';
import CallRequestsPage from './pages/CallRequestsPage';
import BusinessInquiriesPage from './pages/BusinessInquiriesPage';
import RolesAndStaffPage from './pages/RolesAndStaffPage';
import PagesPage from './pages/PagesPage';

import Button from './components/ui/Button';

// ─── Protected Route Wrapper ───────────────────────────────────────────
const ProtectedRoute: React.FC<{ children: React.ReactNode; permission?: string }> = ({ children, permission }) => {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    // Full-screen loading spinner while checking session
    return (
      <div style={{
        minHeight: '100vh', background: 'var(--bg)',
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

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (permission && !user?.roles?.includes('super-admin')) {
    const hasPerm = user?.permissions?.includes(permission);
    if (!hasPerm) {
      return (
        <Layout>
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            minHeight: '60vh', padding: '40px', textAlign: 'center', animation: 'fadeIn 0.3s ease-out'
          }}>
            <div style={{
              width: '80px', height: '80px', borderRadius: '50%', background: '#dc262615',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444',
              marginBottom: '24px', boxShadow: '0 0 24px #dc262620'
            }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width="40" height="40">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#e8f5f0', margin: '0 0 10px' }}>
              Access Denied
            </h2>
            <p style={{ color: '#878787', fontSize: '14px', maxWidth: '380px', margin: '0 0 24px', lineHeight: 1.5 }}>
              You do not have the required permissions to view this section. Please contact your administrator if you believe this is an error.
            </p>
            <Button variant="secondary" onClick={() => window.history.back()}>
              ← Go Back
            </Button>
          </div>
        </Layout>
      );
    }
  }

  return <>{children}</>;
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
          <ProtectedRoute permission="view_dashboard">
            <Layout><DashboardPage /></Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/bookings"
        element={
          <ProtectedRoute permission="view_bookings">
            <Layout><BookingsPage /></Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/locations"
        element={
          <ProtectedRoute permission="view_locations">
            <Layout><LocationsPage /></Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/services"
        element={
          <ProtectedRoute permission="view_services">
            <Layout><ServicesPage /></Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/providers"
        element={
          <ProtectedRoute permission="view_providers">
            <Layout><ProvidersPage /></Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/commissions"
        element={
          <ProtectedRoute permission="view_providers">
            <Layout><CommissionsPage /></Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/reviews"
        element={
          <ProtectedRoute permission="view_providers">
            <Layout><ReviewsPage /></Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/complaints"
        element={
          <ProtectedRoute permission="view_complaints">
            <Layout><ComplaintsPage /></Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/customers"
        element={
          <ProtectedRoute permission="view_customers">
            <Layout><CustomersPage /></Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/blogs"
        element={
          <ProtectedRoute permission="view_blogs">
            <Layout><BlogsPage /></Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/pages"
        element={
          <ProtectedRoute permission="view_blogs">
            <Layout><PagesPage /></Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/call-requests"
        element={
          <ProtectedRoute permission="view_call_requests">
            <Layout><CallRequestsPage /></Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/business-inquiries"
        element={
          <ProtectedRoute permission="view_business_inquiries">
            <Layout><BusinessInquiriesPage /></Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/roles-staff"
        element={
          <ProtectedRoute permission="manage_roles">
            <Layout><RolesAndStaffPage /></Layout>
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
