import React from 'react';
import { 
  MapPin, 
  Truck, 
  Clock, 
  AlertTriangle, 
  CheckCircle,
  XCircle,
  User,
  Map,
  Navigation,
  MoreVertical
} from 'lucide-react';
import { formatDateTime, getStatusColor, getPriorityColor, getCategoryIcon } from '../utils/helpers';

const TransferCard = ({ 
  transfer, 
  onAssign, 
  onStatusUpdate, 
  assigningTransferId, 
  setAssigningTransferId,
  dispatchers,
  getPriorityColor,
  getStatusColor
}) => {
  const [showActions, setShowActions] = React.useState(false);
  const [statusNotes, setStatusNotes] = React.useState('');
  
  const isAssigning = assigningTransferId === transfer.id;
  const canAssign = transfer.status === 'proposed';
  const canUpdateStatus = ['assigned', 'in_transit'].includes(transfer.status);
  
  const statusFlow = {
    proposed: ['assigned', 'cancelled'],
    assigned: ['in_transit', 'cancelled'],
    in_transit: ['delivered', 'cancelled', 'failed']
  };

  const validNextStatuses = statusFlow[transfer.status] || [];

  const handleStatusClick = (status) => {
    if (status === 'cancelled' || status === 'failed') {
      const reason = prompt(`Reason for ${status}:`);
      if (reason) {
        onStatusUpdate(transfer.id, status, '', reason);
      }
    } else {
      onStatusUpdate(transfer.id, status, statusNotes);
    }
    setStatusNotes('');
    setShowActions(false);
  };

  return (
    <div className="bg-white">
      <div className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <span className={`badge ${getPriorityColor(transfer.priority)}`}>
                {transfer.priority}
              </span>
              <span className={`badge ${getStatusColor(transfer.status)}`}>
                {transfer.status.replace('_', ' ')}
              </span>
              {transfer.requestId?.urgency && (
                <span className={`badge ${getUrgencyColor(transfer.requestId.urgency)}`}>
                  {transfer.requestId.urgency}
                </span>
              )}
            </div>
            
            <div className="mt-2 flex items-center gap-4 text-sm text-slate-600 flex-wrap">
              <span className="font-medium text-slate-900">{transfer.itemName}</span>
              <span>{transfer.quantity} {transfer.unit}</span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                {transfer.routeDistanceKm} km • {transfer.routeDurationMinutes} min
              </span>
            </div>
            
            <div className="mt-2 flex items-center gap-4 text-sm text-slate-500 flex-wrap">
              <span className="flex items-center gap-1">
                <Navigation className="w-3.5 h-3.5" />
                {transfer.fromCampId?.name} → {transfer.toCampId?.name}
              </span>
              {transfer.assignedTo && (
                <span className="flex items-center gap-1">
                  <User className="w-3.5 h-3.5" />
                  {transfer.assignedTo.name}
                </span>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowActions(!showActions)}
              className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700"
            >
              <MoreVertical className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
      
      {showActions && (
        <div className="px-4 pb-4 border-t border-slate-100 animate-slide-down">
          <div className="pt-3 space-y-2">
            {canAssign && (
              <div>
                <p className="text-sm font-medium text-slate-700 mb-2">Assign Dispatcher</p>
                <select
                  className="input w-full sm:w-64"
                  onChange={(e) => onAssign(transfer.id, e.target.value)}
                  disabled={isAssigning}
                >
                  <option value="">Select dispatcher...</option>
                  {dispatchers.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.email})
                    </option>
                  ))}
                </select>
              </div>
            )}
            
            {canUpdateStatus && (
              <div>
                <p className="text-sm font-medium text-slate-700 mb-2">Update Status</p>
                <div className="flex flex-wrap gap-2">
                  {validNextStatuses.map(status => (
                    <button
                      key={status}
                      onClick={() => handleStatusClick(status)}
                      className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                        status === 'delivered' ? 'border-green-300 text-green-700 hover:bg-green-50' :
                        status === 'in_transit' ? 'border-warning-300 text-warning-700 hover:bg-warning-50' :
                        status === 'cancelled' ? 'border-danger-300 text-danger-700 hover:bg-danger-50' :
                        status === 'failed' ? 'border-slate-300 text-slate-700 hover:bg-slate-50' :
                        'border-primary-300 text-primary-700 hover:bg-primary-50'
                      }`}
                    >
                      {status.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {!canAssign && !canUpdateStatus && (
              <p className="text-sm text-slate-500">No actions available for this status</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

import { getUrgencyColor } from '../utils/helpers';

export default TransferCard;