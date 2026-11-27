import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute, { PublicRoute, AdminRoute, DispatcherRoute, CoordinatorRoute, AnyAuthRoute } from './components/ProtectedRoute';

// Lazy load pages for code-splitting
const Login = lazy(() => import('./pages/Login'));
const CoordinatorDashboard = lazy(() => import('./pages/CoordinatorDashboard'));
const InventoryPage = lazy(() => import('./pages/InventoryPage'));
const RequestsPage = lazy(() => import('./pages/RequestsPage'));
const TransfersPage = lazy(() => import('./pages/TransfersPage'));
const DispatchDashboard = lazy(() => import('./pages/DispatchDashboard'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const CreateCamp = lazy(() => import('./pages/CreateCamp'));
const CreateTransfer = lazy(() => import('./pages/CreateTransfer'));
const RequestDetail = lazy(() => import('./pages/RequestDetail'));
const CampsPage = lazy(() => import('./pages/CampsPage'));
const EditCamp = lazy(() => import('./pages/EditCamp'));
const UsersPage = lazy(() => import('./pages/UsersPage'));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'));

const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-50">
    <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
  </div>
);

const App = () => {
  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
        {/* Public routes */}
        <Route path="/login" element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        } />
        
        {/* Authenticated routes with layout */}
        <Route element={
          <AnyAuthRoute>
            <Layout />
          </AnyAuthRoute>
        }>
          {/* Coordinator routes */}
          <Route element={<CoordinatorRoute />}>
            <Route path="/coordinator" element={<CoordinatorDashboard />} />
            <Route path="/coordinator/inventory" element={<InventoryPage />} />
            <Route path="/coordinator/requests" element={<RequestsPage />} />
            <Route path="/coordinator/requests/:id" element={<RequestDetail />} />
                        <Route path="/coordinator/transfers" element={<TransfersPage />} />
                        <Route path="/coordinator/transfers/new" element={<CreateTransfer />} />
          </Route>

          {/* Dispatcher routes */}
          <Route element={<DispatcherRoute />}>
            <Route path="/dispatcher" element={<DispatchDashboard />} />
            <Route path="/dispatcher/transfers" element={<TransfersPage />} />
            <Route path="/dispatcher/transfers/new" element={<CreateTransfer />} />
            <Route path="/dispatcher/requests" element={<RequestsPage />} />
            <Route path="/dispatcher/map" element={<div className="card"><div className="card-body text-center py-12">Map View - Coming Soon</div></div>} />
          </Route>

          {/* Admin routes */}
                    <Route element={<AdminRoute />}>
                      <Route path="/admin" element={<AdminDashboard />} />
                      <Route path="/admin/camps" element={<CampsPage />} />
                      <Route path="/admin/camps/new" element={<CreateCamp />} />
                      <Route path="/admin/camps/:id/edit" element={<EditCamp />} />
                      <Route path="/admin/inventory" element={<InventoryPage />} />
                      <Route path="/admin/requests" element={<RequestsPage />} />
                      <Route path="/admin/transfers" element={<TransfersPage />} />
                      <Route path="/admin/analytics" element={<AnalyticsPage />} />
                      <Route path="/admin/users" element={<UsersPage />} />
                    </Route>
          
          {/* Default redirect based on role */}
          <Route path="/" element={<Navigate to="/coordinator" replace />} />
        </Route>
        
        {/* Catch all */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
      </Suspense>
    </BrowserRouter>
  );
};

export default App;