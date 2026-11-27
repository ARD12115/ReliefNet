import React from 'react';
import { formatNumber, getCategoryColor, getCategoryIcon, getStatusColor } from '../utils/helpers';

const InventoryTable = ({ items, onEdit, onDelete, onView }) => {
  if (!items || items.length === 0) {
    return (
      <div className="p-8 text-center">
        <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <p className="text-slate-500">No inventory items</p>
      </div>
    );
  }

  return (
    <div className="table-container">
      <table className="table">
        <thead>
          <tr>
            <th>Item</th>
            <th>Category</th>
            <th>Quantity</th>
            <th>Unit</th>
            <th>Threshold</th>
            <th>Status</th>
            <th>Camp</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map(item => (
            <tr key={item.id}>
              <td>
                <div className="flex items-center gap-2">
                  <span className="text-xl">{getCategoryIcon(item.category)}</span>
                  <span className="font-medium text-slate-900">{item.itemName}</span>
                </div>
              </td>
              <td>
                <span className={`badge capitalize ${getCategoryColor(item.category)}`}>
                  {item.category}
                </span>
              </td>
              <td className="font-medium text-slate-900">{formatNumber(item.quantity)}</td>
              <td className="text-slate-600">{item.unit}</td>
              <td className="text-slate-600">{formatNumber(item.minimumThreshold)}</td>
              <td>
                {item.quantity === 0 ? (
                  <span className="badge badge-danger">Out of Stock</span>
                ) : item.quantity <= item.minimumThreshold ? (
                  <span className="badge badge-warning">Low Stock</span>
                ) : (
                  <span className="badge badge-success">In Stock</span>
                )}
              </td>
              <td className="text-slate-600">{item.camp?.name || 'N/A'}</td>
              <td>
                <div className="flex items-center gap-1">
                  {onView && (
                    <button
                      onClick={() => onView(item)}
                      className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                      title="View"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  )}
                  {onEdit && (
                    <button
                      onClick={() => onEdit(item)}
                      className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                      title="Edit"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                  )}
                  {onDelete && (
                    <button
                      onClick={() => onDelete(item.id)}
                      className="p-2 rounded-lg text-slate-500 hover:bg-danger-50 hover:text-danger-600"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
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

// Need to import icons
import { Package, Eye, Edit, Trash2 } from 'lucide-react';

export default InventoryTable;