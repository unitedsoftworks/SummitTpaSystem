import React, { useEffect, useState } from 'react';
import api from '../api/client';
import StatusBadge from '../components/StatusBadge';

const fileTypeLabels = {
  '834_initial': { label: '834 Initial', bg: '#dbeafe', color: '#1d4ed8' },
  '834_change': { label: '834 Change', bg: '#fef9c3', color: '#a16207' },
  '834_term': { label: '834 Term', bg: '#fee2e2', color: '#dc2626' },
  manual: { label: 'Manual', bg: '#ede9fe', color: '#6d28d9' },
};

const directionLabels = {
  outbound: { label: 'Outbound', icon: 'M14 5l7 7m0 0l-7 7m7-7H3' },
  inbound: { label: 'Inbound', icon: 'M10 19l-7-7m0 0l7-7m-7 7h18' },
};

export default function Eligibility() {
  const [records, setRecords] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [carriers, setCarriers] = useState([]);
  const [carrierFilter, setCarrierFilter] = useState('');

  useEffect(() => {
    api.get('/carriers/').then(r => setCarriers(r.data));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    if (typeFilter) params.set('file_type', typeFilter);
    if (carrierFilter) params.set('carrier', carrierFilter);
    api.get(`/eligibility/?${params}`).then(r => setRecords(r.data));
  }, [statusFilter, typeFilter, carrierFilter]);

  const stats = {
    total: records.length,
    pending: records.filter(r => r.status === 'pending').length,
    sent: records.filter(r => r.status === 'sent').length,
    accepted: records.filter(r => r.status === 'accepted').length,
    rejected: records.filter(r => ['rejected', 'error'].includes(r.status)).length,
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 600, marginBottom: 4 }}>EDI & Eligibility</div>
          <h2 style={{ margin: '0 0 6px', fontSize: 24, fontWeight: 700 }}>Eligibility Management</h2>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--text-secondary)', maxWidth: 600 }}>
            Track 834 eligibility file transmissions and carrier confirmations.
          </p>
        </div>
        <button
          className="btn-primary"
          onClick={() => alert('Generate 834 file flow would go here')}
          style={{
            padding: '10px 20px', borderRadius: 8, border: 'none',
            background: 'var(--accent)', color: '#fff', fontSize: 14,
            fontWeight: 600, cursor: 'pointer',
          }}
        >
          Generate 834 File
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 24 }}>
        <StatCard label="Total records" value={stats.total} color="#3b82f6" />
        <StatCard label="Pending" value={stats.pending} color="#f59e0b" />
        <StatCard label="Sent" value={stats.sent} color="#0891b2" />
        <StatCard label="Accepted" value={stats.accepted} color="#16a34a" />
        <StatCard label="Rejected / Error" value={stats.rejected} color="#ef4444" />
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          style={selectStyle}
        >
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="sent">Sent</option>
          <option value="acknowledged">Acknowledged</option>
          <option value="accepted">Accepted</option>
          <option value="rejected">Rejected</option>
          <option value="error">Error</option>
        </select>
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          style={selectStyle}
        >
          <option value="">All file types</option>
          <option value="834_initial">834 Initial</option>
          <option value="834_change">834 Change</option>
          <option value="834_term">834 Termination</option>
          <option value="manual">Manual</option>
        </select>
        <select
          value={carrierFilter}
          onChange={e => setCarrierFilter(e.target.value)}
          style={selectStyle}
        >
          <option value="">All carriers</option>
          {carriers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* Records table */}
      <div style={cardStyle}>
        <table style={{ width: '100%' }}>
          <thead>
            <tr>
              <th style={thStyle}>DATE</th>
              <th style={thStyle}>TYPE</th>
              <th style={thStyle}>DIRECTION</th>
              <th style={thStyle}>EMPLOYEE</th>
              <th style={thStyle}>CARRIER</th>
              <th style={thStyle}>PLAN</th>
              <th style={thStyle}>EFFECTIVE</th>
              <th style={thStyle}>TRANSACTION ID</th>
              <th style={thStyle}>STATUS</th>
            </tr>
          </thead>
          <tbody>
            {records.map(rec => {
              const ft = fileTypeLabels[rec.file_type] || fileTypeLabels.manual;
              const dir = directionLabels[rec.direction] || directionLabels.outbound;
              return (
                <tr key={rec.id}>
                  <td style={{ ...tdStyle, whiteSpace: 'nowrap', fontSize: 13, color: 'var(--text-secondary)' }}>
                    {new Date(rec.created_at).toLocaleDateString()}
                  </td>
                  <td style={tdStyle}>
                    <span style={{
                      padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700,
                      background: ft.bg, color: ft.color, whiteSpace: 'nowrap',
                    }}>
                      {ft.label}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: 'var(--text-secondary)' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d={dir.icon} />
                      </svg>
                      {dir.label}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{rec.employee_name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{rec.employer_name}</div>
                  </td>
                  <td style={{ ...tdStyle, fontSize: 13 }}>{rec.carrier_name}</td>
                  <td style={{ ...tdStyle, fontSize: 13 }}>{rec.plan_name}</td>
                  <td style={{ ...tdStyle, fontSize: 13 }}>{rec.effective_date}</td>
                  <td style={{ ...tdStyle, fontSize: 12, fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                    {rec.transaction_id || '—'}
                  </td>
                  <td style={tdStyle}>
                    <StatusBadge status={rec.status} />
                    {rec.error_message && (
                      <div style={{ fontSize: 11, color: '#ef4444', marginTop: 2 }} title={rec.error_message}>
                        {rec.error_message.substring(0, 30)}...
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {records.length === 0 && (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
            No eligibility records found. Generate an 834 file to get started.
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div style={cardStyle}>
      <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color }}>{value}</div>
    </div>
  );
}

const cardStyle = {
  background: 'var(--card)',
  borderRadius: 'var(--radius-lg)',
  padding: '16px 20px',
  boxShadow: 'var(--card-shadow)',
  border: '1px solid var(--border)',
};

const selectStyle = {
  padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)',
  fontSize: 14, background: 'var(--card)', color: 'var(--text)', cursor: 'pointer', outline: 'none',
};

const thStyle = {
  padding: '8px 12px', fontSize: 11, fontWeight: 700,
  color: 'var(--text-secondary)', textAlign: 'left',
  borderBottom: '1px solid var(--border)',
};

const tdStyle = { padding: '10px 12px', fontSize: 14 };
