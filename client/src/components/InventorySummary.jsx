import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Package, 
  AlertTriangle, 
  TrendingDown, 
  CheckCircle, 
  XCircle 
} from 'lucide-react';
import { useInventoryStore } from '../store/inventoryStore';
import { formatNumber } from '../utils/helpers';
import { CategoryIcon } from './CategoryIcon';

const InventorySummary = ({ campId }) => {
  const { summary, groupedItems, isLoading } = useInventoryStore();
  
  if (isLoading || !summary) {
    return (
      <div className="card">
        <div className="card-body h-32 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-500 border-t-transparent" />
        </div>
      </div>
    );
  }

  const categories = [
    { key: 'food', label: 'Food', color: 'text-amber-600 bg-amber-100' },
    { key: 'water', label: 'Water', color: 'text-blue-600 bg-blue-100' },
    { key: 'medicine', label: 'Medicine', color: 'text-red-600 bg-red-100' },
    { key: 'shelter', label: 'Shelter', color: 'text-green-600 bg-green-100' },
    { key: 'other', label: 'Other', color: 'text-slate-600 bg-slate-100' }
  ];

  const categoryData = categories.map(cat => {
    const data = summary.byCategory?.find(c => c._id === cat.key);
    const items = groupedItems[cat.key] || [];
    return {
      ...cat,
      totalItems: data?.totalItems || 0,
      totalQuantity: data?.totalQuantity || 0,
      lowStockCount: data?.lowStockCount || 0,
      outOfStockCount: data?.outOfStockCount || 0,
      items
    };
  }).filter(cat => cat.totalItems > 0);

  if (categoryData.length === 0) {
    return (
      <div className="card">
        <div className="card-header">
          <h3 className="font-semibold text-slate-900">Inventory Summary</h3>
        </div>
        <div className="card-body text-center py-8">
          <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">No inventory items recorded</p>
          <Link to="/coordinator/inventory" className="btn-primary mt-4 inline-flex">
            Add Inventory Items
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header flex items-center justify-between">
        <h3 className="font-semibold text-slate-900">Inventory by Category</h3>
        <Link to="/coordinator/inventory" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
          View All
        </Link>
      </div>
      <div className="card-body">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {categoryData.map((cat) => (
            <div 
              key={cat.key} 
              className={`p-4 rounded-xl border transition-all hover:shadow-md ${
                cat.outOfStockCount > 0 ? 'border-danger-200 bg-danger-50' : 
                cat.lowStockCount > 0 ? 'border-warning-200 bg-warning-50' : 
                'border-slate-200 bg-white'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">
                  <CategoryIcon category={cat.key} className="w-6 h-6" />
                </span>
                <span className="font-medium text-slate-900">{cat.label}</span>
              </div>
              <div className="text-2xl font-bold text-slate-900">{formatNumber(cat.totalQuantity)}</div>
              <div className="text-sm text-slate-500">{cat.totalItems} items</div>
              {(cat.lowStockCount > 0 || cat.outOfStockCount > 0) && (
                <div className="mt-2 flex items-center gap-1 text-xs">
                  {cat.outOfStockCount > 0 && (
                    <span className="flex items-center gap-1 text-danger-600">
                      <XCircle className="w-3 h-3" /> {cat.outOfStockCount} empty
                    </span>
                  )}
                  {cat.lowStockCount > 0 && (
                    <span className="flex items-center gap-1 text-warning-600">
                      <TrendingDown className="w-3 h-3" /> {cat.lowStockCount} low
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
        
        {categoryData.some(c => c.lowStockCount > 0 || c.outOfStockCount > 0) && (
          <div className="mt-4 p-3 rounded-lg bg-warning-50 border border-warning-200">
            <div className="flex items-center gap-2 text-warning-800">
              <AlertTriangle className="w-5 h-5" />
              <span className="font-medium">Low Stock Alert</span>
            </div>
            <p className="text-sm text-warning-700 mt-1">
              {categoryData.filter(c => c.outOfStockCount > 0).length} categories out of stock, 
              {categoryData.filter(c => c.lowStockCount > 0).length} running low
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default InventorySummary;