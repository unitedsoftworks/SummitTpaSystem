import React from 'react';

const colors = {
  active: { bg: '#ECFDF5', text: '#047857' },
  carrier_confirmed: { bg: '#F0FDFA', text: '#0D9488' },
  pending: { bg: '#FFFBEB', text: '#D97706' },
  terminated: { bg: '#FFF1F2', text: '#E11D48' },
  on_leave: { bg: '#F5F3FF', text: '#7C3AED' },
  received: { bg: '#FFFBEB', text: '#D97706' },
  in_review: { bg: '#F0FDFA', text: '#0D9488' },
  pending_info: { bg: '#FFFBEB', text: '#D97706' },
  approved: { bg: '#ECFDF5', text: '#047857' },
  denied: { bg: '#FFF1F2', text: '#E11D48' },
  matched: { bg: '#ECFDF5', text: '#047857' },
  discrepancy: { bg: '#FFF1F2', text: '#E11D48' },
  resolved: { bg: '#F0FDFA', text: '#0D9488' },
  paid: { bg: '#F5F3FF', text: '#7C3AED' },
  processed: { bg: '#ECFDF5', text: '#047857' },
  sent_to_employer: { bg: '#F0FDFA', text: '#0D9488' },
};

export default function StatusBadge({ status }) {
  const c = colors[status] || { bg: '#F1F5F9', text: '#64748B' };
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
