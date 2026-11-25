import React from 'react';

const EmptyState = ({ icon: Icon, title, description, action, actionLabel }) => {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">
        <Icon className="w-8 h-8" />
      </div>
      <h3 className="empty-state-title">{title}</h3>
      {description && <p className="empty-state-desc">{description}</p>}
      {action && actionLabel && (
        <button onClick={action} className="btn-primary">
          {actionLabel}
        </button>
      )}
    </div>
  );
};

export default EmptyState;
