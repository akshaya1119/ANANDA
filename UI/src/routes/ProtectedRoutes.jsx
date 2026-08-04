import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import InnerLayout from '@/layouts/InnerLayout/InnerLayout';

export default function ProtectedRoutes() {
  const { isAuthenticated } = useAuth();

  // If user is not authenticated or session is invalid, redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <InnerLayout />;
}