import React, { useState } from 'react';
import { Eye, EyeOff, Lock, User, ShieldAlert, CheckCircle } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'https://anandaexams.com/NEPVIExitAdminAPI/api';

export default function Login({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Please fill in all fields.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          UserName: username.trim(),
          Password: password.trim(),
        }),
      });

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error(`Authentication server returned an invalid response (${response.status}). Please check server configuration.`);
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.Message || 'Failed to sign in.');
      }

      // Success
      onLoginSuccess(data.Token, data.User);
    } catch (err) {
      setError(err.message || 'Connection to authentication server failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      {/* Decorative background gradients */}
      <div className="bg-glow-1"></div>
      <div className="bg-glow-2"></div>

      <div className="login-card">
        <div className="login-header">
          {/* <img src="/nepviexit/logo.png" alt="ananda Logo" className="login-logo-img" /> */}
          <h2 className="login-title">Ananda Admin Portal</h2>
          <p className="login-subtitle">Sign in to manage student records & payments</p>
        </div>

        {error && (
          <div className="error-alert">
            <ShieldAlert size={18} className="alert-icon" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          {/* Username Input Group */}
          <div className={`input-group ${focusedField === 'username' ? 'focused' : ''}`}>
            <label className="input-label">Username</label>
            <div className="input-wrapper">
              <User size={18} className="input-icon" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onFocus={() => setFocusedField('username')}
                onBlur={() => setFocusedField(null)}
                placeholder="Enter username"
                required
                disabled={loading}
                className="custom-input"
              />
            </div>
          </div>

          {/* Password Input Group */}
          <div className={`input-group ${focusedField === 'password' ? 'focused' : ''}`}>
            <label className="input-label">Password</label>
            <div className="input-wrapper">
              <Lock size={18} className="input-icon" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                placeholder="Enter password"
                required
                disabled={loading}
                className="custom-input"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex="-1"
                className="password-toggle"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button type="submit" disabled={loading} className="login-button">
            {loading ? (
              <span className="spinner-wrapper">
                <span className="spinner"></span>
                Verifying...
              </span>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <div className="login-footer">
          <p className="footer-text">ANANDA</p>
          <span className="footer-pill">Secure Access Only</span>
        </div>
      </div>
    </div>
  );
}
