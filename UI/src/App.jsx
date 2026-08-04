import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import GuestRoutes from '@/routes/GuestRoutes';
import ProtectedRoutes from '@/routes/ProtectedRoutes';
import Login from '@/pages/Auth/Login';
import Dashboard from '@/pages/Dashboard/Dashboard';
import StudentsPage from '@/pages/Students/StudentsPage';
import AuditLogsPage from '@/pages/AuditLogs/AuditLogsPage';
import Profile from '@/pages/Profile/Profile';
import Settings from '@/pages/Settings/Settings';
import '@/App.css';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Guest Routes (e.g. /login) - auto redirects to /dashboard if logged in */}
          <Route element={<GuestRoutes />}>
            <Route path="/login" element={<Login />} />
          </Route>

          {/* Protected Routes (e.g. /dashboard, /students, /profile, /settings, /audit-logs) - redirects to /login if not logged in */}
          <Route element={<ProtectedRoutes />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/students" element={<StudentsPage />} />
            <Route path="/Students" element={<Navigate to="/students" replace />} />
            <Route path="/audit-logs" element={<AuditLogsPage />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/settings" element={<Settings />} />
          </Route>

          {/* Fallback Redirects */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
