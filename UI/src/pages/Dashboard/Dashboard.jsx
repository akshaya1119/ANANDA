import { useState, useEffect } from 'react';
import {
  Users, CreditCard, ShieldCheck, Clock, Percent,
  LogOut, RefreshCw, Layers, Sliders, FileText
} from 'lucide-react';
import AuditLogs from '../AuditLogs/AuditLogs';
import Settings from '../Settings/Settings';
import SesssionExpiry from '../../components/SesssionExpiry';

const API_BASE = import.meta.env.VITE_API_URL || 'https://ananda.com';


export default function Dashboard({ token, user, loginTime, jwtDecoded, onLogout }) {
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('ananda_admin_active_tab') || 'dashboard';
  });

  useEffect(() => {
    localStorage.setItem('ananda_admin_active_tab', activeTab);
  }, [activeTab]);

  const [loading,setLoading] = useState(false)
  const [error,setError] = useState(false)


  // ----------------------------------------------------
  // JWT SESSION COUNTDOWN TIMER & ACTIVE LOGIN TRACKER
  // ----------------------------------------------------
  const [sessionRemaining, setSessionRemaining] = useState(3600);
  const [loginElapsedMins, setLoginElapsedMins] = useState(0);
  const [sessionExpired, setSessionExpired] = useState(false);

  useEffect(() => {
    const startMs = loginTime ? Number(loginTime) : Date.now();
    const targetExpMs = jwtDecoded?.exp ? jwtDecoded.exp * 1000 : startMs + (60 * 60 * 1000);

    const updateTimer = () => {
      const now = Date.now();
      const diffSecs = Math.max(0, Math.floor((targetExpMs - now) / 1000));
      const elapsedM = Math.floor((now - startMs) / (1000 * 60));

      setSessionRemaining(diffSecs);
      setLoginElapsedMins(elapsedM);

      if (diffSecs <= 0) {
        setSessionExpired(true);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [loginTime, jwtDecoded]);

 

  return (
    <div className="dashboard-layout">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          {/* <img
            src="/logo.png"
            onError={(e) => { e.currentTarget.src = '/nepviexitadmin/logo.png'; }}
            alt="ananda Logo"
            className="sidebar-logo-img"
          /> */}
          <span className="brand-text">ANANDA</span>
        </div>

        <nav className="sidebar-nav">
          <button
            className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <Layers size={18} />
            <span>Dashboard</span>
          </button>
          <button
            className={`nav-item ${activeTab === 'students' ? 'active' : ''}`}
            onClick={() => setActiveTab('students')}
          >
            <Users size={18} />
            <span>Students</span>
          </button>
          <button
            className={`nav-item ${activeTab === 'payments' ? 'active' : ''}`}
            onClick={() => setActiveTab('payments')}
          >
            <CreditCard size={18} />
            <span>Payments</span>
          </button>

          {/* Audit Logs tab accessible ONLY when User ID is 1 / primary admin */}
          {(user?.UserId === 1 || user?.UserId === '1' || user?.Id === 1 || user?.Id === '1' || user?.UserId === 'USR1001' || user?.UserName?.toLowerCase() === 'admin') && (
            <button
              className={`nav-item ${activeTab === 'logs' ? 'active' : ''}`}
              onClick={() => setActiveTab('logs')}
            >
              <FileText size={18} />
              <span>Audit Logs</span>
            </button>
          )}
          <button
            className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            <Sliders size={18} />
            <span>Settings</span>
          </button>
        </nav>

        <div className="sidebar-user">
          <div className="user-avatar">
            {user.FullName ? user.FullName[0].toUpperCase() : (jwtDecoded?.unique_name ? jwtDecoded.unique_name[0].toUpperCase() : 'A')}
          </div>
          <div className="user-info">
            <span className="user-name">{user.FullName || jwtDecoded?.unique_name || 'Administrator'}</span>
            <span className="user-role">{jwtDecoded?.role || 'Admin'} &bull; {loginElapsedMins}m logged in</span>
          </div>
          <button onClick={onLogout} className="logout-btn" title="Logout Session">
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
         <header className="main-header">Welcome To ANANDA Admin Portal !</header>
      </main>

      {/* Session Expired Modal */}
      {sessionExpired && (
        <SesssionExpiry
          onLogout={onLogout}
        />
      )}

    </div>
  );
}
