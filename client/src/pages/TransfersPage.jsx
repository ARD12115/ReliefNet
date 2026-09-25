import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  Filter, 
  Truck,
  Clock,
  CheckCircle,
  XCircle,
  User,
  MapPin,
  Navigation
} from 'lucide-react';
import { useTransferStore } from '../store/transferStore';
import { useCampStore } from '../store/campStore';
import { formatDateTime, getStatusColor, getPriorityColor } from '../utils/helpers';
import TransferCard from '../components/TransferCard';
import toast from 'react-hot-toast';

const TransfersPage = () => {
  const { 
    transfers, 
    fetchTransfers, 
    assignTransfer, 
    updateTransferStatus,
    deleteTransfer,
    isLoading 
  } = useTransferStore();
  const { camps } = useCampStore();
  
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [assigningTransferId, setAssigningTransferId] = useState(null);
  const [dispatchers] = useState([
    { _id: '1', name: 'John Dispatcher', email: 'john@reliefnet.org' },
    { _id: '2', name: 'Jane Logistics', email: 'jane@reliefnet.org' }
  ]);

  useEffect(() => {
    fetchTransfers({ limit: 100 });
  }, [fetchTransfers]);

  const filteredTransfers = transfers.filter(t => {
    if (search && !t.fromCampId?.name?.toLowerCase().includes(search.toLowerCase()) &&
        !t.toCampId?.name?.toLowerCase().includes(search.toLowerCase()) &&
        !t.itemName?.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter && t.status !== statusFilter) return false;
    if (priorityFilter && t.priority !== priorityFilter) return false;
    return true;
  });

  const statusTabs = [
    { id: 'all', label: 'All' },
    { id: 'proposed', label: 'Proposed' },
    { id: 'assigned', label: 'Assigned' },
    { id: 'in_transit', label: 'In Transit' },
    { id: 'delivered', label: 'Delivered' },
    { id: 'cancelled', label: 'Cancelled' }
  ];

  const handleAssign = async (transferId, assignedToId) => {
    try {
      await assignTransfer(transferId, assignedToId);
      toast.success('Transfer assigned');
      setAssigningTransferId(null);
    } catch (error) {
      toast.error('Failed to assign');
    }
  };

  const handleStatusUpdate = async (transferId, status) => {
    let reason = '';
    if (status === 'cancelled' || status === 'failed') {
      reason = prompt(`Reason for ${status}:`);
      if (!reason) return;
    }
    try {
      await updateTransferStatus(transferId, status, '', reason);
      toast.success(`Transfer ${status.replace('_', ' ')}`);
    } catch (error) {
      toast.error('Failed to update');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this transfer?')) return;
    try {
      await deleteTransfer(id);
      toast.success('Deleted');
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Transfers</h1>
          <p className="text-slate-500 mt-1">Track and manage relief transfers</p>
        </div>
        <Link to="/coordinator/transfers/new" className="btn-primary">
          <Plus className="w-4 h-4" /> Manual Transfer
        </Link>
      </div>

      <div className="card">
        <div className="card-body">
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search transfers..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input pl-10"
              />
            </div>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input w-auto">
              <option value="">All Status</option>
              <option value="proposed">Proposed</option>
              <option value="assigned">Assigned</option>
              <option value="in_transit">In Transit</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className="input w-auto">
              <option value="">All Priority</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          <div className="flex flex-wrap gap-1 mb-4">
            {statusTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id === 'all' ? '' : tab.id)}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  (statusFilter === tab.id || (tab.id === 'all' && !statusFilter))
                    ? 'bg-primary-600 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-500 border-t-transparent mx-auto mb-2" />
              <p className="text-slate-500">Loading...</p>
            </div>
          ) : filteredTransfers.length === 0 ? (
            <div className="p-8 text-center">
              <Truck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-slate-900 mb-1">No transfers found</h3>
              <p className="text-slate-500">Try adjusting your filters</p>
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

export default TransfersPage;