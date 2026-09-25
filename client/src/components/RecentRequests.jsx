import React from 'react';
import { Link } from 'react-router-dom';
import { FileText, Clock, MapPin, AlertTriangle, ExternalLink } from 'lucide-react';
import { useRequestStore } from '../store/requestStore';
import { formatDateTime, getUrgencyColor, getStatusColor } from '../utils/helpers';

const RecentRequests = ({ campId }) => {
  const { requests, isLoading } = useRequestStore();
  
  const campRequests = campId 
    ? requests.filter(r => r.campId?._id === campId || r.campId === campId)
    : requests;

  const openRequests = campRequests
    .filter(r => ['open', 'partial', 'matched'].includes(r.status))
    .sort((a, b) => {
      const urgencyOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return (urgencyOrder[b.urgency] || 0) - (urgencyOrder[a.urgency] || 0);
    })
    .slice(0, 5);

  if (isLoading) {
    return (
      <div className="card">
        <div className="card-header">
          <h3 className="font-semibold text-slate-900">Recent Requests</h3>
        </div>
        <div className="card-body h-32 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-500 border-t-transparent" />
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header flex items-center justify-between">
        <h3 className="font-semibold text-slate-900">Recent Requests</h3>
        <Link to="/coordinator/requests" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
          View All
        </Link>
      </div>
      <div className="card-body p-0">
        {openRequests.length === 0 ? (
          <div className="p-6 text-center">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">No active requests</p>
            <Link to="/coordinator/requests" className="btn-primary mt-4 inline-flex">
              Create Request
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {openRequests.map(request => (
              <Link 
                key={request._id} 
                to={`/coordinator/requests/${request._id}`}
                className="flex items-center gap-3 p-4 hover:bg-slate-50 transition-colors"
              >
                <div className={`p-2 rounded-lg ${getUrgencyColor(request.urgency)}`}>
                  <FileText className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900 truncate">{request.itemName}</p>
                  <p className="text-sm text-slate-500 truncate">
                    {request.quantityNeeded} {request.unit} • {request.category}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`badge ${getUrgencyColor(request.urgency)}`}>
                    {request.urgency}
                  </span>
                  <span className={`badge ${getStatusColor(request.status)}`}>
                    {request.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RecentRequests;