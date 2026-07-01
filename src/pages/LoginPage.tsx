import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// ─── Input Field Component (local) ─────────────────────────────────────
const Field: React.FC<{
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  icon?: React.ReactNode;
  isPhone?: boolean;
}> = ({ label, type = 'text', value, onChange, placeholder, icon, isPhone }) => (
  <div>
    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#878787', marginBottom: '6px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
      {label}
    </label>
    <div style={{ display: 'flex', position: 'relative', width: '100%' }}>
      {isPhone ? (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0a1a15',
          border: '1px solid #1e3d30',
          borderRight: 'none',
          padding: '0 12px',
          color: '#878787',
          fontWeight: 'bold',
          fontSize: '14px',
          userSelect: 'none',
          borderRadius: '10px 0 0 10px',
        }}>
          +92
        </div>
      ) : (
        <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#4a6b5e' }}>
          {icon}
        </span>
      )}
      <input
        type={type}
        value={value}
        onChange={e => {
          let val = e.target.value;
          if (isPhone) {
            val = val.replace(/\D/g, '');
            if (val.startsWith('92')) {
              val = '0' + val.substring(2);
            } else if (val.startsWith('0092')) {
              val = '0' + val.substring(4);
            }
          }
          onChange(val);
        }}
        placeholder={placeholder}
        maxLength={isPhone ? (value.startsWith('0') ? 11 : 10) : undefined}
        style={{
          width: '100%',
          padding: isPhone ? '11px 14px' : '11px 14px 11px 40px',
          background: '#0a1a15',
          border: '1px solid #1e3d30',
          borderRadius: isPhone ? '0 10px 10px 0' : '10px',
          color: '#e8f5f0',
          fontSize: '14px',
          transition: 'border-color 0.15s',
          boxSizing: 'border-box',
        }}
      />
    </div>
  </div>
);

// ─── Login Page ─────────────────────────────────────────────────────────
const LoginPage: React.FC = () => {
  const [phone, setPhone]         = useState('');
  const [password, setPassword]   = useState('');
  const [secret, setSecret]       = useState('');
  const [isMasterAdmin, setIsMasterAdmin] = useState(false);
  const [error, setError]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [showPass, setShowPass]   = useState(false);

  const { login } = useAuth();
  const navigate  = useNavigate();

  React.useEffect(() => {
    const originalTheme = localStorage.getItem('hsl-admin-theme') || 'light';
    document.documentElement.setAttribute('data-theme', 'dark');
    return () => {
      document.documentElement.setAttribute('data-theme', originalTheme);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!phone || !password) {
      setError('Phone number and password are required.');
      return;
    }

    let formattedPhone = phone.trim().replace(/\D/g, '');
    if (formattedPhone.startsWith('92')) {
      formattedPhone = '0' + formattedPhone.substring(2);
    }
    if (formattedPhone.startsWith('0092')) {
      formattedPhone = '0' + formattedPhone.substring(4);
    }
    if (!formattedPhone.startsWith('0') && formattedPhone.startsWith('3') && formattedPhone.length === 10) {
      formattedPhone = '0' + formattedPhone;
    }

    const phoneRegex = /^03\d{9}$/;
    if (!phoneRegex.test(formattedPhone)) {
      setError('Please enter a valid Pakistani phone number (e.g. 3001234567 or 03001234567).');
      return;
    }

    if (isMasterAdmin && !secret) {
      setError('Admin Secret Key is required for Master Admin login.');
      return;
    }

    try {
      setLoading(true);
      await login(formattedPhone, password, isMasterAdmin ? secret : undefined);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0d1f1a',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* ── Background Glow ── */}
      <div style={{
        position: 'absolute',
        top: '-200px', left: '50%',
        transform: 'translateX(-50%)',
        width: '600px', height: '600px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, #00674F18 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* ── Card ── */}
      <div style={{
        width: '100%',
        maxWidth: '420px',
        background: '#122b22',
        border: '1px solid #1e3d30',
        borderRadius: '20px',
        padding: '40px',
        boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
        animation: 'slideUp 0.35s ease-out',
        position: 'relative',
        zIndex: 1,
      }}>
        {/* ── Logo ── */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '56px',
            height: '56px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            flexShrink: 0,
          }}>
            <img src="/logo.png" alt="Murammat" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: '#e8f5f0' }}>
            Murammat Admin
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: '14px', color: '#878787' }}>
            Sign in to access the admin panel
          </p>
        </div>

        {/* ── Form ── */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Field
            label="Phone Number"
            type="text"
            value={phone}
            onChange={(val) => setPhone(val)}
            placeholder="3001234567"
            isPhone
          />

          <Field
            label="Password"
            type={showPass ? 'text' : 'password'}
            value={password}
            onChange={setPassword}
            placeholder="••••••••"
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width="16" height="16">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            }
          />

          {/* Master Admin Toggle */}
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            cursor: 'pointer',
            padding: '12px',
            background: isMasterAdmin ? '#00674f15' : '#0a1a15',
            border: '1px solid #1e3d30',
            borderRadius: '10px',
            userSelect: 'none',
            transition: 'all 0.2s ease',
          }}>
            <input
              type="checkbox"
              checked={isMasterAdmin}
              onChange={e => setIsMasterAdmin(e.target.checked)}
              style={{
                accentColor: '#00674F',
                width: '16px',
                height: '16px',
                cursor: 'pointer',
              }}
            />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#e8f5f0' }}>
                Login as Master Admin
              </span>
              <span style={{ fontSize: '10px', color: '#878787' }}>
                For Super Admin or default administrator account
              </span>
            </div>
          </label>

          {isMasterAdmin && (
            <div style={{ animation: 'fadeIn 0.2s ease-out' }}>
              <Field
                label="Admin Secret Key"
                type={showPass ? 'text' : 'password'}
                value={secret}
                onChange={setSecret}
                placeholder="Enter admin secret key"
                icon={
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width="16" height="16">
                    <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
                  </svg>
                }
              />
            </div>
          )}

          {/* Show/hide passwords toggle */}
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none' }}>
            <input
              type="checkbox"
              checked={showPass}
              onChange={e => setShowPass(e.target.checked)}
              style={{ accentColor: '#00674F', width: '14px', height: '14px' }}
            />
            <span style={{ fontSize: '13px', color: '#878787' }}>Show passwords</span>
          </label>

          {/* Error */}
          {error && (
            <div style={{
              padding: '10px 14px',
              background: '#dc262615',
              border: '1px solid #dc262640',
              borderRadius: '8px',
              color: '#f87171',
              fontSize: '13px',
              animation: 'fadeIn 0.2s ease-out',
            }}>
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '13px',
              background: loading ? '#005240' : '#00674F',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontSize: '15px',
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: loading ? 'none' : '0 4px 16px #00674F40',
              marginTop: '4px',
            }}
          >
            {loading && (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}
                style={{ animation: 'spin 0.8s linear infinite' }}>
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
              </svg>
            )}
            {loading ? 'Signing in...' : 'Sign In to Admin Panel'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
