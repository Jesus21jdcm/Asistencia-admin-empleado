import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthContext } from '../context/AuthContext';

export const PublicRoute: React.FC = () => {
  const { user, loading } = useAuthContext();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (user) {
    if (user.role === 'admin') return <Navigate to="/dashboard" replace />;
    if (user.role === 'employee') return <Navigate to="/employee" replace />;
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};
