import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Truck, ArrowLeft, MapPin, Package, Clock, AlertTriangle } from 'lucide-react';
import { useTransferStore } from '../store/transferStore';
import { useCampStore } from '../store/campStore';
import { useRequestStore } from '../store/requestStore';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

const CreateTransfer = () => {
  const navigate = useNavigate();
  const { createManualTransfer, isLoading: transfersLoading } = useTransferStore();
  const { camps, fetchCamps, isLoading: campsLoading } = useCampStore();
  const { requests, fetchRequests, isLoading: requestsLoading } = useRequestStore();
  const { user } = useAuthStore();

  const [formData, setFormData] = useState({
    fromCampId: '',
    toCampId: '',
    requestId: '',
    itemName: '',
    category: 'food',
    quantity: '',
    unit: 'units',
    priority: 'medium',
    notes: '',
  });
  const [errors, setErrors] = useState({});

  const categories = ['food', 'water', 'medicine', 'shelter', 'other', 'clothing', 'sanitation'];
  const units = ['units', 'kg', 'liters', 'boxes', 'packs', 'bottles', 'rolls', 'meters'];
  const priorities = ['low', 'medium', 'high', 'critical'];

  const validateForm = () => {
    const newErrors = {};
    if (!formData.fromCampId) newErrors.fromCampId = 'Source camp is required';
    if (!formData.toCampId) newErrors.toCampId = 'Destination camp is required';
    if (!formData.itemName) newErrors.itemName = 'Item name is required';
    if (!formData.quantity || parseInt(formData.quantity) < 1) newErrors.quantity = 'Valid quantity is required';
    if (!formData.category) newErrors.category = 'Category is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      await createManualTransfer({
        fromCampId: formData.fromCampId,
        toCampId: formData.toCampId,
        requestId: formData.requestId || undefined,
        itemName: formData.itemName,
        category: formData.category,
        quantity: parseInt(formData.quantity),
        unit: formData.unit,
        priority: formData.priority,
        notes: formData.notes,
      });
      toast.success('Transfer created successfully');
      navigate('/coordinator/transfers');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create transfer');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  if (campsLoading || requestsLoading || transfersLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-2 mb-6">
          <Link to="/coordinator/transfers" className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">Create Transfer</h1>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-5">
          <div className="card-body space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="label">Source Camp</label>
                <select
                  name="fromCampId"
                  value={formData.fromCampId}
                  onChange={handleChange}
                  className="input w-full"
                >
                  <option value="">Select source camp</option>
                  {camps.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                {errors.fromCampId && <p className="mt-1 text-sm text-danger-600">{errors.fromCampId}</p>}
              </div>
              <div>
                <label className="label">Destination Camp</label>
                <select
                  name="toCampId"
                  value={formData.toCampId}
                  onChange={handleChange}
                  className="input w-full"
                >
                  <option value="">Select destination camp</option>
                  {camps.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                {errors.toCampId && <p className="mt-1 text-sm text-danger-600">{errors.toCampId}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="label">Related Request (optional)</label>
                <select
                  name="requestId"
                  value={formData.requestId}
                  onChange={handleChange}
                  className="input w-full"
                >
                  <option value="">No related request</option>
                  {requests.map(r => (
                    <option key={r.id} value={r.id}>{r.itemName} - {r.campId?.name || 'Unknown Camp'}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Priority</label>
                <select
                  name="priority"
                  value={formData.priority}
                  onChange={handleChange}
                  className="input w-full"
                >
                  {priorities.map(p => (
                    <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="label">Item Name</label>
                <input
                  name="itemName"
                  value={formData.itemName}
                  onChange={handleChange}
                  className={`input w-full ${errors.itemName ? 'input-error' : ''}`}
                  placeholder="e.g. Rice bags"
                  required
                />
                {errors.itemName && <p className="mt-1 text-sm text-danger-600">{errors.itemName}</p>}
              </div>
              <div>
                <label className="label">Category</label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="input w-full"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div>
                <label className="label">Quantity</label>
                <input
                  name="quantity"
                  type="number"
                  min="1"
                  value={formData.quantity}
                  onChange={handleChange}
                  className={`input w-full ${errors.quantity ? 'input-error' : ''}`}
                  placeholder="e.g. 50"
                  required
                />
                {errors.quantity && <p className="mt-1 text-sm text-danger-600">{errors.quantity}</p>}
              </div>
              <div>
                <label className="label">Unit</label>
                <select
                  name="unit"
                  value={formData.unit}
                  onChange={handleChange}
                  className="input w-full"
                >
                  {units.map(u => (
                    <option key={u} value={u}>{u.charAt(0).toUpperCase() + u.slice(1)}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="label">Notes (optional)</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                className="input w-full"
                rows={3}
                placeholder="Additional notes about this transfer..."
              />
            </div>
          </div>

          <div className="card-footer flex justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate('/coordinator/transfers')}
              className="btn-ghost"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={transfersLoading}
              className="btn-primary w-auto py-3"
            >
              {transfersLoading ? 'Creating...' : 'Create Transfer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateTransfer;
