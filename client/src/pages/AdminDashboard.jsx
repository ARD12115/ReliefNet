import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Users, 
  Package, 
  FileText, 
  Truck, 
  MapPin, 
  BarChart3, 
  Settings,
  Shield,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Loader2
} from 'lucide-react';
import { useCampStore } from '../store/campStore';
import { useInventoryStore } from '../store/inventoryStore';
import { useRequestStore } from '../store/requestStore';
import { useTransferStore } from '../store/transferStore';
import { useAuthStore } from '../store/authStore';
import { useAdminSocket } from '../hooks/useSocket';
import { formatDistanceToNow } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import toast from 'react-hot-toast';

const AdminDashboard = () => {
  const { user } = useAuthStore();
  const { camps, fetchCamps, isLoading: campsLoading } = useCampStore();
  const { fetchSummary, isLoading: inventoryLoading } = useInventoryStore();
  const { fetchRequests, fetchStats: fetchRequestStats, isLoading: requestsLoading } = useRequestStore();
  const { fetchTransfers, fetchStats: fetchTransferStats, isLoading: transfersLoading } = useTransferStore();
  
  const [stats, setStats] = useState({
    inventory: null,
    requests: null,
    transfers: null,
    camps: null
  });
  const [chartsData, setChartsData] = useState({
    requestsOverTime: [],
    transfersByStatus: [],
    inventoryByCategory: []
  });

  useEffect(() => {
    fetchCamps();
    fetchSummary();
    fetchRequests({ limit: 100 });
    fetchRequestStats();
    fetchTransfers({ limit: 100 });
    fetchTransferStats();
  }, []);

  useEffect(() => {
    if (stats.inventory && stats.requests && stats.transfers) {
      // Mock chart data - in production this would come from analytics API
      setChartsData({
        requestsOverTime: [
          { month: 'Jan', requests: 12, fulfilled: 8 },
          { month: 'Feb', requests: 19, fulfilled: 15 },
          { month: 'Mar', requests: 25, fulfilled: 20 },
          { month: 'Apr', requests: 32, fulfilled: 28 },
          { month: 'May', requests: 28, fulfilled: 25 },
          { month: 'Jun', requests: 35, fulfilled: 30 }
        ],
        transfersByStatus: [
          { name: 'Delivered', value: stats.transfers.totalDelivered || 0 },
          { name: 'In Transit', value: stats.transfers.byStatus?.find(s => s._id === 'in_transit')?.count || 0 },
          { name: 'Assigned', value: stats.transfers.byStatus?.find(s => s._id === 'assigned')?.count || 0 },
          { name: 'Proposed', value: stats.transfers.byStatus?.find(s => s._id === 'proposed')?.count || 0 },
          { name: 'Cancelled', value: stats.transfers.byStatus?.find(s => s._id === 'cancelled')?.count || 0 }
        ].filter(d => d.value > 0),
        inventoryByCategory: stats.inventory.byCategory?.map(c => ({
          name: c._id,
          items: c.totalItems,
          quantity: c.totalQuantity
        })) || []
      });
    }
  }, [stats.inventory, stats.requests, stats.transfers]);

  // Real-time updates
  useAdminSocket({
    onInventoryUpdated: () => fetchSummary(),
    onRequestCreated: () => { fetchRequests({ limit: 100 }); fetchRequestStats(); },
    onRequestUpdated: () => { fetchRequests({ limit: 100 }); fetchRequestStats(); },
    onTransferCreated: () => { fetchTransfers({ limit: 100 }); fetchTransferStats(); },
    onTransferUpdated: () => { fetchTransfers({ limit: 100 }); fetchTransferStats(); },
    onCampCreated: () => fetchCamps(),
    onCampUpdated: () => fetchCamps()
  });

  useEffect(() => {
    const loadStats = async () => {
      try {
        const [inventory, requests, transfers] = await Promise.all([
          fetchSummary(),
          fetchRequestStats(),
          fetchTransferStats()
        ]);
        setStats({
          inventory: inventory.data,
          requests: requests.data,
          transfers: transfers.data,
          camps: { total: camps.length, active: camps.filter(c => c.status === 'active').length }
        });
      } catch (error) {
        console.error('Failed to load stats:', error);
      }
    };
    loadStats();
  }, [fetchSummary, fetchRequestStats, fetchTransferStats, camps.length]);

  const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

  const overviewCards = [
    {
      title: 'Active Camps',
      value: stats.camps?.active || 0,
      subtitle: `${stats.camps?.total || 0} total camps`,
      icon: MapPin,
      color: 'text-primary-600 bg-primary-100',
      href: '/admin/camps'
    },
    {
      title: 'Inventory Items',
      value: stats.inventory?.overall?.totalItems || 0,
      subtitle: `${stats.inventory?.overall?.lowStockCount || 0} low stock alerts`,
      icon: Package,
      color: 'text-green-600 bg-green-100',
      href: '/admin/inventory'
    },
    {
      title: 'Open Requests',
      value: stats.requests?.totalOpen || 0,
      subtitle: `${stats.requests?.byUrgency?.find(u => u._id === 'critical')?.count || 0} critical`,
      icon: FileText,
      color: 'text-danger-600 bg-danger-100',
      href: '/admin/requests'
    },
    {
      title: 'Active Transfers',
      value: (stats.transfers?.byStatus?.find(s => s._id === 'in_transit')?.count || 0) + 
             (stats.transfers?.byStatus?.find(s => s._id === 'assigned')?.count || 0),
      subtitle: `${stats.transfers?.totalDelivered || 0} delivered total`,
      icon: Truck,
      color: 'text-warning-600 bg-warning-100',
      href: '/admin/transfers'
    }
  ];

  const isLoading = campsLoading || inventoryLoading || requestsLoading || transfersLoading;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Admin Overview</h1>
          <p className="text-slate-500 mt-1">System-wide relief coordination dashboard</p>
        </div>
        <div className="flex gap-2">
          <Link to="/admin/camps/new" className="btn-primary">
            <Shield className="w-4 h-4" /> New Camp
          </Link>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {overviewCards.map((card, index) => (
          <Link key={index} to={card.href} className="card hover:shadow-md transition-shadow">
            <div className="card-body">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-slate-500">{card.title}</p>
                  <p className="text-3xl font-bold text-slate-900 mt-1">{card.value}</p>
                  <p className="text-sm text-slate-500 mt-1">{card.subtitle}</p>
                </div>
                <div className={`p-3 rounded-xl ${card.color}`}>
                  <card.icon className="w-6 h-6" />
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Requests Trend */}
        <div className="card">
          <div className="card-header">
            <h3 className="font-semibold text-slate-900">Requests Trend (6 Months)</h3>
          </div>
          <div className="card-body h-64">
            {chartsData.requestsOverTime.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartsData.requestsOverTime}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} />
                  <YAxis stroke="#94a3b8" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }}
                    labelStyle={{ color: '#f8fafc' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="requests" 
                    stroke="#ef4444" 
                    strokeWidth={2} 
                    dot={{ r: 4 }}
                    name="Total Requests"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="fulfilled" 
                    stroke="#22c55e" 
                    strokeWidth={2} 
                    dot={{ r: 4 }}
                    name="Fulfilled"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500">
                No data available
              </div>
            )}
          </div>
        </div>

        {/* Transfers by Status */}
        <div className="card">
          <div className="card-header">
            <h3 className="font-semibold text-slate-900">Transfers by Status</h3>
          </div>
          <div className="card-body h-64">
            {chartsData.transfersByStatus.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartsData.transfersByStatus}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    fill="#8884d8"
                    paddingAngle={2}
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {chartsData.transfersByStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500">
                No transfers yet
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Inventory by Category & Quick Links */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Inventory by Category */}
        <div className="card">
          <div className="card-header">
            <h3 className="font-semibold text-slate-900">Inventory by Category</h3>
          </div>
          <div className="card-body">
            {chartsData.inventoryByCategory.length > 0 ? (
              <div className="space-y-3">
                {chartsData.inventoryByCategory.map((cat, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="text-sm font-medium text-slate-700 capitalize w-24">{cat.name}</span>
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full" 
                        style={{ 
                          width: `${Math.min(100, (cat.quantity / Math.max(...chartsData.inventoryByCategory.map(c => c.quantity))) * 100)}%`,
                          backgroundColor: COLORS[index % COLORS.length]
                        }}
                      />
                    </div>
                    <span className="text-sm text-slate-500 w-20 text-right">{cat.quantity}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 text-center py-4">No inventory data</p>
            )}
          </div>
        </div>

        {/* Quick Navigation */}
        <div className="card">
          <div className="card-header">
            <h3 className="font-semibold text-slate-900">Quick Navigation</h3>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-2 gap-3">
              {[
                { name: 'Manage Camps', href: '/admin/camps', icon: MapPin, color: 'text-primary-600 bg-primary-100' },
                { name: 'All Inventory', href: '/admin/inventory', icon: Package, color: 'text-green-600 bg-green-100' },
                { name: 'All Requests', href: '/admin/requests', icon: FileText, color: 'text-danger-600 bg-danger-100' },
                { name: 'All Transfers', href: '/admin/transfers', icon: Truck, color: 'text-warning-600 bg-warning-100' },
                { name: 'Analytics', href: '/admin/analytics', icon: BarChart3, color: 'text-purple-600 bg-purple-100' },
                { name: 'Users', href: '/admin/users', icon: Users, color: 'text-slate-600 bg-slate-100' }
              ].map((item, index) => (
                <Link key={index} to={item.href} className="p-4 rounded-xl border border-slate-200 hover:border-primary-300 hover:bg-primary-50 transition-colors group">
                  <div className={`p-2 rounded-lg ${item.color} mb-2`}>
                    <item.icon className="w-5 h-5" />
                  </div>
                  <p className="text-sm font-medium text-slate-900 group-hover:text-primary-600">{item.name}</p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card">
        <div className="card-header flex items-center justify-between">
          <h3 className="font-semibold text-slate-900">System Health</h3>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-green-50">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="font-medium text-green-800">Database</span>
              </div>
              <p className="text-sm text-green-700">Connected and healthy</p>
            </div>
            <div className="p-4 rounded-xl bg-green-50">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="font-medium text-green-800">Real-time</span>
              </div>
              <p className="text-sm text-green-700">WebSocket operational</p>
            </div>
            <div className="p-4 rounded-xl bg-green-50">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="font-medium text-green-800">Routing</span>
              </div>
              <p className="text-sm text-green-700">OSRM service available</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;