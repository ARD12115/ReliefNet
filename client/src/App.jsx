import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute, { PublicRoute, AdminRoute, DispatcherRoute, CoordinatorRoute, AnyAuthRoute } from './components/ProtectedRoute';
import Login from './pages/Login';
import CoordinatorDashboard from './pages/CoordinatorDashboard';
import InventoryPage from './pages/InventoryPage';
import RequestsPage from './pages/RequestsPage';
import TransfersPage from './pages/TransfersPage';
import DispatchDashboard from './pages/DispatchDashboard';
import AdminDashboard from './pages/AdminDashboard';

const App = () => {
  return (
    <BrowserRouter>
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
            <Route path="/coordinator/transfers" element={<TransfersPage />} />
          </Route>
          
          {/* Dispatcher routes */}
          <Route element={<DispatcherRoute />}>
            <Route path="/dispatcher" element={<DispatchDashboard />} />
            <Route path="/dispatcher/transfers" element={<TransfersPage />} />
            <Route path="/dispatcher/requests" element={<RequestsPage />} />
            <Route path="/dispatcher/map" element={<div className="card"><div className="card-body text-center py-12">Map View - Coming Soon</div></div>} />
          </Route>
          
          {/* Admin routes */}
          <Route element={<AdminRoute />}>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/camps" element={<div className="card"><div className="card-body text-center py-12">Camps Management - Coming Soon</div></div>} />
            <Route path="/admin/inventory" element={<InventoryPage />} />
            <Route path="/admin/requests" element={<RequestsPage />} />
            <Route path="/admin/transfers" element={<TransfersPage />} />
            <Route path="/admin/analytics" element={<div className="card"><div className="card-body text-center py-12">Analytics - Coming Soon</div></div>} />
            <Route path="/admin/users" element={<div className="card"><div className="card-body text-center py-12">Users Management - Coming Soon</div></div>} />
          </Route>
          
          {/* Default redirect based on role */}
          <Route path="/" element={<Navigate to="/coordinator" replace />} />
        </Route>
        
        {/* Catch all */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;