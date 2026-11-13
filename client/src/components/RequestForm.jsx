import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useRequestStore } from '../store/requestStore';
import toast from 'react-hot-toast';

const RequestForm = ({ initialData, camps, onClose, onSuccess }) => {
  const { createRequest, updateRequest } = useRequestStore();
  
  const isEditing = !!initialData;
  const [formData, setFormData] = useState({
    campId: initialData?.campId?._id || initialData?.campId || '',
    category: initialData?.category || 'food',
    itemName: initialData?.itemName || '',
    quantityNeeded: initialData?.quantityNeeded || 1,
    unit: initialData?.unit || 'units',
    urgency: initialData?.urgency || 'medium',
    description: initialData?.description || ''
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = () => {
    const newErrors = {};
    if (!formData.campId) newErrors.campId = 'Camp is required';
    if (!formData.itemName.trim()) newErrors.itemName = 'Item name is required';
    if (formData.quantityNeeded < 1) newErrors.quantityNeeded = 'Quantity must be at least 1';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      if (isEditing) {
        await updateRequest(initialData._id, formData);
        toast.success('Request updated');
      } else {
        await createRequest(formData);
        toast.success('Request created');
      }
      onSuccess();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const categories = [
    { value: 'food', label: 'Food' },
    { value: 'water', label: 'Water' },
    { value: 'medicine', label: 'Medicine' },
    { value: 'shelter', label: 'Shelter' },
    { value: 'other', label: 'Other' }
  ];

  const urgencies = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'critical', label: 'Critical' }
  ];

  const units = ['units', 'kg', 'liters'];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50" onClick={onClose} />
        <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-slate-200 sticky top-0 bg-white z-10">
            <h2 className="text-lg font-semibold text-slate-900">
              {isEditing ? 'Edit Request' : 'Create New Request'}
            </h2>
            <button onClick={onClose} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label htmlFor="campId" className="label">Camp *</label>
                <select
                  id="campId"
                  name="campId"
                  value={formData.campId}
                  onChange={handleChange}
                  className={`input ${errors.campId ? 'input-error' : ''}`}
                  required
                >
                  <option value="">Select camp...</option>
                  {camps.map(camp => (
                    <option key={camp._id} value={camp._id}>{camp.name}</option>
                  ))}
                </select>
                {errors.campId && <p className="mt-1 text-sm text-danger-600">{errors.campId}</p>}
              </div>

              <div>
                <label htmlFor="category" className="label">Category *</label>
                <select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="input"
                  required
                >
                  {categories.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="itemName" className="label">Item Name *</label>
                <input
                  id="itemName"
                  name="itemName"
                  type="text"
                  value={formData.itemName}
                  onChange={handleChange}
                  className={`input ${errors.itemName ? 'input-error' : ''}`}
                  placeholder="e.g., Rice bags, Water bottles, Paracetamol"
                  required
                />
                {errors.itemName && <p className="mt-1 text-sm text-danger-600">{errors.itemName}</p>}
              </div>

              <div>
                <label htmlFor="quantityNeeded" className="label">Quantity Needed *</label>
                <input
                  id="quantityNeeded"
                  name="quantityNeeded"
                  type="number"
                  min="1"
                  value={formData.quantityNeeded}
                  onChange={handleChange}
                  className={`input ${errors.quantityNeeded ? 'input-error' : ''}`}
                  required
                />
                {errors.quantityNeeded && <p className="mt-1 text-sm text-danger-600">{errors.quantityNeeded}</p>}
              </div>

              <div>
                <label htmlFor="unit" className="label">Unit</label>
                <select
                  id="unit"
                  name="unit"
                  value={formData.unit}
                  onChange={handleChange}
                  className="input"
                >
                  {units.map(unit => (
                    <option key={unit} value={unit}>{unit}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="urgency" className="label">Urgency *</label>
                <select
                  id="urgency"
                  name="urgency"
                  value={formData.urgency}
                  onChange={handleChange}
                  className="input"
                  required
                >
                  {urgencies.map(u => (
                    <option key={u.value} value={u.value}>{u.label}</option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="description" className="label">Description (Optional)</label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  className="input min-h-[100px] resize-y"
                  placeholder="Additional details about the request..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
              <button type="button" onClick={onClose} className="btn-secondary">
                Cancel
              </button>
              <button type="submit" disabled={isSubmitting} className="btn-primary">
                {isSubmitting ? 'Saving...' : (isEditing ? 'Update' : 'Create')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RequestForm;