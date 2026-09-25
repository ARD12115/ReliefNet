import React from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import Layout from '../components/Layout';

const roleRoutes = {
  admin: ['/admin', '/coordinator', '/dispatcher'],
  dispatcher: ['/dispatcher'],
  coordinator: ['/coordinator']
};

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { isAuthenticated, user, isLoading } = useAuthStore();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
    // Redirect to appropriate dashboard based on role
    const defaultPaths = {
      admin: '/admin',
      dispatcher: '/dispatcher',
      coordinator: '/coordinator'
    };
    return <Navigate to={defaultPaths[user?.role] || '/'} replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};

export const AdminRoute = ({ children }) => (
  <ProtectedRoute allowedRoles={['admin']}>{children}</ProtectedRoute>
);

export const DispatcherRoute = ({ children }) => (
  <ProtectedRoute allowedRoles={['admin', 'dispatcher']}>{children}</ProtectedRoute>
);

export const CoordinatorRoute = ({ children }) => (
  <ProtectedRoute allowedRoles={['admin', 'coordinator']}>{children}</ProtectedRoute>
);

export const AnyAuthRoute = ({ children }) => (
  <ProtectedRoute>{children}</ProtectedRoute>
);

export const PublicRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuthStore();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
      </div>
    );
  }
  
  if (isAuthenticated) {
    const defaultPaths = {
      admin: '/admin',
      dispatcher: '/dispatcher',
      coordinator: '/coordinator'
    };
    return <Navigate to={defaultPaths[useAuthStore.getState().user?.role] || '/'} replace />;
  }
  
  return children;
};

export default ProtectedRoute;