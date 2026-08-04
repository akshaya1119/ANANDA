import React, { createContext, useContext, useState } from 'react';
import { secureStorage } from '../utils/secureStorage';

const AuthContext = createContext(null);

export function parseJwt(token) {
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

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => secureStorage.getItem('ananda_admin_token') || null);
  const [user, setUser] = useState(() => secureStorage.getItem('ananda_admin_user') || null);
  const [loginTime, setLoginTime] = useState(() => {
    const savedTime = secureStorage.getItem('ananda_admin_login_time');
    return savedTime ? parseInt(savedTime, 10) : Date.now();
  });

  const isAuthenticated = Boolean(token && user);

  const login = (newToken, userData) => {
    const now = Date.now();
    secureStorage.setItem('ananda_admin_token', newToken);
    secureStorage.setItem('ananda_admin_user', userData);
    secureStorage.setItem('ananda_admin_login_time', now.toString());
    secureStorage.setItem('auth-storage', { state: { isAuth: true }, version: 0 });

    setToken(newToken);
    setUser(userData);
    setLoginTime(now);
  };

  const logout = () => {
    secureStorage.clearAll();
    setToken(null);
    setUser(null);
  };

  const jwtDecoded = parseJwt(token);

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        loginTime,
        isAuthenticated,
        jwtDecoded,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
