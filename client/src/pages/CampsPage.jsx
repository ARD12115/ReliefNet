import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, MapPin, Users, Package, FileText, Truck, MoreVertical, Edit, Trash2, Eye, X, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { useCampStore } from '../store/campStore';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

const CampDetailModal = ({ camp, onClose, onEdit, onDelete }) => {
  const { fetchCampStats } = useCampStore();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (camp) {
      fetchCampStats(camp.id)
        .then(data => { setStats(data); setLoading(false); })
        .catch(() => setLoading(false));
    }
  }, [camp, fetchCampStats]);

  if (!camp) return null;

  const statusColors = {
    active: 'badge-success',
    inactive: 'badge-ink',
    full: 'badge-warning',
    evacuated: 'badge-danger',
    evacuating: 'badge-warning',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="card-header flex items-center justify-between sticky top-0 z-10">
          <h3 className="font-semibold text-slate-900">{camp.name}</h3>
          <button onClick={onClose} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="card-body p-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase">Status</p>
              <span className={`badge capitalize ${statusColors[camp.status] || 'badge-ink'}`}>
                {camp.status}
              </span>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase">Managed By</p>
              <p className="text-slate-900 font-medium">{camp.manager?.name || 'Unassigned'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase">Capacity</p>
              <p className="text-slate-900 font-medium">{camp.capacity || 'Not set'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase">Current Population</p>
              <p className="text-slate-900 font-medium">{camp.currentPopulation || 0}</p>
            </div>
            <div className="md:col-span-2">
              <p className="text-xs font-semibold text-slate-500 uppercase">Location</p>
              <div className="flex items-center gap-2 text-slate-700">
                <MapPin className="w-4 h-4 text-slate-400" />
                <span>{camp.address || `${camp.latitude?.toFixed(4)}, ${camp.longitude?.toFixed(4)}`}</span>
              </div>
            </div>
            <div className="md:col-span-2">
              <p className="text-xs font-semibold text-slate-500 uppercase">Contact</p>
              <div className="space-y-1 text-slate-700">
                {camp.contactPerson && <p><span className="font-medium">Person:</span> {camp.contactPerson}</p>}
                {camp.contactPhone && <p><span className="font-medium">Phone:</span> {camp.contactPhone}</p>}
                {camp.contactEmail && <p><span className="font-medium">Email:</span> {camp.contactEmail}</p>}
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="border-t border-slate-200 pt-6">
            <h4 className="font-semibold text-slate-900 mb-4">Camp Statistics</h4>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-500 border-t-transparent" />
              </div>
            ) : stats ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-lg bg-slate-50">
                  <p className="text-xs font-semibold text-slate-500 uppercase">Inventory Items</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{stats.inventoryCount || 0}</p>
                </div>
                <div className="p-4 rounded-lg bg-slate-50">
                  <p className="text-xs font-semibold text-slate-500 uppercase">Total Requests</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{stats.requestCount || 0}</p>
                </div>
                <div className="p-4 rounded-lg bg-slate-50">
                  <p className="text-xs font-semibold text-slate-500 uppercase">Transfers Out</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{stats.transferOutCount || 0}</p>
                </div>
                <div className="p-4 rounded-lg bg-slate-50">
                  <p className="text-xs font-semibold text-slate-500 uppercase">Transfers In</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{stats.transferInCount || 0}</p>
                </div>
              </div>
            ) : (
              <p className="text-slate-500 text-center py-4">Failed to load statistics</p>
            )}
          </div>
        </div>
        <div className="card-footer border-t border-slate-200">
          <button onClick={() => { onEdit(camp); onClose(); }} className="btn-secondary">
            <Edit className="w-4 h-4" /> Edit Camp
          </button>
          <button onClick={() => { onDelete(camp.id); onClose(); }} className="btn-danger">
            <Trash2 className="w-4 h-4" /> Delete
          </button>
        </div>
      </div>
    </div>
  );
};

const CampsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { camps, fetchCamps, deleteCamp, isLoading, error } = useCampStore();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedCamp, setSelectedCamp] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const statusOptions = ['active', 'inactive', 'full', 'evacuated', 'evacuating'];

  useEffect(() => {
    fetchCamps({ search, status: statusFilter, page, limit: 20 })
      .then(data => { setTotalPages(data.pagination?.pages || 1); })
      .catch(() => {});
  }, [search, statusFilter, page, fetchCamps]);

  const handleDelete = async (id) => {
    try {
      await deleteCamp(id);
      toast.success('Camp deleted successfully');
      setDeleteConfirm(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete camp');
    }
  };

  const handleView = (camp) => setSelectedCamp(camp);
  const handleEdit = (camp) => navigate(`/admin/camps/${camp.id}/edit`);
  const handleConfirmDelete = (id) => setDeleteConfirm(id);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Camps Management</h1>
          <p className="text-slate-500 mt-1">Manage relief camps across the network</p>
        </div>
        <Link to="/admin/camps/new" className="btn-primary w-full sm:w-auto">
          <Plus className="w-4 h-4" /> New Camp
        </Link>
      </div>

      {/* Toolbar */}
      <div className="card">
        <div className="card-body">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search camps by name or address..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="input pl-10"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                className="input pl-10 pr-8 w-full sm:w-48"
              >
                <option value="">All Status</option>
                {statusOptions.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </select>
            </div>
            <button
              onClick={() => fetchCamps({ search, status: statusFilter, page, limit: 20 })}
              className="btn-ghost text-xs"
            >
              <RefreshCw className="w-4 h-4" /> Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Camps Table */}
      <div className="card">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-500 border-t-transparent" />
          </div>
        ) : camps.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <MapPin className="w-8 h-8" />
            </div>
            <p className="empty-state-title">No camps found</p>
            <p className="empty-state-desc">
              {search || statusFilter ? 'Try adjusting your search or filter' : 'Create your first camp to get started'}
            </p>
            {!search && !statusFilter && (
              <Link to="/admin/camps/new" className="btn-primary mt-4">
                <Plus className="w-4 h-4" /> Create Camp
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Camp</th>
                    <th>Location</th>
                    <th>Status</th>
                    <th>Capacity / Population</th>
                    <th>Manager</th>
                    <th>Stats</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {camps.map(camp => (
                    <tr key={camp.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
                            <MapPin className="w-5 h-5 text-primary-600" />
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">{camp.name}</p>
                            <p className="text-xs text-slate-500">{camp.id.slice(0, 8)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="text-slate-600 max-w-xs truncate">
                        {camp.address || `${camp.latitude?.toFixed(4)}, ${camp.longitude?.toFixed(4)}`}
                      </td>
                      <td>
                        <span className={`badge capitalize ${{
                          active: 'badge-success',
                          inactive: 'badge-ink',
                          full: 'badge-warning',
                          evacuated: 'badge-danger',
                          evacuating: 'badge-warning'
                        }[camp.status] || 'badge-ink'}`}>
                          {camp.status}
                        </span>
                      </td>
                      <td className="text-slate-600">
                        {camp.capacity ? `${camp.currentPopulation || 0} / ${camp.capacity}` : 'Not set'}
                      </td>
                      <td className="text-slate-600">{camp.manager?.name || 'Unassigned'}</td>
                      <td className="text-slate-600">
                        <button
                          onClick={() => handleView(camp)}
                          className="text-primary-600 hover:text-primary-800 text-sm font-medium"
                        >
                          View Details
                        </button>
                      </td>
                      <td>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleView(camp)}
                            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                            title="View"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {user.role === 'admin' && (
                            <>
                              <button
                                onClick={() => handleEdit(camp)}
                                className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                                title="Edit"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleConfirmDelete(camp.id)}
                                className="p-2 rounded-lg text-slate-500 hover:bg-danger-50 hover:text-danger-600"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="card-footer flex items-center justify-between">
                <p className="text-sm text-slate-500">Page {page} of {totalPages}</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Camp Detail Modal */}
      {selectedCamp && (
        <CampDetailModal
          camp={selectedCamp}
          onClose={() => setSelectedCamp(null)}
          onEdit={handleEdit}
          onDelete={handleConfirmDelete}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Delete Camp</h3>
            <p className="text-slate-600 mb-6">Are you sure you want to delete this camp? This action cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="btn-secondary">Cancel</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="btn-danger">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CampsPage;