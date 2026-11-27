import React, { useEffect, useState } from 'react';
import { 
  TrendingUp, Users, Package, FileText, Truck, AlertTriangle, 
  CheckCircle, Clock, BarChart3, RefreshCw, ChevronLeft, ChevronRight
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, BarChart, Bar, Legend
} from 'recharts';
import { useAnalyticsStore } from '../store/analyticsStore';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6'];

const StatCard = ({ title, value, subtitle, icon, color, trend }) => (
  <div className="card">
    <div className="card-body">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500">{title}</p>
          <p className="text-3xl font-bold text-slate-900 mt-1">{value}</p>
          <p className="text-sm text-slate-500 mt-1">{subtitle}</p>
        </div>
        <div className={`p-3 rounded-xl ${color}`}>
          <icon className="w-6 h-6" />
        </div>
      </div>
      {trend && (
        <div className="mt-3 flex items-center gap-1">
          <span className={`text-xs font-medium ${trend.positive ? 'text-green-600' : 'text-danger-600'}`}>
            {trend.positive ? '↑' : '↓'} {trend.value}%
          </span>
          <span className="text-xs text-slate-500">vs last period</span>
        </div>
      )}
    </div>
  </div>
);

const PeriodSelector = ({ period, onChange, onRefresh }) => (
  <div className="flex items-center gap-2">
    <span className="text-sm text-slate-500">Period:</span>
    <select value={period} onChange={(e) => onChange(e.target.value)} className="input w-auto">
      <option value="7d">Last 7 days</option>
      <option value="30d">Last 30 days</option>
      <option value="90d">Last 90 days</option>
      <option value="6m">Last 6 months</option>
      <option value="12m">Last 12 months</option>
    </select>
    <button onClick={onRefresh} className="btn-ghost text-xs">
      <RefreshCw className="w-4 h-4" /> Refresh
    </button>
  </div>
);

