import React, { useState } from 'react';
import { Shield, Lock, ArrowRight, ArrowLeft, AlertCircle, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { api, setSession } from '../services/api';

interface LoginProps {
  kind: 'police' | 'admin';
  onNavigate: (path: string) => void;
  onLoginSuccess: () => void;
}

export const Login: React.FC<LoginProps> = ({ kind, onNavigate, onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isAdmin = kind === 'admin';
  const pageTitle = isAdmin ? 'Administrator Console Login' : 'Police Officer Portal Login';
  const subtitle = isAdmin
    ? 'Access system configuration, officer provisioning, station administration, and audit logs.'
    : 'Access your assigned investigation cases, evidence logs, intelligence tools, and inter-station coordination.';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedUsername = username.trim();
    const trimmedPassword = password.trim();

    if (!trimmedUsername || !trimmedPassword) {
      setError('Both username/email and password are required.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const authFn = isAdmin ? api.auth.adminLogin : api.auth.policeLogin;
      const res = await authFn(trimmedUsername, trimmedPassword);

      setSession(res.access_token, res.user);
      await onLoginSuccess();
      onNavigate(isAdmin ? '/admin/dashboard' : '/police/dashboard');
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-wrapper">
      <div className="login-container">
        <button className="back-link" onClick={() => onNavigate('/')}>
          <ArrowLeft size={16} /> Back to Public Landing
        </button>

        <div className="login-card">
          <div className="login-header">
            <div className={`login-icon-box ${isAdmin ? 'admin-theme' : 'police-theme'}`}>
              {isAdmin ? <Lock size={28} /> : <Shield size={28} />}
            </div>
            <span className="login-badge">{isAdmin ? 'ADMINISTRATIVE ACCESS' : 'SWORN OFFICER ACCESS'}</span>
            <h2>{pageTitle}</h2>
            <p>{subtitle}</p>
          </div>

          {error && (
            <div className="login-error-alert">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="username">
                {isAdmin ? 'Administrator Username or Email' : 'Officer Badge Number, Username, or Email'}
              </label>
              <input
                id="username"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={isAdmin ? 'e.g. admin or admin@example.com' : 'e.g. POL-1001 or officer_username'}
                autoComplete="username"
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Department Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your secure password"
                  autoComplete="current-password"
                  style={{ paddingRight: '42px' }}
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword((prev) => !prev)}
                  style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', cursor: 'pointer', color: '#4a5568' }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !username.trim() || !password.trim()}
              className={`btn btn-block ${isAdmin ? 'btn-admin' : 'btn-police'}`}
            >
              {loading ? 'Verifying Identity...' : `Sign in to ${isAdmin ? 'Admin Console' : 'Police Workspace'}`}
              {!loading && <ArrowRight size={16} />}
            </button>
          </form>

          <div className="login-footer">
            <div className="login-switch">
              {isAdmin ? (
                <span>
                  Police officer?{' '}
                  <button type="button" onClick={() => onNavigate('/police/login')} className="switch-link">
                    Use Police Officer Login
                  </button>
                </span>
              ) : (
                <span>
                  System administrator?{' '}
                  <button type="button" onClick={() => onNavigate('/admin/login')} className="switch-link">
                    Use Administrator Console
                  </button>
                </span>
              )}
            </div>
            <div className="login-security-notice">
              <CheckCircle2 size={13} />
              <span>All authentication attempts are logged for audit compliance.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
