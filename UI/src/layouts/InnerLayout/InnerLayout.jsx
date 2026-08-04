import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Menu, Clock } from 'lucide-react';
import Sidebar from './components/Sidebar';
import { useAuth } from '../../context/AuthContext';
import SesssionExpiry from '../../components/SesssionExpiry';

export default function InnerLayout() {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isSessionExpired, setIsSessionExpired] = useState(false);
  const [sessionRemaining, setSessionRemaining] = useState(3600);
  const { jwtDecoded, loginTime, logout } = useAuth();
  const location = useLocation();

  const getPageTitle = (pathname) => {
    switch (pathname) {
      case '/dashboard':
        return 'Welcome To ANANDA Admin Portal !';
      case '/students':
      case '/Students':
        return 'Student Directory & Verification';
      case '/audit-logs':
        return 'System Audit Logs';
      case '/profile':
        return 'My Profile';
      case '/settings':
        return 'System Settings';
      default:
        return 'ANANDA Admin Portal';
    }
  };

  useEffect(() => {
    const startMs = loginTime ? Number(loginTime) : Date.now();
    const targetExpMs = jwtDecoded?.exp
      ? jwtDecoded.exp * 1000
      : startMs + 60 * 60 * 1000;

    const updateTimer = () => {
      const now = Date.now();
      const diffSecs = Math.max(0, Math.floor((targetExpMs - now) / 1000));
      setSessionRemaining(diffSecs);

      if (diffSecs <= 0) {
        setIsSessionExpired(true);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [jwtDecoded, loginTime]);

  const formatTime = (totalSeconds) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getPillClass = () => {
    if (sessionRemaining <= 120) return 'session-pill session-pill-alert';
    if (sessionRemaining <= 600) return 'session-pill session-pill-warning';
    return 'session-pill session-pill-green';
  };

  return (
    <div className="flex min-h-screen bg-[#f8fafc] text-slate-900 font-sans">
      {/* Sidebar Component */}
      <Sidebar isMobileOpen={isMobileOpen} setIsMobileOpen={setIsMobileOpen} />

      {/* Main Viewport Container */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="h-[64px] px-6 bg-white border-b border-slate-200 flex items-center justify-between sticky top-0 z-30 shadow-xs">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileOpen(true)}
              className="lg:hidden p-2 rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300"
              aria-label="Open Navigation Menu"
            >
              <Menu size={20} />
            </button>
            <h1 className="text-base font-bold text-slate-900 tracking-tight">
              {getPageTitle(location.pathname)}
            </h1>
          </div>

          {/* Session Expiry Countdown Timer Pill */}
          <div className={getPillClass()}>
            <Clock size={15} className="session-clock-icon" />
            <div className="session-text-group">
              <span className="session-label">Session:</span>
              <span className="session-timer">{formatTime(sessionRemaining)}</span>
            </div>
          </div>
        </header>

        {/* Content Viewport */}
        <main className="flex-1 p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      {/* Session Expired Modal */}
      {isSessionExpired && <SesssionExpiry onLogout={logout} />}
    </div>
  );
}