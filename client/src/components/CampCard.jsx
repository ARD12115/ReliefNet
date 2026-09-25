import React from 'react';
import { MapPin, Users, Package, AlertTriangle, CheckCircle, ExternalLink } from 'lucide-react';
import { getStatusColor } from '../utils/helpers';

const CampCard = ({ camp, onClick, showActions = false, onEdit, onDelete }) => {
  const isActive = camp.status === 'active';
  const isFull = camp.status === 'full';
  const isEvacuating = camp.status === 'evacuating';

  return (
    <div 
      className={`card hover:shadow-md transition-shadow cursor-pointer ${onClick ? '' : 'pointer-events-none'}`}
      onClick={onClick}
    >
      <div className="card-body">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-xl ${isActive ? 'bg-green-100 text-green-700' : isFull ? 'bg-warning-100 text-warning-700' : 'bg-slate-100 text-slate-700'}`}>
              <MapPin className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">{camp.name}</h3>
              <p className="text-sm text-slate-500">
                {camp.location?.address || `${camp.lat?.toFixed(4)}, ${camp.lng?.toFixed(4)}`}
              </p>
            </div>
          </div>
          <span className={`badge ${getStatusColor(camp.status)}`}>
            {camp.status}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-4 p-3 rounded-lg bg-slate-50">
          <div className="text-center">
            <p className="text-2xl font-bold text-slate-900">{camp.capacity || 0}</p>
            <p className="text-xs text-slate-500">Capacity</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-slate-900">{camp.currentPopulation || 0}</p>
            <p className="text-xs text-slate-500">Population</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-slate-900">
              {camp.capacity > 0 ? Math.round((camp.currentPopulation / camp.capacity) * 100) : 0}%
            </p>
            <p className="text-xs text-slate-500">Occupancy</p>
          </div>
        </div>

        {camp.contactPerson && (
          <div className="flex items-center gap-2 text-sm text-slate-600 mb-2">
            <Users className="w-4 h-4" />
            <span>{camp.contactPerson}</span>
          </div>
        )}

        {camp.contactPhone && (
          <div className="flex items-center gap-2 text-sm text-slate-600 mb-2">
            <Phone className="w-4 h-4" />
            <span>{camp.contactPhone}</span>
          </div>
        )}

        {showActions && (
          <div className="flex items-center gap-2 pt-3 border-t border-slate-200">
            {onEdit && (
              <button
                onClick={(e) => { e.stopPropagation(); onEdit(camp); }}
                className="btn-secondary text-sm flex-1"
              >
                <Edit className="w-4 h-4 mr-1" /> Edit
              </button>
            )}
            {onDelete && (
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(camp._id); }}
                className="btn-danger text-sm flex-1"
              >
                <Trash2 className="w-4 h-4 mr-1" /> Delete
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Need to import icons
import { Phone, Edit, Trash2 } from 'lucide-react';

export default CampCard;