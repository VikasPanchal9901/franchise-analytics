import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { LoadingState } from './States.jsx';

export default function ProtectedRoute({ children }) {
  const { user, ready } = useAuth();
  if (!ready) return <div className="h-screen flex items-center justify-center"><LoadingState label="Checking your session…" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}