const AnalyticsPage = () => {
  const { user } = useAuthStore();
  const { 
    overview, 
    requestsTrend, 
    inventoryDistribution, 
    transferPerformance, 
    campPerformance,
    fetchAll,
    fetchRequestsTrend,
    fetchTransferPerformance,
    isLoading,
    error
  } = useAnalyticsStore();

  const [period, setPeriod] = useState('6m');
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchAll(period);
  }, [period, fetchAll]);

  useEffect(() => {
    fetchRequestsTrend(period);
    fetchTransferPerformance(period);
  }, [period, fetchRequestsTrend, fetchTransferPerformance]);

  if (isLoading && !overview) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Analytics</h1>
          <p className="text-slate-500 mt-1">System-wide insights and performance metrics</p>
        </div>
        <PeriodSelector period={period} onChange={setPeriod} onRefresh={() => fetchAll(period)} />
      </div>

      {error && (
        <div className="card border-danger-200 bg-danger-50">
          <div className="card-body flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-danger-600" />
            <p className="text-danger-800">{error}</p>
            <button onClick={() => fetchAll(period)} className="btn-ghost text-sm ml-auto">
              <RefreshCw className="w-4 h-4" /> Retry
            </button>
          </div>
        </div>
      )}

      {/* Overview KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Camps"
          value={overview?.camps?.active || 0}
          subtitle={`${overview?.camps?.total || 0} total camps`}
          icon={BarChart3}
          color="text-primary-600 bg-primary-100"
        />
        <StatCard
          title="Active Users"
          value={overview?.users?.active || 0}
          subtitle={`${overview?.users?.total || 0} total users`}
          icon={Users}
          color="text-green-600 bg-green-100"
        />
        <StatCard
          title="Open Requests"
          value={overview?.requests?.open || 0}
          subtitle={`${overview?.requests?.critical || 0} critical`}
          icon={FileText}
          color="text-danger-600 bg-danger-100"
        />
        <StatCard
          title="In Transit"
          value={overview?.transfers?.inTransit || 0}
          subtitle={`${overview?.transfers?.delivered || 0} delivered`}
          icon={Truck}
          color="text-warning-600 bg-warning-100"
        />
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Inventory Items"
          value={overview?.inventory?.totalItems || 0}
          subtitle={`${overview?.inventory?.lowStock || 0} low stock alerts`}
          icon={Package}
          color="text-emerald-600 bg-emerald-100"
        />
        <StatCard
          title="Avg Response Time"
          value={`${overview?.kpis?.avgResponseTimeHours || 0}h`}
          subtitle="Request to fulfillment"
          icon={Clock}
          color="text-purple-600 bg-purple-100"
        />
        <StatCard
          title="Fulfillment Rate"
          value={`${overview?.kpis?.fulfillmentRate || 0}%`}
          subtitle="Requests fulfilled"
          icon={CheckCircle}
          color="text-teal-600 bg-teal-100"
        />
        <StatCard
          title="Critical Requests"
          value={overview?.requests?.critical || 0}
          subtitle="Requiring immediate attention"
          icon={AlertTriangle}
          color="text-orange-600 bg-orange-100"
        />
      </div>

      {/* Tab Navigation */}
      <div className="card">
        <div className="border-b border-slate-200">
          <nav className="flex gap-1 px-4" aria-label="Analytics tabs">
            {[
              { id: 'overview', label: 'Overview', icon: BarChart3 },
              { id: 'requests', label: 'Requests', icon: FileText },
              { id: 'inventory', label: 'Inventory', icon: Package },
              { id: 'transfers', label: 'Transfers', icon: Truck },
              { id: 'camps', label: 'Camps', icon: BarChart3 }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600 bg-primary-50'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="card-body p-6">
          {/* Requests Trend Tab */}
          {activeTab === 'requests' && requestsTrend.length > 0 && (
            <div className="space-y-6">
              <div className="card">
                <div className="card-header">
                  <h3 className="font-semibold text-slate-900">Requests Trend</h3>
                </div>
                <div className="card-body h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={requestsTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} />
                      <YAxis stroke="#94a3b8" fontSize={12} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }}
                        labelStyle={{ color: '#f8fafc' }}
                      />
                      <Line
                        type="monotone"
                        dataKey="total"
                        stroke="#ef4444"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        name="Total Requests"
                      />
                      <Line
                        type="monotone"
                        dataKey="fulfilled"
                        stroke="#22c55e"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        name="Fulfilled"
                      />
                      <Line
                        type="monotone"
                        dataKey="critical"
                        stroke="#f59e0b"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        name="Critical"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* Inventory Distribution Tab */}
          {activeTab === 'inventory' && inventoryDistribution.byCategory.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="card">
                <div className="card-header">
                  <h3 className="font-semibold text-slate-900">Inventory by Category</h3>
                </div>
                <div className="card-body h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={inventoryDistribution.byCategory}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="totalQuantity"
                        nameKey="category"
                        label={({ category, percent }) => `${category} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {inventoryDistribution.byCategory.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="card">
                <div className="card-header">
                  <h3 className="font-semibold text-slate-900">Inventory by Camp</h3>
                </div>
                <div className="card-body">
                  {inventoryDistribution.byCamp.length > 0 ? (
                    <div className="space-y-3 max-h-80 overflow-y-auto">
                      {inventoryDistribution.byCamp.slice(0, 10).map((camp, index) => (
                        <div key={index} className="flex items-center gap-3">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          />
                          <span className="text-sm font-medium text-slate-700 w-32 truncate">{camp.campName}</span>
                          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${Math.min(100, (camp.totalQuantity / Math.max(...inventoryDistribution.byCamp.map(c => c.totalQuantity))) * 100)}%`,
                                backgroundColor: COLORS[index % COLORS.length]
                              }}
                            />
                          </div>
                          <span className="text-sm text-slate-500 w-20 text-right">{camp.totalQuantity}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-500 text-center py-8">No camp inventory data</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Transfers Performance Tab */}
          {activeTab === 'transfers' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="card">
                <div className="card-header">
                  <h3 className="font-semibold text-slate-900">Transfers by Status</h3>
                </div>
                <div className="card-body h-80">
                  {transferPerformance.byStatus.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={transferPerformance.byStatus}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={2}
                          dataKey="count"
                          nameKey="status"
                          label={({ status, percent }) => `${status} ${(percent * 100).toFixed(0)}%`}
                          labelLine={false}
                        >
                          {transferPerformance.byStatus.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-slate-500 text-center py-8">No transfer data</p>
                  )}
                </div>
              </div>

              <div className="card">
                <div className="card-header">
                  <h3 className="font-semibold text-slate-900">Transfers by Priority</h3>
                </div>
                <div className="card-body h-80">
                  {transferPerformance.byPriority.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={transferPerformance.byPriority} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                        <XAxis type="number" stroke="#94a3b8" fontSize={12} />
                        <YAxis dataKey="priority" type="category" stroke="#94a3b8" fontSize={12} width={80} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }}
                          labelStyle={{ color: '#f8fafc' }}
                        />
                        <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-slate-500 text-center py-8">No priority data</p>
                  )}
                </div>
              </div>

              <div className="card lg:col-span-2">
                <div className="card-header flex items-center justify-between">
                  <h3 className="font-semibold text-slate-900">Top Transfer Routes</h3>
                  <div className="text-sm text-slate-500">
                    Avg Delivery: {transferPerformance.avgDeliveryHours || 0}h
                  </div>
                </div>
                <div className="card-body">
                  {transferPerformance.topRoutes.length > 0 ? (
                    <div className="table-container">
                      <table className="table">
                        <thead>
                          <tr>
                            <th>Route</th>
                            <th>Total Transfers</th>
                            <th>Delivered</th>
                            <th>Success Rate</th>
                          </tr>
                        </thead>
                        <tbody>
                          {transferPerformance.topRoutes.map((route, index) => (
                            <tr key={index}>
                              <td>
                                <div className="flex items-center gap-2">
                                  <span className="text-slate-400">→</span>
                                  <span className="font-medium text-slate-900">{route.fromCamp}</span>
                                  <span className="text-slate-400">→</span>
                                  <span className="font-medium text-slate-900">{route.toCamp}</span>
                                </div>
                              </td>
                              <td className="font-medium text-slate-900">{route.total}</td>
                              <td className="text-slate-600">{route.delivered}</td>
                              <td>
                                <span className={`badge ${route.successRate >= 80 ? 'badge-success' : route.successRate >= 50 ? 'badge-warning' : 'badge-danger'}`}>
                                  {route.successRate}%
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-slate-500 text-center py-8">No route data</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Camps Performance Tab */}
          {activeTab === 'camps' && campPerformance.length > 0 && (
            <div className="card">
              <div className="card-header">
                <h3 className="font-semibold text-slate-900">Camp Performance Comparison</h3>
              </div>
              <div className="card-body">
                <div className="table-container">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Camp</th>
                        <th>Status</th>
                        <th>Utilization</th>
                        <th>Requests</th>
                        <th>Fulfilled</th>
                        <th>Fulfillment Rate</th>
                        <th>Transfers Out</th>
                        <th>Transfers In</th>
                      </tr>
                    </thead>
                    <tbody>
                      {campPerformance.map(camp => (
                        <tr key={camp.id}>
                          <td className="font-medium text-slate-900">{camp.name}</td>
                          <td>
                            <span className={`badge capitalize ${{
                              active: 'badge-success',
                              inactive: 'badge-ink',
                              full: 'badge-warning',
                              evacuated: 'badge-danger',
                              evacuating: 'badge-warning'
                            }[camp.status] || 'badge-ink'}`}>
                              {camp.status}
                            </span>
                          </td>
                          <td>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden max-w-xs">
                                <div
                                  className="h-full rounded-full"
                                  style={{
                                    width: `${Math.min(100, camp.utilization)}%`,
                                    backgroundColor: camp.utilization > 90 ? '#ef4444' : camp.utilization > 70 ? '#f59e0b' : '#22c55e'
                                  }}
                                />
                              </div>
                              <span className="text-sm text-slate-500 w-16">{camp.utilization}%</span>
                            </div>
                          </td>
                          <td className="text-slate-600">{camp.requests.total}</td>
                          <td className="text-slate-600">{camp.requests.fulfilled}</td>
                          <td>
                            <span className={`badge ${camp.fulfillmentRate >= 80 ? 'badge-success' : camp.fulfillmentRate >= 50 ? 'badge-warning' : 'badge-danger'}`}>
                              {camp.fulfillmentRate}%
                            </span>
                          </td>
                          <td className="text-slate-600">{camp.transfers.out} ({camp.transfers.outDelivered} delivered)</td>
                          <td className="text-slate-600">{camp.transfers.in} ({camp.transfers.inDelivered} delivered)</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Empty state for tabs without data */}
          {(['requests', 'inventory', 'transfers', 'camps'].includes(activeTab)) && (
            (activeTab === 'requests' && requestsTrend.length === 0) ||
            (activeTab === 'inventory' && inventoryDistribution.byCategory.length === 0) ||
            (activeTab === 'transfers' && transferPerformance.byStatus.length === 0) ||
            (activeTab === 'camps' && campPerformance.length === 0)
          ) && (
            <div className="empty-state">
              <div className="empty-state-icon">
                <BarChart3 className="w-8 h-8" />
              </div>
              <p className="empty-state-title">No data available</p>
              <p className="empty-state-desc">There isn't enough data to display this chart yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;