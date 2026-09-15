import React from 'react';

const SEVERITY_STYLES = {
  Low: 'bg-teal-50 text-teal-700 border-teal-100',
  Medium: 'bg-ochre-50 text-ochre-600 border-ochre-50',
  High: 'bg-ochre-50 text-critical-600 border-ochre-50',
  Critical: 'bg-critical-50 text-critical-600 border-critical-50',
  low: 'bg-teal-50 text-teal-700 border-teal-100',
  medium: 'bg-ochre-50 text-ochre-600 border-ochre-50',
  high: 'bg-ochre-50 text-critical-600 border-ochre-50',
  critical: 'bg-critical-50 text-critical-600 border-critical-50',
};

export function SeverityBadge({ level }) {
  return <span className={`pill ${SEVERITY_STYLES[level] || 'bg-canvas text-muted border-line'}`}>{level}</span>;
}

const STATUS_STYLES = {
  active: 'bg-success-50 text-success-600 border-success-50',
  healthy: 'bg-success-50 text-success-600 border-success-50',
  Healthy: 'bg-success-50 text-success-600 border-success-50',
  watch: 'bg-ochre-50 text-ochre-600 border-ochre-50',
  Watch: 'bg-ochre-50 text-ochre-600 border-ochre-50',
  under_review: 'bg-critical-50 text-critical-600 border-critical-50',
  'At Risk': 'bg-critical-50 text-critical-600 border-critical-50',
  Critical: 'bg-critical-50 text-critical-600 border-critical-50',
  closed: 'bg-canvas text-muted border-line',
  open: 'bg-critical-50 text-critical-600 border-critical-50',
  in_progress: 'bg-ochre-50 text-ochre-600 border-ochre-50',
  completed: 'bg-success-50 text-success-600 border-success-50',
  verified: 'bg-teal-50 text-teal-700 border-teal-100',
  pending: 'bg-ochre-50 text-ochre-600 border-ochre-50',
  sent: 'bg-teal-50 text-teal-700 border-teal-100',
  acknowledged: 'bg-success-50 text-success-600 border-success-50',
  escalated: 'bg-critical-50 text-critical-600 border-critical-50',
  resolved: 'bg-canvas text-muted border-line',
};

const STATUS_LABELS = {
  under_review: 'Under review',
  in_progress: 'In progress',
};

export function StatusPill({ status }) {
  const label = STATUS_LABELS[status] || (typeof status === 'string' ? status.replace(/_/g, ' ') : status);
  return <span className={`pill capitalize ${STATUS_STYLES[status] || 'bg-canvas text-muted border-line'}`}>{label}</span>;
}
