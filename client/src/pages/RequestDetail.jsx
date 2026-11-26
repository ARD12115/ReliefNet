import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, FileText, Clock, MapPin, User, Truck, CheckCircle, AlertTriangle } from 'lucide-react';
import { useRequestStore } from '../store/requestStore';
import { useCampStore } from '../store/campStore';
import toast from 'react-hot-toast';

const RequestDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { fetchRequest, selectedRequest, isLoading: requestLoading } = useRequestStore();
  const { camps, isLoading: campsLoading } = useCampStore();

  useEffect(() => {
    fetchRequest(id);
  }, [id, fetchRequest]);

  if (requestLoading || campsLoading || !selectedRequest) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-500 border-t-transparent"></div>
      </div>
    );
  }

  const request = selectedRequest;
  const camp = camps.find(c => c.id === request.campId);

  const statusColors = {
    open: 'badge-warning',
    partial: 'badge-warning',
    matched: 'badge-primary',
    fulfilled: 'badge-success',
    cancelled: 'badge-danger',
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-2 mb-6">
          <Link to="/coordinator/requests" className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">Request Detail</h1>
        </div>

        <div className="card">
          <div className="card-header flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
                <FileText className="w-6 h-6 text-primary-600" />
              </div>
              <div>
                <h2 className="font-bold text-slate-900">{request.itemName}</h2>
                <p className="text-sm text-slate-500">Request #{request.id.slice(0, 8)}</p>
              </div>
            </div>
            <span className={`badge ${statusColors[request.status] || 'badge-slate'}`}>
              {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
            </span>
          </div>

          <div className="card-body space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                <p className="text-xs font-semibold text-slate-500 uppercase">Quantity Needed</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{request.quantityNeeded} {request.unit}</p>
              </div>
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                <p className="text-xs font-semibold text-slate-500 uppercase">Quantity Fulfilled</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{request.quantityFulfilled} {request.unit}</p>
              </div>
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                <p className="text-xs font-semibold text-slate-500 uppercase">Urgency</p>
                <span className={`badge ${request.urgency === 'critical' ? 'badge-danger' : request.urgency === 'high' ? 'badge-warning' : 'badge-primary'}`}>
                  {request.urgency.charAt(0).toUpperCase() + request.urgency.slice(1)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase">Camp</p>
                <p className="text-slate-900 font-medium">{camp?.name || 'Unknown Camp'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase">Requested By</p>
                <p className="text-slate-900 font-medium">{request.requestedBy?.name || 'Unknown'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase">Created</p>
                <p className="text-slate-900 font-medium">{request.createdAt ? new Date(request.createdAt).toLocaleDateString() : '—'}</p>
              </div>
            </div>

            {request.description && (
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase">Description</p>
                <p className="text-slate-700">{request.description}</p>
              </div>
            )}

            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <p className="text-xs font-semibold text-blue-800 uppercase mb-2">Matching Status</p>
              {request.status === 'open' && (
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-warning-600" />
                  <span className="text-sm text-warning-800">Waiting for supply match</span>
                </div>
              )}
              {request.status === 'matched' && (
                <div className="flex items-center gap-3">
                  <Truck className="w-5 h-5 text-primary-600" />
                  <span className="text-sm text-primary-800">Transfer proposed - awaiting dispatch</span>
                </div>
              )}
              {request.status === 'fulfilled' && (
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-sm text-green-800">Fully fulfilled</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Link
            to="/coordinator/requests"
            className="btn-ghost px-6"
          >
            Back to Requests
          </Link>
        </div>
      </div>
    </div>
  );
};

export default RequestDetail;
