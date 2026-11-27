import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  Filter, 
  Users, 
  Mail, 
  Shield, 
  UserCheck, 
  UserX, 
  MoreVertical, 
  Edit, 
  Eye, 
  X, 
  ChevronLeft, 
  ChevronRight,
  Loader2,
  UserPlus,
  AlertCircle
} from 'lucide-react';
import { useUserStore } from '../store/userStore';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

const UserDetailModal = ({ user, onClose, onEdit, onDeactivate, onActivate }) => {
  if (!user) return null;

  const roleColors = {
    admin: 'badge-danger',
    dispatcher: 'badge-warning',
    coordinator: 'badge-primary'
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="card-header flex items-center justify-between sticky top-0 z-10">
          <h3 className="font-semibold text-slate-900">User Details</h3>
          <button onClick={onClose} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="card-body p-6 space-y-5">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center">
              <span className="text-2xl font-medium text-primary-700">
                {user.name?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <p className="text-xl font-bold text-slate-900">{user.name}</p>
              <p className="text-slate-500">{user.email}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase">Role</p>
              <span className={`badge capitalize ${roleColors[user.role] || 'badge-ink'}`}>
                {user.role}
              </span>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase">Status</p>
              <span className={`badge ${user.isActive ? 'badge-success' : 'badge-danger'}`}>
                {user.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase">Camp</p>
              <p className="text-slate-900 font-medium">{user.camp?.name || 'Unassigned'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase">Phone</p>
              <p className="text-slate-700">{user.phone || 'Not provided'}</p>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-4">
            <p className="text-xs font-semibold text-slate-500 uppercase">Account</p>
            <div className="space-y-1 text-sm text-slate-700 mt-2">
              <p><span className="font-medium">Created:</span> {new Date(user.createdAt).toLocaleDateString()}</p>
              <p><span className="font-medium">Last Login:</span> {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : 'Never'}</p>
              <p><span className="font-medium">ID:</span> {user.id}</p>
            </div>
          </div>
        </div>
        <div className="card-footer border-t border-slate-200 flex flex-col sm:flex-row gap-3">
          <button onClick={() => { onEdit(user); onClose(); }} className="btn-secondary flex-1">
            <Edit className="w-4 h-4" /> Edit
          </button>
          {user.isActive ? (
            <button onClick={() => { onDeactivate(user.id); onClose(); }} className="btn-danger flex-1">
              <UserX className="w-4 h-4" /> Deactivate
            </button>
          ) : (
            <button onClick={() => { onActivate(user.id); onClose(); }} className="btn-success flex-1">
              <UserCheck className="w-4 h-4" /> Activate
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const EditUserModal = ({ user, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    role: user?.role || 'coordinator',
    campId: user?.campId || '',
    isActive: user?.isActive !== false,
  });
  const [camps, setCamps] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Fetch camps for dropdown
    const fetchCamps = async () => {
      try {
        const response = await fetch('/api/camps?limit=100');
        const data = await response.json();
        if (data.success) setCamps(data.data.camps);
      } catch (err) {
        console.error('Failed to fetch camps:', err);
      }
    };
    fetchCamps();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(user.id, formData);
      onClose();
    } catch (err) {
      // Error handled in store
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? e.target.checked : value }));
  };

  if (!user) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="card-header flex items-center justify-between sticky top-0 z-10">
          <h3 className="font-semibold text-slate-900">Edit User</h3>
          <button onClick={onClose} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="card-body p-6 space-y-5">
          <div>
            <label className="label">Name</label>
            <input
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="input w-full"
              required
            />
          </div>
          <div>
            <label className="label">Phone</label>
            <input
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleChange}
              className="input w-full"
              placeholder="+1234567890"
            />
          </div>
          <div>
            <label className="label">Role</label>
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="input w-full"
            >
              <option value="coordinator">Coordinator</option>
              <option value="dispatcher">Dispatcher</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div>
            <label className="label">Camp Assignment</label>
            <select
              name="campId"
              value={formData.campId}
              onChange={handleChange}
              className="input w-full"
            >
              <option value="">Unassigned</option>
              {camps.map(camp => (
                <option key={camp.id} value={camp.id}>{camp.name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input
              name="isActive"
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={handleChange}
              className="w-4 h-4 text-primary-600 border-slate-300 rounded focus:ring-primary-500"
            />
            <label htmlFor="isActive" className="text-sm font-medium text-slate-700">
              Active
            </label>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const InviteUserModal = ({ onClose, onInvite }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'coordinator',
    campId: '',
    phone: '',
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  const camps = [
    { id: 'camp-1', name: 'North Relief Camp' },
    { id: 'camp-2', name: 'South Relief Camp' },
    { id: 'camp-3', name: 'East Relief Camp' },
  ];

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name) newErrors.name = 'Name is required';
    if (!formData.email) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Invalid email';
    if (!formData.role) newErrors.role = 'Role is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const response = await onInvite(formData);
      setResult(response.data);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to invite user');
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  if (result) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <UserCheck className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">User Invited Successfully</h3>
            <p className="text-slate-600 mt-2">Share the temporary password securely with the user.</p>
          </div>
          
          <div className="bg-slate-50 rounded-lg p-4 mb-6 space-y-3">
            <div><span className="font-medium">Name:</span> <span className="ml-2">{result.user.name}</span></div>
            <div><span className="font-medium">Email:</span> <span className="ml-2">{result.user.email}</span></div>
            <div><span className="font-medium">Role:</span> <span className="ml-2 capitalize">{result.user.role}</span></div>
            <div className="border-t border-slate-200 pt-2">
              <span className="font-medium">Temporary Password:</span>
              <code className="ml-2 text-primary-600 bg-white px-2 py-1 rounded border">{result.tempPassword}</code>
            </div>
          </div>
          
          <div className="flex justify-end gap-3">
            <button onClick={onClose} className="btn-primary w-full sm:w-auto">Done</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="card-header flex items-center justify-between sticky top-0 z-10">
          <h3 className="font-semibold text-slate-900">Invite New User</h3>
          <button onClick={onClose} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="card-body p-6 space-y-4">
          <div>
            <label className="label">Full Name</label>
            <input
              name="name"
              value={formData.name}
              onChange={handleChange}
              className={`input ${errors.name ? 'input-error' : ''}`}
              placeholder="John Coordinator"
              required
            />
            {errors.name && <p className="mt-1 text-sm text-danger-600">{errors.name}</p>}
          </div>
          <div>
            <label className="label">Email</label>
            <input
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              className={`input ${errors.email ? 'input-error' : ''}`}
              placeholder="john@reliefnet.org"
              required
            />
            {errors.email && <p className="mt-1 text-sm text-danger-600">{errors.email}</p>}
          </div>
          <div>
            <label className="label">Role</label>
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              className={`input ${errors.role ? 'input-error' : ''}`}
              required
            >
              <option value="coordinator">Coordinator</option>
              <option value="dispatcher">Dispatcher</option>
              <option value="admin">Admin</option>
            </select>
            {errors.role && <p className="mt-1 text-sm text-danger-600">{errors.role}</p>}
          </div>
          <div>
            <label className="label">Camp (optional)</label>
            <select
              name="campId"
              value={formData.campId}
              onChange={handleChange}
              className="input"
            >
              <option value="">No camp assigned</option>
              {camps.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Phone (optional)</label>
            <input
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleChange}
              className="input"
              placeholder="+1234567890"
            />
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
              <div className="text-sm text-amber-800">
                <p className="font-medium">A temporary password will be generated.</p>
                <p className="mt-1">Share it securely with the user. They must change it on first login.</p>
              </div>
            </div>
          </div>
        </form>
        <div className="card-footer border-t border-slate-200 flex justify-end gap-3">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" form="invite-form" disabled={submitting} className="btn-primary">
            {submitting ? (
              <> <Loader2 className="w-4 h-4 animate-spin" /> Inviting... </>
            ) : (
              <> <UserPlus className="w-4 h-4" /> Invite User </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

const UsersPage = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { users, fetchUsers, updateUser, deleteUser, inviteUser, deactivateUser, activateUser, isLoading, error, pagination } = useUserStore();

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState(null);
  const [editUser, setEditUser] = useState(null);
  const [showInviteModal, setShowInviteModal] = useState(false);

  const roleOptions = ['coordinator', 'dispatcher', 'admin'];

  useEffect(() => {
    fetchUsers({ search, role: roleFilter, isActive: statusFilter, page, limit: 20 })
      .then(data => { })
      .catch(() => {});
  }, [search, roleFilter, statusFilter, page, fetchUsers]);

  const handleView = (user) => setSelectedUser(user);
  const handleEdit = (user) => setEditUser(user);
  const handleDeactivate = async (id) => {
    try {
      await deactivateUser(id);
      toast.success('User deactivated successfully');
    } catch (err) {
      // Error handled in store
    }
  };
  const handleActivate = async (id) => {
    try {
      await activateUser(id);
      toast.success('User activated successfully');
    } catch (err) {
      // Error handled in store
    }
  };
  const handleSaveUser = async (id, data) => {
    await updateUser(id, data);
    toast.success('User updated successfully');
  };

  const handleInvite = async (data) => {
    return await inviteUser(data);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">User Management</h1>
          <p className="text-slate-500 mt-1">Manage system users and their roles</p>
        </div>
              <div className="flex gap-2">
                <button onClick={() => setShowInviteModal(true)} className="btn-primary">
                  <UserPlus className="w-4 h-4" /> Invite User
                </button>
              </div>
            </div>

      {/* Toolbar */}
      <div className="card">
        <div className="card-body">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search users by name or email..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="input pl-10"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <select
                value={roleFilter}
                onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
                className="input pl-10 pr-8 w-full sm:w-40"
              >
                <option value="">All Roles</option>
                {roleOptions.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
              </select>
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                className="input pl-10 pr-8 w-full sm:w-36"
              >
                <option value="">All Status</option>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="card">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-500 border-t-transparent" />
          </div>
        ) : users.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <Users className="w-8 h-8" />
            </div>
            <p className="empty-state-title">No users found</p>
            <p className="empty-state-desc">
              {search || roleFilter || statusFilter ? 'Try adjusting your search or filter' : 'Invite your first user to get started'}
            </p>
            {!search && !roleFilter && !statusFilter && (
              <Link to="/auth/register" className="btn-primary mt-4">
                <Plus className="w-4 h-4" /> Invite User
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Role</th>
                    <th>Camp</th>
                    <th>Status</th>
                    <th>Last Login</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                            <span className="text-sm font-medium text-primary-700">
                              {user.name?.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">{user.name}</p>
                            <p className="text-xs text-slate-500">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`badge capitalize ${{
                          admin: 'badge-danger',
                          dispatcher: 'badge-warning',
                          coordinator: 'badge-primary'
                        }[user.role] || 'badge-ink'}`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="text-slate-600">{user.camp?.name || 'Unassigned'}</td>
                      <td>
                        <span className={`badge ${user.isActive ? 'badge-success' : 'badge-danger'}`}>
                          {user.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="text-slate-600">
                        {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : 'Never'}
                      </td>
                      <td>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleView(user)}
                            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                            title="View"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleEdit(user)}
                            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination && pagination.pages > 1 && (
              <div className="card-footer flex items-center justify-between">
                <p className="text-sm text-slate-500">Page {pagination.page} of {pagination.pages} ({pagination.total} total)</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={pagination.page === 1}
                    className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
                    disabled={pagination.page === pagination.pages}
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

      {/* User Detail Modal */}
      {selectedUser && (
        <UserDetailModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onEdit={handleEdit}
          onDeactivate={handleDeactivate}
          onActivate={handleActivate}
        />
      )}

      {/* Edit User Modal */}
      {editUser && (
        <EditUserModal
          user={editUser}
          onClose={() => setEditUser(null)}
          onSave={handleSaveUser}
        />
      )}

      {/* Invite User Modal */}
      {showInviteModal && (
        <InviteUserModal
          onClose={() => setShowInviteModal(false)}
          onInvite={handleInvite}
        />
      )}
    </div>
  );
};

export default UsersPage;