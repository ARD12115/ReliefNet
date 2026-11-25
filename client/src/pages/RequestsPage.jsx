import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  Search,
  Filter,
  AlertTriangle,
  XCircle,
  TrendingDown,
  Eye
} from 'lucide-react';
import { useRequestStore } from '../store/requestStore';
import { useCampStore } from '../store/campStore';
import { formatDateTime, getUrgencyColor, getStatusColor, getCategoryIcon } from '../utils/helpers';
import RequestForm from '../components/RequestForm';
import toast from 'react-hot-toast';

const RequestsPage = () => {
  const { 
    requests, 
    fetchRequests, 
    cancelRequest, 
    isLoading 
  } = useRequestStore();
  const { camps } = useCampStore();
  
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [urgencyFilter, setUrgencyFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingRequest, setEditingRequest] = useState(null);

  useEffect(() => {
    fetchRequests({ limit: 100 });
  }, [fetchRequests]);

  const filteredRequests = requests.filter(request => {
    if (search && !request.itemName.toLowerCase().includes(search.toLowerCase()) && 
        !request.description?.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter && request.status !== statusFilter) return false;
    if (urgencyFilter && request.urgency !== urgencyFilter) return false;
    return true;
  });

  const handleCancel = async (id) => {
    const reason = prompt('Reason for cancellation:');
    if (!reason) return;
    try {
      await cancelRequest(id, reason);
      toast.success('Request cancelled');
    } catch (error) {
      toast.error('Failed to cancel request');
    }
  };

  const statuses = ['open', 'partial', 'matched', 'fulfilled', 'cancelled'];
  const urgencies = ['critical', 'high', 'medium', 'low'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Requests</h1>
          <p className="text-slate-500 mt-1">Manage supply requests and needs</p>
        </div>
        <button onClick={() => { setEditingRequest(null); setShowForm(true); }} className="btn-primary">
          <Plus className="w-4 h-4" /> New Request
        </button>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="card-body">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search requests..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input pl-10"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input w-auto"
            >
              <option value="">All Statuses</option>
              {statuses.map(s => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
            <select
              value={urgencyFilter}
              onChange={(e) => setUrgencyFilter(e.target.value)}
              className="input w-auto"
            >
              <option value="">All Urgencies</option>
              {urgencies.map(u => (
                <option key={u} value={u}>{u.charAt(0).toUpperCase() + u.slice(1)}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Requests Table */}
      <div className="card">
        <div className="card-body p-0">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-500 border-t-transparent mx-auto mb-2" />
              <p className="text-slate-500">Loading requests...</p>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="p-8 text-center">
              <AlertTriangle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-slate-900 mb-1">No requests found</h3>
              <p className="text-slate-500">Try adjusting your filters or create a new request</p>
            </div>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Request</th>
                    <th>Camp</th>
                    <th>Category</th>
                    <th>Needed</th>
                    <th>Fulfilled</th>
                    <th>Urgency</th>
                    <th>Status</th>
                    <th>Requested</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRequests.map(request => (
                    <tr key={request.id}>
                      <td>
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{getCategoryIcon(request.category)}</span>
                          <span className="font-medium text-slate-900">{request.itemName}</span>
                        </div>
                      </td>
                      <td className="text-slate-600">{request.campId?.name || 'N/A'}</td>
                      <td>
                        <span className={`badge capitalize`} style={{ backgroundColor: getCategoryColor(request.category).split(' ')[1], color: getCategoryColor(request.category).split(' ')[0] }}>
                          {request.category}
                        </span>
                      </td>
                      <td className="font-medium text-slate-900">{formatNumber(request.quantityNeeded)} {request.unit}</td>
                      <td className="text-slate-600">{formatNumber(request.quantityFulfilled)} / {formatNumber(request.quantityNeeded)}</td>
                      <td>
                        <span className={`badge ${getUrgencyColor(request.urgency)}`}>
                          {request.urgency}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${getStatusColor(request.status)}`}>
                          {request.status}
                        </span>
                      </td>
                      <td className="text-slate-600">{formatDateTime(request.createdAt)}</td>
                      <td>
                        <div className="flex items-center gap-1">
                          <Link
                            to={`/coordinator/requests/${request.id}`}
                            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                            title="View"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                          {['open', 'partial', 'matched'].includes(request.status) && (
                            <button
                              onClick={() => handleCancel(request.id)}
                              className="p-2 rounded-lg text-slate-500 hover:bg-danger-50 hover:text-danger-600"
                              title="Cancel"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <RequestForm
          initialData={editingRequest}
          camps={camps}
          onClose={() => { setShowForm(false); setEditingRequest(null); }}
          onSuccess={() => { setShowForm(false); setEditingRequest(null); }}
        />
      )}
    </div>
  );
};

export default RequestsPage;