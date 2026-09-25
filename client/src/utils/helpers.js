export const formatNumber = (num) => {
  if (num === null || num === undefined) return '0';
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
};

export const formatDate = (date) => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

export const formatDateTime = (date) => {
  if (!date) return '-';
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const getUrgencyColor = (urgency) => {
  switch (urgency) {
    case 'critical': return 'text-danger-600 bg-danger-100';
    case 'high': return 'text-warning-600 bg-warning-100';
    case 'medium': return 'text-primary-600 bg-primary-100';
    case 'low': return 'text-slate-600 bg-slate-100';
    default: return 'text-slate-600 bg-slate-100';
  }
};

export const getStatusColor = (status) => {
  switch (status) {
    case 'active': return 'text-green-600 bg-green-100';
    case 'inactive': return 'text-slate-600 bg-slate-100';
    case 'full': return 'text-warning-600 bg-warning-100';
    case 'evacuated': return 'text-danger-600 bg-danger-100';
    case 'evacuating': return 'text-orange-600 bg-orange-100';
    case 'open': return 'text-danger-600 bg-danger-100';
    case 'partial': return 'text-warning-600 bg-warning-100';
    case 'matched': return 'text-primary-600 bg-primary-100';
    case 'fulfilled': return 'text-green-600 bg-green-100';
    case 'cancelled': return 'text-slate-600 bg-slate-100';
    case 'proposed': return 'text-slate-600 bg-slate-100';
    case 'assigned': return 'text-primary-600 bg-primary-100';
    case 'in_transit': return 'text-warning-600 bg-warning-100';
    case 'delivered': return 'text-green-600 bg-green-100';
    case 'failed': return 'text-danger-600 bg-danger-100';
    default: return 'text-slate-600 bg-slate-100';
  }
};

export const getPriorityColor = (priority) => {
  switch (priority) {
    case 'critical': return 'text-danger-600 bg-danger-100';
    case 'high': return 'text-warning-600 bg-warning-100';
    case 'medium': return 'text-primary-600 bg-primary-100';
    case 'low': return 'text-slate-600 bg-slate-100';
    default: return 'text-slate-600 bg-slate-100';
  }
};

export const getCategoryIcon = (category) => {
  const icons = {
    food: '🍚',
    water: '💧',
    medicine: '💊',
    shelter: '🏠',
    clothing: '👕',
    sanitation: '🧼',
    other: '📦'
  };
  return icons[category] || '📦';
};

export const getCategoryColor = (category) => {
  const colors = {
    food: 'text-amber-600 bg-amber-100',
    water: 'text-blue-600 bg-blue-100',
    medicine: 'text-red-600 bg-red-100',
    shelter: 'text-green-600 bg-green-100',
    clothing: 'text-purple-600 bg-purple-100',
    sanitation: 'text-orange-600 bg-orange-100',
    other: 'text-slate-600 bg-slate-100'
  };
  return colors[category] || 'text-slate-600 bg-slate-100';
};