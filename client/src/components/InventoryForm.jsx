import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useInventoryStore } from '../store/inventoryStore';
import { useCampStore } from '../store/campStore';
import toast from 'react-hot-toast';

const InventoryForm = ({ initialData, onClose, onSuccess }) => {
  const { createItem, updateItem } = useInventoryStore();
  const { camps } = useCampStore();
  
  const isEditing = !!initialData;
  const [formData, setFormData] = useState({
    campId: initialData?.campId || '',
    category: initialData?.category || 'food',
    itemName: initialData?.itemName || '',
    quantity: initialData?.quantity || 0,
    unit: initialData?.unit || 'units',
    minimumThreshold: initialData?.minimumThreshold || 10,
    expiryDate: initialData?.expiryDate ? new Date(initialData.expiryDate).toISOString().split('T')[0] : '',
    batchNumber: initialData?.batchNumber || '',
    notes: initialData?.notes || ''
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = () => {
    const newErrors = {};
    if (!formData.campId) newErrors.campId = 'Camp is required';
    if (!formData.itemName.trim()) newErrors.itemName = 'Item name is required';
    if (formData.quantity < 0) newErrors.quantity = 'Quantity cannot be negative';
    if (formData.minimumThreshold < 0) newErrors.minimumThreshold = 'Threshold cannot be negative';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      if (isEditing) {
        await updateItem(initialData.id, formData);
        toast.success('Inventory item updated');
      } else {
        await createItem(formData);
        toast.success('Inventory item created');
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

  const units = [
    'units', 'kg', 'liters'
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50" onClick={onClose} />
        <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-200 sticky top-0 bg-white z-10">
            <h2 className="text-lg font-semibold text-slate-900">
              {isEditing ? 'Edit Inventory Item' : 'Add Inventory Item'}
            </h2>
            <button onClick={onClose} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Camp */}
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
                    <option key={camp.id} value={camp.id}>{camp.name}</option>
                  ))}
                </select>
                {errors.campId && <p className="mt-1 text-sm text-danger-600">{errors.campId}</p>}
              </div>

              {/* Category */}
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

              {/* Item Name */}
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

              {/* Quantity */}
              <div>
                <label htmlFor="quantity" className="label">Quantity *</label>
                <input
                  id="quantity"
                  name="quantity"
                  type="number"
                  min="0"
                  value={formData.quantity}
                  onChange={handleChange}
                  className={`input ${errors.quantity ? 'input-error' : ''}`}
                  required
                />
                {errors.quantity && <p className="mt-1 text-sm text-danger-600">{errors.quantity}</p>}
              </div>

              {/* Unit */}
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

              {/* Minimum Threshold */}
              <div>
                <label htmlFor="minimumThreshold" className="label">Minimum Threshold</label>
                <input
                  id="minimumThreshold"
                  name="minimumThreshold"
                  type="number"
                  min="0"
                  value={formData.minimumThreshold}
                  onChange={handleChange}
                  className={`input ${errors.minimumThreshold ? 'input-error' : ''}`}
                />
                {errors.minimumThreshold && <p className="mt-1 text-sm text-danger-600">{errors.minimumThreshold}</p>}
              </div>

              {/* Expiry Date */}
              <div>
                <label htmlFor="expiryDate" className="label">Expiry Date (Optional)</label>
                <input
                  id="expiryDate"
                  name="expiryDate"
                  type="date"
                  value={formData.expiryDate}
                  onChange={handleChange}
                  className="input"
                />
              </div>

              {/* Batch Number */}
              <div>
                <label htmlFor="batchNumber" className="label">Batch Number (Optional)</label>
                <input
                  id="batchNumber"
                  name="batchNumber"
                  type="text"
                  value={formData.batchNumber}
                  onChange={handleChange}
                  className="input"
                  placeholder="e.g., BATCH-2024-001"
                />
              </div>

              {/* Notes */}
              <div className="sm:col-span-2">
                <label htmlFor="notes" className="label">Notes (Optional)</label>
                <textarea
                  id="notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  className="input min-h-[80px] resize-y"
                  placeholder="Additional notes..."
                />
              </div>
            </div>

            {/* Actions */}
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

export default InventoryForm;