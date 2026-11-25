import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MapPin, User, Phone, Mail, ArrowLeft } from 'lucide-react';
import { useCampStore } from '../store/campStore';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

const CreateCamp = () => {
  const navigate = useNavigate();
  const { createCamp, isLoading: campsLoading } = useCampStore();
  const { user } = useAuthStore();
  const [formData, setFormData] = useState({
    name: '',
    lat: '',
    lng: '',
    address: '',
    capacity: '',
    contactPerson: '',
    contactPhone: '',
    contactEmail: '',
  });
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name) newErrors.name = 'Camp name is required';
    if (!formData.lat) newErrors.lat = 'Latitude is required';
    if (!formData.lng) newErrors.lng = 'Longitude is required';
    if (!formData.capacity) newErrors.capacity = 'Capacity is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      await createCamp({
        name: formData.name,
        location: { lat: parseFloat(formData.lat), lng: parseFloat(formData.lng) },
        address: formData.address,
        capacity: parseInt(formData.capacity),
        contactPerson: formData.contactPerson,
        contactPhone: formData.contactPhone,
        contactEmail: formData.contactEmail,
      });
      toast.success('Camp created successfully');
      navigate('/admin/camps');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create camp');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-2 mb-6">
          <button onClick={() => navigate('/admin')} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold text-slate-900">Create Camp</h1>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-5">
          <div className="card-body space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="label">Camp Name</label>
                <input
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className={`input w-full ${errors.name ? 'input-error' : ''}`}
                  placeholder="e.g. North Relief Camp"
                  required
                />
                {errors.name && <p className="mt-1 text-sm text-danger-600">{errors.name}</p>}
              </div>
              <div className="flex flex-col">
                <label className="label">Capacity</label>
                <input
                  name="capacity"
                  type="number"
                  value={formData.capacity}
                  onChange={handleChange}
                  className={`input w-full ${errors.capacity ? 'input-error' : ''}`}
                  placeholder="e.g. 500"
                  required
                />
                {errors.capacity && <p className="mt-1 text-sm text-danger-600">{errors.capacity}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="label">Latitude</label>
                <input
                  name="lat"
                  type="number"
                  step="any"
                  value={formData.lat}
                  onChange={handleChange}
                  className={`input w-full ${errors.lat ? 'input-error' : ''}`}
                  placeholder="e.g. 12.9716"
                  required
                />
                {errors.lat && <p className="mt-1 text-sm text-danger-600">{errors.lat}</p>}
              </div>
              <div>
                <label className="label">Longitude</label>
                <input
                  name="lng"
                  type="number"
                  step="any"
                  value={formData.lng}
                  onChange={handleChange}
                  className={`input w-full ${errors.lng ? 'input-error' : ''}`}
                  placeholder="e.g. 77.5946"
                  required
                />
                {errors.lng && <p className="mt-1 text-sm text-danger-600">{errors.lng}</p>}
              </div>
            </div>

            <div>
              <label className="label">Address</label>
              <input
                name="address"
                value={formData.address}
                onChange={handleChange}
                className="input w-full"
                placeholder="e.g. 123 Relief Road, City"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div>
                <label className="label">Contact Person</label>
                <input
                  name="contactPerson"
                  value={formData.contactPerson}
                  onChange={handleChange}
                  className="input w-full"
                  placeholder="e.g. John Coordinator"
                />
              </div>
              <div>
                <label className="label">Contact Phone</label>
                <input
                  name="contactPhone"
                  type="tel"
                  value={formData.contactPhone}
                  onChange={handleChange}
                  className="input w-full"
                  placeholder="e.g. +1234567890"
                />
              </div>
              <div>
                <label className="label">Contact Email</label>
                <input
                  name="contactEmail"
                  type="email"
                  value={formData.contactEmail}
                  onChange={handleChange}
                  className="input w-full"
                  placeholder="e.g. camp@reliefnet.org"
                />
              </div>
            </div>
          </div>

          <div className="card-footer flex justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate('/admin')}
              className="btn-ghost"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={campsLoading}
              className="btn-primary w-auto py-3"
            >
              {campsLoading ? 'Creating...' : 'Create Camp'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateCamp;
