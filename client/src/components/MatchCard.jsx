import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Truck, Clock, AlertTriangle, CheckCircle, ArrowRight, Package } from 'lucide-react';
import { formatNumber, getUrgencyColor, getCategoryIcon } from '../utils/helpers';

const MatchCard = ({ match, onViewDetails }) => {
  const { fromCamp, quantity, distanceKm, estimatedDuration, requestId } = match;
  
  return (
    <div className="card border-warning-200 bg-warning-50">
      <div className="card-body">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-warning-100 text-warning-700">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-semibold text-slate-900">New Match Found</h4>
              <p className="text-sm text-slate-500">
                Surplus available at <span className="font-medium">{fromCamp.name}</span>
              </p>
            </div>
          </div>
          <span className="badge badge-warning">New</span>
        </div>
        
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-3 rounded-lg bg-white">
            <p className="text-xs text-slate-500">Available</p>
            <p className="font-bold text-slate-900">{formatNumber(quantity)} units</p>
          </div>
          <div className="p-3 rounded-lg bg-white">
            <p className="text-xs text-slate-500">Distance</p>
            <p className="font-bold text-slate-900 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" /> {distanceKm} km
            </p>
          </div>
          <div className="p-3 rounded-lg bg-white">
            <p className="text-xs text-slate-500">Est. Duration</p>
            <p className="font-bold text-slate-900 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> {estimatedDuration} min
            </p>
          </div>
          <div className="p-3 rounded-lg bg-white">
            <p className="text-xs text-slate-500">From Camp</p>
            <p className="font-medium text-slate-900 truncate">{fromCamp.name}</p>
          </div>
        </div>
        
        <div className="mt-4 pt-4 border-t border-warning-200">
          <Link
            to={`/dispatcher/transfers?requestId=${requestId}`}
            className="btn-warning w-full sm:w-auto"
            onClick={onViewDetails}
          >
            <Truck className="w-4 h-4" /> Create Transfer
          </Link>
        </div>
      </div>
    </div>
  );
};

export default MatchCard;