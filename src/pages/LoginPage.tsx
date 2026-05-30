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
  icon: React.ReactNode;
}> = ({ label, type = 'text', value, onChange, placeholder, icon }) => (
  <div>
    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#878787', marginBottom: '6px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
      {label}
    </label>
    <div style={{ position: 'relative' }}>
      <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#4a6b5e' }}>
        {icon}
      </span>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%',
          padding: '11px 14px 11px 40px',
          background: '#0a1a15',
          border: '1px solid #1e3d30',
          borderRadius: '10px',
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
  const [phone, setPhone]       = useState('');
  const [password, setPassword] = useState('');
  const [secret, setSecret]     = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [showPass, setShowPass] = useState(false);

  const { login } = useAuth();
  const navigate  = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!phone || !password || !secret) {
      setError('All fields are required.');
      return;
    }

    try {
      setLoading(true);
      await login(phone, password, secret);
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
            width: '56px', height: '56px',
            borderRadius: '16px',
            background: '#00674F',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
            boxShadow: '0 0 32px #00674F50',
          }}>
            <svg viewBox="0 0 24 24" fill="white" width="28" height="28">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22" fill="white" stroke="none"/>
            </svg>
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
            label="Phone Number / Identifier"
            type="text"
            value={phone}
            onChange={(val) => setPhone(val)}
            placeholder="Enter your phone number"
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width="16" height="16">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
            }
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
