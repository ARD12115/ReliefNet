import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Package, 
  FileText, 
  Truck, 
  MapPin, 
  BarChart3, 
  Settings, 
  LogOut, 
  Menu, 
  X,
  Bell,
  Shield
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

const navigation = {
  admin: [
    { name: 'Overview', href: '/admin', icon: LayoutDashboard },
    { name: 'Camps', href: '/admin/camps', icon: MapPin },
    { name: 'Inventory', href: '/admin/inventory', icon: Package },
    { name: 'Requests', href: '/admin/requests', icon: FileText },
    { name: 'Transfers', href: '/admin/transfers', icon: Truck },
    { name: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
    { name: 'Users', href: '/admin/users', icon: Users },
  ],
  dispatcher: [
    { name: 'Dashboard', href: '/dispatcher', icon: LayoutDashboard },
    { name: 'Transfers', href: '/dispatcher/transfers', icon: Truck },
    { name: 'Requests', href: '/dispatcher/requests', icon: FileText },
    { name: 'Map View', href: '/dispatcher/map', icon: MapPin },
  ],
  coordinator: [
    { name: 'Dashboard', href: '/coordinator', icon: LayoutDashboard },
    { name: 'Inventory', href: '/coordinator/inventory', icon: Package },
    { name: 'Requests', href: '/coordinator/requests', icon: FileText },
    { name: 'Transfers', href: '/coordinator/transfers', icon: Truck },
  ]
};

const Layout = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);

  const userNav = navigation[user?.role] || navigation.coordinator;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
    toast.success('Logged out successfully');
  };

  const isActive = (href) => {
    if (href === '/admin' || href === '/dispatcher' || href === '/coordinator') {
      return location.pathname === href;
    }
    return location.pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 transform transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-4 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary-600 flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">ReliefNet</h1>
                <p className="text-xs text-slate-500">Aid, precisely delivered</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {userNav.map((item) => (
              <NavLink
                key={item.href}
                to={item.href}
                className={`sidebar-link ${isActive(item.href) ? 'sidebar-link-active' : 'sidebar-link-inactive'}`}
                onClick={() => setSidebarOpen(false)}
              >
                <item.icon className="w-5 h-5" />
                {item.name}
              </NavLink>
            ))}
          </nav>

          {/* User info & logout */}
          <div className="p-4 border-t border-slate-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                <span className="text-sm font-medium text-primary-700">
                  {user?.name?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">{user?.name}</p>
                <p className="text-xs text-slate-500 capitalize">{user?.role}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full sidebar-link sidebar-link-inactive text-danger-600 hover:bg-danger-50"
            >
              <LogOut className="w-5 h-5" />
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col lg:ml-0">
        {/* Top header */}
        <header className="sticky top-0 z-30 bg-white border-b border-slate-200">
          <div className="flex items-center justify-between h-16 px-4 lg:px-6">
            {/* Mobile menu button */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100"
              aria-label="Open menu"
            >
              <Menu className="w-6 h-6" />
            </button>

            {/* Page title */}
            <div className="flex-1 lg:flex-none">
              <h2 className="text-lg font-semibold text-slate-900">
                {userNav.find(item => isActive(item.href))?.name || 'Dashboard'}
              </h2>
            </div>

            {/* Right side actions */}
            <div className="flex items-center gap-2">
              {/* Notifications */}
              <button className="relative p-2 rounded-lg text-slate-600 hover:bg-slate-100 lg:hidden">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-danger-500 rounded-full" />
              </button>

              {/* Role badge */}
              <span className={`badge ${user?.role === 'admin' ? 'badge-danger' : user?.role === 'dispatcher' ? 'badge-warning' : 'badge-primary'}`}>
                {user?.role}
              </span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          <div className="page-header">
            <nav className="breadcrumb">
              <a href="/" className="hover:text-primary-600">Dashboard</a>
              <span className="breadcrumb-separator">›</span>
              <span className="text-ink-600">{userNav.find(item => isActive(item.href))?.name || 'Overview'}</span>
            </nav>
            <div>
              <h1 className="page-title">{userNav.find(item => isActive(item.href))?.name || 'Dashboard'}</h1>
              <p className="page-subtitle">{user?.role === 'admin' ? 'Network-wide oversight and analytics' : user?.role === 'dispatcher' ? 'Prioritized transfers and dispatch' : 'Camp inventory and requests'}</p>
            </div>
          </div>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;