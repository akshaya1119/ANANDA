import React from 'react';
import Students from '@/components/Students';
import { useAuth } from '@/context/AuthContext';

export default function StudentsPage() {
  const { token, user, logout } = useAuth();
  const API_BASE = import.meta.env.VITE_API_URL || 'https://anandaexams.com/NEPVIExitAdminAPI/api';

  return (
    <div className="w-full">
      <Students API_BASE={API_BASE} token={token} user={user} onLogout={logout} />
    </div>
  );
}
