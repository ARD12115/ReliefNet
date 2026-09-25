import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Truck, 
  FileText, 
  MapPin, 
  Clock, 
  CheckCircle, 
  XCircle,
  AlertTriangle,
  User,
  Loader2,
  Filter,
  MoreVertical
} from 'lucide-react';
import { useTransferStore } from '../store/transferStore';
import { useRequestStore } from '../store/requestStore';
import { useCampStore } from '../store/campStore';
import { useAuthStore } from '../store/authStore';
import { useTransferSocket, useDispatcherSocket } from '../hooks/useSocket';
import { formatDistanceToNow } from 'date-fns';
import TransferCard from '../components/TransferCard';
import MatchCard from '../components/MatchCard';
import toast from 'react-hot-toast';

const DispatchDashboard = () => {
  const { user } = useAuthStore();
  const { 
    transfers, 
    fetchTransfers, 
    fetchStats, 
    assignTransfer, 
    updateTransferStatus,
    isLoading: transfersLoading 
  } = useTransferStore();
  const { requests, fetchRequests, fetchStats: fetchRequestStats } = useRequestStore();
  const { camps, fetchCamps } = useCampStore();
  
  const [stats, setStats] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [filters, setFilters] = useState({ status: '', priority: '', search: '' });
  const [assigningTransferId, setAssigningTransferId] = useState(null);
  const [dispatchers, setDispatchers] = useState([]);

  useEffect(() => {
    fetchTransfers();
    fetchStats();
    fetchRequests({ limit: 100 });
    fetchRequestStats();
    fetchCamps();
    // Fetch dispatchers for assignment
    // This would come from a users API
  }, []);

  // Real-time updates
  useTransferSocket(null, {
    onTransferCreated: () => fetchTransfers(),
    onTransferUpdated: () => fetchTransfers(),
    onTransferAssigned: () => fetchTransfers(),
    onMatchFound: () => fetchTransfers()
  });

  useDispatcherSocket({
    onRequestCreated: () => fetchRequests({ limit: 100 }),
    onRequestUpdated: () => fetchRequests({ limit: 100 })
  });

  useEffect(() => {
    fetchStats().then(data => setStats(data));
  }, []);

  const filteredTransfers = transfers.filter(t => {
    if (filters.status && t.status !== filters.status) return false;
    if (filters.priority && t.priority !== filters.priority) return false;
    if (filters.search) {
      const search = filters.search.toLowerCase();
      return (
        t.fromCampId?.name?.toLowerCase().includes(search) ||
        t.toCampId?.name?.toLowerCase().includes(search) ||
        t.itemName?.toLowerCase().includes(search) ||
        t.requestId?.itemName?.toLowerCase().includes(search)
      );
    }
    return true;
  });

  const statusTabs = [
    { id: 'all', label: 'All', count: transfers.length },
    { id: 'proposed', label: 'Proposed', count: transfers.filter(t => t.status === 'proposed').length },
    { id: 'assigned', label: 'Assigned', count: transfers.filter(t => t.status === 'assigned').length },
    { id: 'in_transit', label: 'In Transit', count: transfers.filter(t => t.status === 'in_transit').length },
    { id: 'delivered', label: 'Delivered', count: transfers.filter(t => t.status === 'delivered').length },
    { id: 'cancelled', label: 'Cancelled', count: transfers.filter(t => t.status === 'cancelled').length }
  ];

  const handleAssign = async (transferId, assignedToId) => {
    try {
      await assignTransfer(transferId, assignedToId);
      toast.success('Transfer assigned successfully');
      setAssigningTransferId(null);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to assign transfer');
    }
  };

  const handleStatusUpdate = async (transferId, status, notes) => {
    try {
      await updateTransferStatus(transferId, status, notes);
      toast.success(`Transfer marked as ${status.replace('_', ' ')}`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update status');
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'critical': return 'text-danger-600 bg-danger-100';
      case 'high': return 'text-warning-600 bg-warning-100';
      case 'medium': return 'text-primary-600 bg-primary-100';
      default: return 'text-slate-600 bg-slate-100';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'proposed': return 'text-slate-600 bg-slate-100';
      case 'assigned': return 'text-primary-600 bg-primary-100';
      case 'in_transit': return 'text-warning-600 bg-warning-100';
      case 'delivered': return 'text-green-600 bg-green-100';
      case 'cancelled': return 'text-danger-600 bg-danger-100';
      case 'failed': return 'text-slate-600 bg-slate-100';
      default: return 'text-slate-600 bg-slate-100';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dispatch Dashboard</h1>
          <p className="text-slate-500 mt-1">Manage and track relief transfers</p>
        </div>
        <div className="flex gap-2">
          <Link to="/dispatcher/transfers/new" className="btn-primary">
            <Truck className="w-4 h-4" /> Manual Transfer
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: 'Proposed', value: stats?.byStatus?.find(s => s._id === 'proposed')?.count || 0, icon: Clock, color: 'text-slate-600 bg-slate-100' },
          { title: 'Assigned', value: stats?.byStatus?.find(s => s._id === 'assigned')?.count || 0, icon: User, color: 'text-primary-600 bg-primary-100' },
          { title: 'In Transit', value: stats?.byStatus?.find(s => s._id === 'in_transit')?.count || 0, icon: Truck, color: 'text-warning-600 bg-warning-100' },
          { title: 'Delivered', value: stats?.totalDelivered || 0, icon: CheckCircle, color: 'text-green-600 bg-green-100' }
        ].map((stat, i) => (
          <div key={i} className="card">
            <div className="card-body">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-slate-500">{stat.title}</p>
                  <p className="text-3xl font-bold text-slate-900 mt-1">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-xl ${stat.color}`}>
                  <stat.icon className="w-6 h-6" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters & Tabs */}
      <div className="card">
        <div className="card-body">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Status Tabs */}
            <div className="flex flex-wrap gap-1">
              {statusTabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                    activeTab === tab.id
                      ? 'bg-primary-600 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {tab.label} <span className="ml-1 px-1.5 py-0.5 text-xs bg-slate-200 rounded">{tab.count}</span>
                </button>
              ))}
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2 sm:ml-auto">
              <select
                value={filters.priority}
                onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value }))}
                className="input w-auto"
              >
                <option value="">All Priorities</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
              <input
                type="text"
                placeholder="Search..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="input w-auto sm:w-48"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Transfers List */}
      <div className="card">
        <div className="card-body p-0">
          {transfersLoading ? (
            <div className="p-8 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary-600 mx-auto mb-2" />
              <p className="text-slate-500">Loading transfers...</p>
            </div>
          ) : filteredTransfers.length === 0 ? (
            <div className="p-8 text-center">
              <Truck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-slate-900 mb-1">No transfers found</h3>
              <p className="text-slate-500">Try adjusting your filters or create a new transfer</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {filteredTransfers.map(transfer => (
                <TransferCard
                  key={transfer._id}
                  transfer={transfer}
                  onAssign={handleAssign}
                  onStatusUpdate={handleStatusUpdate}
                  assigningTransferId={assigningTransferId}
                  setAssigningTransferId={setAssigningTransferId}
                  dispatchers={dispatchers}
                  getPriorityColor={getPriorityColor}
                  getStatusColor={getStatusColor}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DispatchDashboard;