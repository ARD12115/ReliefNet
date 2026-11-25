import React from 'react';
import { formatDateTime, getUrgencyColor, getStatusColor, getCategoryIcon } from '../utils/helpers';

const RequestTable = ({ requests, onView, onEdit, onCancel }) => {
  if (!requests || requests.length === 0) {
    return (
      <div className="p-8 text-center">
        <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <p className="text-slate-500">No requests found</p>
      </div>
    );
  }

  return (
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
          {requests.map(request => (
            <tr key={request.id}>
              <td>
                <div className="flex items-center gap-2">
                  <span className="text-xl">{getCategoryIcon(request.category)}</span>
                  <span className="font-medium text-slate-900">{request.itemName}</span>
                </div>
              </td>
              <td className="text-slate-600">{request.campId?.name || 'N/A'}</td>
              <td>
                <span className={`badge capitalize`} style={{ 
                  backgroundColor: getCategoryColor(request.category).split(' ')[1], 
                  color: getCategoryColor(request.category).split(' ')[0] 
                }}>
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
                  {onView && (
                    <button
                      onClick={() => onView(request)}
                      className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                      title="View"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  )}
                  {onEdit && (
                    <button
                      onClick={() => onEdit(request)}
                      className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                      title="Edit"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                  )}
                  {onCancel && ['open', 'partial', 'matched'].includes(request.status) && (
                    <button
                      onClick={() => onCancel(request.id)}
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
  );
};

// Need to import icons and formatNumber
import { FileText, Eye, Edit, XCircle } from 'lucide-react';
import { formatNumber, getCategoryColor } from '../utils/helpers';

export default RequestTable;