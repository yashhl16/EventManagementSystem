import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
}) => {
  const { user, role, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            Authenticating session...
          </p>
        </div>
      </div>
    );
  }

  // Not authenticated: redirect to appropriate login portal
  if (!isAuthenticated || !user) {
    if (allowedRoles && allowedRoles.length === 1 && allowedRoles[0] === 'admin') {
      return <Navigate to="/admin/login" state={{ from: location }} replace />;
    }
    if (allowedRoles && allowedRoles.includes('organizer') && !allowedRoles.includes('student')) {
      return <Navigate to="/organizer/login" state={{ from: location }} replace />;
    }
    return <Navigate to="/student/login" state={{ from: location }} replace />;
  }

  // Authenticated, but role not allowed
  if (allowedRoles && role && !allowedRoles.includes(role)) {
    // Redirect to respective authorized dashboard
    if (role === 'admin') return <Navigate to="/admin/dashboard" replace />;
    if (role === 'organizer') return <Navigate to="/organizer/dashboard" replace />;
    return <Navigate to="/student/dashboard" replace />;
  }

  return <>{children}</>;
};
