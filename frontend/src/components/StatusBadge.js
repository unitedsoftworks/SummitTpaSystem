import React from 'react';

const colors = {
  active: { bg: 'rgba(5,150,105,0.15)', text: '#2DD4BF' },
  carrier_confirmed: { bg: 'rgba(13,148,136,0.15)', text: '#2DD4BF' },
  pending: { bg: 'rgba(245,158,11,0.15)', text: '#F59E0B' },
  terminated: { bg: 'rgba(244,63,94,0.15)', text: '#F43F5E' },
  on_leave: { bg: 'rgba(139,92,246,0.15)', text: '#A78BFA' },
  received: { bg: 'rgba(245,158,11,0.15)', text: '#F59E0B' },
  in_review: { bg: 'rgba(13,148,136,0.15)', text: '#2DD4BF' },
  pending_info: { bg: 'rgba(245,158,11,0.15)', text: '#FBBF24' },
  approved: { bg: 'rgba(5,150,105,0.15)', text: '#34D399' },
  denied: { bg: 'rgba(244,63,94,0.15)', text: '#F43F5E' },
  matched: { bg: 'rgba(5,150,105,0.15)', text: '#34D399' },
  discrepancy: { bg: 'rgba(244,63,94,0.15)', text: '#F43F5E' },
  resolved: { bg: 'rgba(13,148,136,0.15)', text: '#2DD4BF' },
  paid: { bg: 'rgba(139,92,246,0.15)', text: '#A78BFA' },
  processed: { bg: 'rgba(5,150,105,0.15)', text: '#34D399' },
  sent_to_employer: { bg: 'rgba(13,148,136,0.15)', text: '#2DD4BF' },
};

export default function StatusBadge({ status }) {
  const c = colors[status] || { bg: 'rgba(100,116,139,0.15)', text: '#94A3B8' };
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
