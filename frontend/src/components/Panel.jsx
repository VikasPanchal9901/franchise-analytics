import React from 'react';

export default function Panel({ title, action, children, className = '' }) {
  return (
    <div className={`panel ${className}`}>
      {title && (
        <div className="panel-header">
          <h3 className="panel-title">{title}</h3>
          {action}
        </div>
      )}
      <div className="panel-body">{children}</div>
    </div>
  );
}
