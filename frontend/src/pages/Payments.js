import React, { useEffect, useState } from 'react';
import api from '../api/client';

const methodLabels = { ach: 'ACH Transfer', check: 'Check', wire: 'Wire Transfer' };
const methodIcons = {
  ach: { bg: '#dbeafe', color: '#1d4ed8' },
  check: { bg: '#d1fae5', color: '#059669' },
  wire: { bg: '#ede9fe', color: '#7c3aed' },
};
const statusConfig = {
  pending: { bg: '#fef9c3', color: '#a16207' },
  received: { bg: '#dbeafe', color: '#1d4ed8' },
  applied: { bg: '#d1fae5', color: '#059669' },
  returned: { bg: '#fee2e2', color: '#dc2626' },
};

export default function Payments() {
  const [payments, setPayments] = useState([]);
  const [employers, setEmployers] = useState([]);
  const [employerFilter, setEmployerFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    api.get('/employers/').then(r => setEmployers(r.data));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (employerFilter) params.set('employer', employerFilter);
    if (statusFilter) params.set('status', statusFilter);
    api.get(`/payments/?${params}`).then(r => setPayments(r.data));
  }, [employerFilter, statusFilter]);

  const totalReceived = payments.filter(p => p.status === 'applied' || p.status === 'received')
    .reduce((s, p) => s + parseFloat(p.amount), 0);
  const totalPending = payments.filter(p => p.status === 'pending')
    .reduce((s, p) => s + parseFloat(p.amount), 0);

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 600, marginBottom: 4 }}>Finance</div>
        <h2 style={{ margin: '0 0 6px', fontSize: 24, fontWeight: 700 }}>Payment Management</h2>
        <p style={{ margin: 0, fontSize: 14, color: 'var(--text-secondary)', maxWidth: 600 }}>
          Track employer premium payments, reconcile received amounts, and manage payment processing.
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Total Payments', value: payments.length, fmt: false, color: '#3b82f6' },
          { label: 'Total Received', value: totalReceived, fmt: true, color: '#059669' },
          { label: 'Pending', value: totalPending, fmt: true, color: '#f59e0b' },
          { label: 'Returned', value: payments.filter(p => p.status === 'returned').length, fmt: false, color: '#dc2626' },
        ].map((s, i) => (
          <div key={i} style={cardStyle}>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500, marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>
              {s.fmt ? `$${s.value.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : s.value}
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <select value={employerFilter} onChange={e => setEmployerFilter(e.target.value)} style={selectStyle}>
          <option value="">All employers</option>
          {employers.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={selectStyle}>
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="received">Received</option>
          <option value="applied">Applied</option>
          <option value="returned">Returned</option>
        </select>
      </div>

      {/* Payment table */}
      <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={thStyle}>Employer</th>
              <th style={thStyle}>Date</th>
              <th style={thStyle}>Period</th>
              <th style={thStyle}>Method</th>
              <th style={thStyle}>Reference</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Amount</th>
              <th style={thStyle}>Status</th>
            </tr>
          </thead>
          <tbody>
            {payments.map(p => {
              const sc = statusConfig[p.status] || statusConfig.pending;
              const mc = methodIcons[p.payment_method] || methodIcons.ach;
              return (
                <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={tdStyle}>
                    <span style={{ fontWeight: 600 }}>{p.employer_name}</span>
                  </td>
                  <td style={tdStyle}>{p.payment_date}</td>
                  <td style={{ ...tdStyle, fontSize: 13, color: 'var(--text-secondary)' }}>
                    {p.period_start} — {p.period_end}
                  </td>
                  <td style={tdStyle}>
                    <span style={{
                      padding: '3px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                      background: mc.bg, color: mc.color,
                    }}>
                      {methodLabels[p.payment_method]}
                    </span>
                  </td>
                  <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: 13, color: 'var(--text-secondary)' }}>
                    {p.reference_number || '—'}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, fontSize: 15 }}>
                    ${parseFloat(p.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                  <td style={tdStyle}>
                    <span style={{
                      padding: '3px 10px', borderRadius: 10, fontSize: 11, fontWeight: 700,
                      background: sc.bg, color: sc.color, textTransform: 'capitalize',
                    }}>
                      {p.status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {payments.length === 0 && (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
            No payments found matching filters.
          </div>
        )}
      </div>
    </div>
  );
}

const cardStyle = {
  background: 'var(--card)', borderRadius: 'var(--radius-lg)',
  padding: '16px 20px', boxShadow: 'var(--card-shadow)', border: '1px solid var(--border)',
};
const selectStyle = {
  padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)',
  fontSize: 14, background: 'var(--card)', color: 'var(--text)', cursor: 'pointer', outline: 'none',
};
const thStyle = {
  padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700,
  color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px',
  borderBottom: '2px solid var(--border)', background: '#f8fafc',
};
const tdStyle = { padding: '12px 16px', fontSize: 14 };
