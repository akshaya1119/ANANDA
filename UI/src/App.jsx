import React, { useState } from 'react';
import Login from './pages/Auth/Login';
import Dashboard from './pages/Dashboard/Dashboard';
import { secureStorage } from './utils/secureStorage';
import './App.css';

// Helper to decode JWT token payload safely
function parseJwt(token) {
  try {
    if (!token) return null;
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

function App() {
  const [token, setToken] = useState(() => secureStorage.getItem('ananda_admin_token') || null);
  const [user, setUser] = useState(() => secureStorage.getItem('ananda_admin_user') || null);

  const [loginTime, setLoginTime] = useState(() => {
    const savedTime = secureStorage.getItem('ananda_admin_login_time');
    return savedTime ? parseInt(savedTime, 10) : Date.now();
  });

  const handleLoginSuccess = (newToken, userData) => {
    const now = Date.now();

    // Encrypt & save all session keys
    secureStorage.setItem('ananda_admin_token', newToken);
    secureStorage.setItem('ananda_admin_user', userData);
    secureStorage.setItem('ananda_admin_login_time', now.toString());
    secureStorage.setItem('auth-storage', { state: { isAuth: true }, version: 0 });

    setToken(newToken);
    setUser(userData);
    setLoginTime(now);
  };

  const handleLogout = () => {
    // Complete wipe of all storage items on logout or session expiry
    secureStorage.clearAll();
    setToken(null);
    setUser(null);
  };

  if (!token || !user) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  const jwtDecoded = parseJwt(token);

  return (
    <Dashboard
      token={token}
      user={user}
      loginTime={loginTime}
      jwtDecoded={jwtDecoded}
      onLogout={handleLogout}
    />
  );
}

export default App;
