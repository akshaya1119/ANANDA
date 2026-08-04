import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import OuterLayout from '@/layouts/OuterLayout';

export default function GuestRoutes() {
  const { isAuthenticated } = useAuth();

  // If user has an active session in sessionStorage, redirect away from guest routes to protected dashboard
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <OuterLayout />;
}