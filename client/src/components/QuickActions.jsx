import React from 'react';
import { Link } from 'react-router-dom';
import { Plus, Package, FileText, Truck, AlertTriangle } from 'lucide-react';
import { useInventoryStore } from '../store/inventoryStore';
import { useRequestStore } from '../store/requestStore';
import { getCategoryColor } from '../utils/helpers';

const QuickActions = ({ campId }) => {
  const { summary } = useInventoryStore();
  const { requests } = useRequestStore();
  
  const lowStockCategories = summary?.byCategory?.filter(c => c.lowStockCount > 0) || [];
  const criticalRequests = requests?.filter(r => r.urgency === 'critical' && r.status !== 'fulfilled' && r.status !== 'cancelled') || [];

  const actions = [
    {
      label: 'Add Inventory',
      description: 'Log new stock or update quantities',
      icon: Package,
      href: `/coordinator/inventory`,
      color: 'text-primary-600 bg-primary-100',
      badge: null
    },
    {
      label: 'Create Request',
      description: 'Report a shortage or need',
      icon: FileText,
      href: `/coordinator/requests/new`,
      color: 'text-danger-600 bg-danger-100',
      badge: criticalRequests.length > 0 ? criticalRequests.length : null
    },
    {
      label: 'View Transfers',
      description: 'Track incoming/outgoing aid',
      icon: Truck,
      href: `/coordinator/transfers`,
      color: 'text-warning-600 bg-warning-100',
      badge: null
    },
    {
      label: 'Low Stock Alerts',
      description: `${lowStockCategories.length} categories need attention`,
      icon: AlertTriangle,
      href: `/coordinator/inventory?lowStock=true`,
      color: 'text-orange-600 bg-orange-100',
      badge: lowStockCategories.length > 0 ? lowStockCategories.length : null
    }
  ];

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="font-semibold text-slate-900">Quick Actions</h3>
      </div>
      <div className="card-body">
        <div className="grid grid-cols-2 gap-3">
          {actions.map((action, index) => (
            <Link
              key={index}
              to={action.href}
              className="p-4 rounded-xl border border-slate-200 hover:border-primary-300 hover:bg-primary-50 transition-colors group flex flex-col"
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`p-2 rounded-lg ${action.color}`}>
                  <action.icon className="w-5 h-5" />
                </div>
                {action.badge && action.badge > 0 && (
                  <span className="badge badge-danger">{action.badge}</span>
                )}
              </div>
              <p className="font-medium text-slate-900 group-hover:text-primary-600">{action.label}</p>
              <p className="text-sm text-slate-500 mt-1">{action.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default QuickActions;