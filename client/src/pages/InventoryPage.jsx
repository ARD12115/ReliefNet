import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  Filter, 
  Download,
  Edit,
  Trash2,
  AlertTriangle,
  XCircle,
  TrendingDown
} from 'lucide-react';
import { useInventoryStore } from '../store/inventoryStore';
import { useCampStore } from '../store/campStore';
import { formatNumber, getCategoryColor, getCategoryIcon, getStatusColor } from '../utils/helpers';
import InventoryForm from '../components/InventoryForm';
import toast from 'react-hot-toast';

const InventoryPage = () => {
  const { 
    items, 
    fetchInventory, 
    deleteItem, 
    isLoading, 
    summary,
    groupedItems 
  } = useInventoryStore();
  const { camps } = useCampStore();
  
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [lowStockFilter, setLowStockFilter] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  const filteredItems = items.filter(item => {
    if (search && !item.itemName.toLowerCase().includes(search.toLowerCase())) return false;
    if (categoryFilter && item.category !== categoryFilter) return false;
    if (lowStockFilter && item.quantity > item.minimumThreshold) return false;
    return true;
  });

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this inventory item?')) return;
    try {
      await deleteItem(id);
      toast.success('Item deleted');
    } catch (error) {
      toast.error('Failed to delete item');
    }
  };

  const categories = [
    'food', 'water', 'medicine', 'shelter', 'other'
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Inventory Management</h1>
          <p className="text-slate-500 mt-1">Track and manage relief supplies</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setEditingItem(null); setShowForm(true); }} className="btn-primary">
            <Plus className="w-4 h-4" /> Add Item
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Total Items</p>
                  <p className="text-3xl font-bold text-slate-900">{formatNumber(summary.overall?.totalItems || 0)}</p>
                </div>
                <div className="p-3 rounded-xl bg-primary-100 text-primary-600">
                  <Package className="w-6 h-6" />
                </div>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Total Quantity</p>
                  <p className="text-3xl font-bold text-slate-900">{formatNumber(summary.overall?.totalQuantity || 0)}</p>
                </div>
                <div className="p-3 rounded-xl bg-green-100 text-green-600">
                  <TrendingDown className="w-6 h-6" />
                </div>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Low Stock</p>
                  <p className="text-3xl font-bold text-warning-600">{summary.overall?.lowStockCount || 0}</p>
                </div>
                <div className="p-3 rounded-xl bg-warning-100 text-warning-600">
                  <AlertTriangle className="w-6 h-6" />
                </div>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Out of Stock</p>
                  <p className="text-3xl font-bold text-danger-600">{summary.overall?.outOfStockCount || 0}</p>
                </div>
                <div className="p-3 rounded-xl bg-danger-100 text-danger-600">
                  <XCircle className="w-6 h-6" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card">
        <div className="card-body">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search items..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input pl-10"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="input w-auto"
            >
              <option value="">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
              ))}
            </select>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={lowStockFilter}
                onChange={(e) => setLowStockFilter(e.target.checked)}
                className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-slate-700">Low stock only</span>
            </label>
          </div>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="card">
        <div className="card-body p-0">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-500 border-t-transparent mx-auto mb-2" />
              <p className="text-slate-500">Loading inventory...</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="p-8 text-center">
              <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-slate-900 mb-1">No inventory items found</h3>
              <p className="text-slate-500">Try adjusting your filters or add a new item</p>
            </div>
          ) : (
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
                  {filteredItems.map(item => (
                    <tr key={item._id}>
                      <td>
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{getCategoryIcon(item.category)}</span>
                          <span className="font-medium text-slate-900">{item.itemName}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${getCategoryColor(item.category)} capitalize`}>
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
                      <td className="text-slate-600">{item.campId?.name || 'N/A'}</td>
                      <td>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => { setEditingItem(item); setShowForm(true); }}
                            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(item._id)}
                            className="p-2 rounded-lg text-slate-500 hover:bg-danger-50 hover:text-danger-600"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <InventoryForm
          initialData={editingItem}
          onClose={() => { setShowForm(false); setEditingItem(null); }}
          onSuccess={() => { setShowForm(false); setEditingItem(null); }}
        />
      )}
    </div>
  );
};

export default InventoryPage;