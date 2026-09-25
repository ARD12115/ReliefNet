import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Package, 
  FileText, 
  Truck, 
  AlertTriangle, 
  TrendingUp, 
  MapPin,
  Clock,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { useCampStore } from '../store/campStore';
import { useInventoryStore } from '../store/inventoryStore';
import { useRequestStore } from '../store/requestStore';
import { useTransferStore } from '../store/transferStore';
import { useAuthStore } from '../store/authStore';
import { useInventorySocket } from '../hooks/useSocket';
import { formatDistanceToNow } from 'date-fns';
import InventorySummary from '../components/InventorySummary';
import RecentRequests from '../components/RecentRequests';
import QuickActions from '../components/QuickActions';

const CoordinatorDashboard = () => {
  const { user } = useAuthStore();
  const { camps, fetchCamps, selectedCamp, fetchCampStats, isLoading: campsLoading } = useCampStore();
  const { fetchCampInventory, fetchSummary, isLoading: inventoryLoading } = useInventoryStore();
  const { fetchRequests, fetchStats: fetchRequestStats, isLoading: requestsLoading } = useRequestStore();
  const { fetchTransfers, fetchStats: fetchTransferStats, isLoading: transfersLoading } = useTransferStore();
  
  const [stats, setStats] = useState({
    inventory: null,
    requests: null,
    transfers: null
  });
  const [recentActivity, setRecentActivity] = useState([]);

  const campId = user?.campId;

  useEffect(() => {
    if (campId) {
      fetchCamps();
      fetchCampInventory(campId);
      fetchSummary(campId);
      fetchRequests({ campId, limit: 5 });
      fetchRequestStats(campId);
      fetchTransfers({ campId, limit: 5 });
      fetchTransferStats(campId);
      fetchCampStats(campId);
    }
  }, [campId]);

  // Real-time updates
  useInventorySocket(campId, {
    onInventoryUpdated: () => {
      if (campId) {
        fetchCampInventory(campId);
        fetchSummary(campId);
      }
    }
  });

  useEffect(() => {
    if (stats.inventory && stats.requests && stats.transfers) {
      const activity = [
        ...(stats.requests.byStatus || []).map(s => ({
          type: 'request',
          label: `${s._id} requests`,
          count: s.count,
          icon: FileText,
          color: 'text-primary-600'
        })),
        ...(stats.transfers.byStatus || []).map(s => ({
          type: 'transfer',
          label: `${s._id} transfers`,
          count: s.count,
          icon: Truck,
          color: 'text-warning-600'
        }))
      ].slice(0, 4);
      setRecentActivity(activity);
    }
  }, [stats.inventory, stats.requests, stats.transfers]);

  const statCards = [
    {
      title: 'Inventory Items',
      value: stats.inventory?.overall?.totalItems || 0,
      subtitle: `${stats.inventory?.overall?.lowStockCount || 0} low stock`,
      icon: Package,
      color: 'text-primary-600 bg-primary-100',
      trend: stats.inventory?.overall?.outOfStockCount > 0 ? 'danger' : 'success'
    },
    {
      title: 'Active Requests',
      value: stats.requests?.totalOpen || 0,
      subtitle: `${stats.requests?.byUrgency?.find(u => u._id === 'critical')?.count || 0} critical`,
      icon: FileText,
      color: 'text-danger-600 bg-danger-100',
      trend: stats.requests?.byUrgency?.find(u => u._id === 'critical')?.count > 0 ? 'danger' : 'neutral'
    },
    {
      title: 'Pending Transfers',
      value: stats.transfers?.byStatus?.find(s => s._id === 'proposed')?.count || 0,
      subtitle: `${stats.transfers?.byStatus?.find(s => s._id === 'in_transit')?.count || 0} in transit`,
      icon: Truck,
      color: 'text-warning-600 bg-warning-100',
      trend: 'neutral'
    },
    {
      title: 'Delivered This Month',
      value: stats.transfers?.totalDelivered || 0,
      subtitle: `${stats.transfers?.totalQuantityDelivered || 0} units moved`,
      icon: CheckCircle,
      color: 'text-green-600 bg-green-100',
      trend: 'success'
    }
  ];

  if (!campId) {
    return (
      <div className="card">
        <div className="card-body text-center py-12">
          <MapPin className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">No Camp Assigned</h3>
          <p className="text-slate-500 mb-4">Contact your administrator to be assigned to a relief camp.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Coordinator Dashboard</h1>
          <p className="text-slate-500 mt-1">Manage inventory and requests for your camp</p>
        </div>
        <div className="flex gap-2">
          <Link to="/coordinator/inventory" className="btn-primary">
            <Package className="w-4 h-4" /> Manage Inventory
          </Link>
          <Link to="/coordinator/requests" className="btn-secondary">
            <FileText className="w-4 h-4" /> New Request
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <div key={index} className="card">
            <div className="card-body">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-slate-500">{stat.title}</p>
                  <p className="text-3xl font-bold text-slate-900 mt-1">{stat.value}</p>
                  <p className="text-sm text-slate-500 mt-1">{stat.subtitle}</p>
                </div>
                <div className={`p-3 rounded-xl ${stat.color}`}>
                  <stat.icon className="w-6 h-6" />
                </div>
              </div>
              {stat.trend === 'danger' && (
                <div className="mt-3 flex items-center gap-1 text-danger-600 text-sm">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Attention needed</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Inventory & Quick Actions */}
        <div className="lg:col-span-2 space-y-6">
          <InventorySummary campId={campId} />
          <QuickActions campId={campId} />
        </div>

        {/* Right Column - Recent Requests */}
        <div className="space-y-6">
          <RecentRequests campId={campId} />
          
          {/* Camp Info */}
          <div className="card">
            <div className="card-header">
              <h3 className="font-semibold text-slate-900">Camp Information</h3>
            </div>
            <div className="card-body space-y-3">
              {selectedCamp && (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Status</span>
                    <span className={`badge ${selectedCamp.status === 'active' ? 'badge-success' : selectedCamp.status === 'full' ? 'badge-warning' : 'badge-slate'}`}>
                      {selectedCamp.status}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Capacity</span>
                    <span className="font-medium">{selectedCamp.capacity || 'Not set'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Current Population</span>
                    <span className="font-medium">{selectedCamp.currentPopulation || 'Not set'}</span>
                  </div>
                  {selectedCamp.contactPerson && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Contact</span>
                      <span className="font-medium">{selectedCamp.contactPerson}</span>
                    </div>
                  )}
                  {selectedCamp.contactPhone && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Phone</span>
                      <span className="font-medium">{selectedCamp.contactPhone}</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CoordinatorDashboard;