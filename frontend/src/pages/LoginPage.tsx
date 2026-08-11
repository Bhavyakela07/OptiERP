import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { login as loginApi } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';
import { GlassCard } from '../components/GlassCard';
import {
  SunIcon,
  MoonIcon,
} from '../components/Icons';

export default function LoginPage() {
  const { isAuthenticated, login } = useAuth();
  const { show } = useToast();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (isAuthenticated) return <Navigate to="/" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    try {
      const res = await loginApi(email, password);
      login(res.data.token, res.data.user);
      show(`Welcome back, ${res.data.user.name}!`, 'success');
      navigate('/');
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Login failed. Please check your credentials.';
      setError(msg);
      show(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* Animated Ambient Pulse Glow */}
      <div className="ambient-glow" />

      {/* Top-Right Theme Toggle Switcher */}
      <div style={{ position: 'absolute', top: '24px', right: '24px', zIndex: 20 }}>
        <button
          type="button"
          onClick={toggleTheme}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 16px',
            borderRadius: 'var(--radius-full)',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-glass)',
            color: 'var(--text-primary)',
            fontSize: '12.5px',
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: 'var(--shadow-card)',
            transition: 'var(--transition-fast)'
          }}
        >
          {theme === 'dark' ? (
            <>
              <SunIcon size={15} color="var(--text-primary)" />
              <span>Sun</span>
            </>
          ) : (
            <>
              <MoonIcon size={15} color="var(--text-primary)" />
              <span>Moon</span>
            </>
          )}
        </button>
      </div>

      <GlassCard style={{ width: '100%', maxWidth: '440px', padding: '40px 36px', zIndex: 10, overflow: 'hidden' }}>
        
        {/* Full Logo Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <img
            src="/icon.png"
            alt="OptiERP Logo"
            style={{
              width: '100%',
              maxWidth: '260px',
              maxHeight: '110px',
              objectFit: 'contain',
              margin: '0 auto 14px',
              display: 'block',
              filter: 'drop-shadow(0 8px 20px rgba(0,0,0,0.25))'
            }}
          />
          <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', marginTop: '6px', fontWeight: 500, letterSpacing: '0.2px' }}>
            Operations & CRM Portal
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              id="login-email"
              type="email"
              className={`input ${error ? 'input-error' : ''}`}
              placeholder="you@company.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              id="login-password"
              type="password"
              minLength={6}
              className={`input ${error ? 'input-error' : ''}`}
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
            {/* Password length helper label downside input box */}
            <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '5px' }}>
              Password must be at least 6 characters long
            </p>
          </div>

          {error && (
            <div style={{
              background: 'rgba(244, 63, 94, 0.12)',
              border: '1px solid rgba(244, 63, 94, 0.25)',
              color: 'var(--status-danger)',
              borderRadius: 'var(--radius-md)',
              padding: '10px 14px',
              fontSize: '13px',
              marginBottom: '18px',
            }}>
              {error}
            </div>
          )}

          <button
            id="login-submit"
            type="submit"
            className="btn btn-primary btn-lg"
            style={{ width: '100%', marginTop: '6px' }}
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

      </GlassCard>
    </div>
  );
}
