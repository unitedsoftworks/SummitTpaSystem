import React from 'react';

const colors = {
  active: { bg: '#e6f4ea', text: '#1e7e34' },
  carrier_confirmed: { bg: '#e3f2fd', text: '#1565c0' },
  pending: { bg: '#fff3e0', text: '#e65100' },
  terminated: { bg: '#fce4ec', text: '#c62828' },
  on_leave: { bg: '#f3e5f5', text: '#6a1b9a' },
  received: { bg: '#fff3e0', text: '#e65100' },
  in_review: { bg: '#e3f2fd', text: '#1565c0' },
  pending_info: { bg: '#fff8e1', text: '#f57f17' },
  approved: { bg: '#e6f4ea', text: '#1e7e34' },
  denied: { bg: '#fce4ec', text: '#c62828' },
  matched: { bg: '#e6f4ea', text: '#1e7e34' },
  discrepancy: { bg: '#fce4ec', text: '#c62828' },
  resolved: { bg: '#e3f2fd', text: '#1565c0' },
  paid: { bg: '#e8eaf6', text: '#283593' },
  processed: { bg: '#e6f4ea', text: '#1e7e34' },
  sent_to_employer: { bg: '#e3f2fd', text: '#1565c0' },
};

export default function StatusBadge({ status }) {
  const c = colors[status] || { bg: '#eee', text: '#666' };
  const label = status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  return (
    <span style={{
      display: 'inline-block',
      padding: '3px 10px',
      borderRadius: 12,
      fontSize: 12,
      fontWeight: 600,
      background: c.bg,
      color: c.text,
    }}>
      {label}
    </span>
  );
}
