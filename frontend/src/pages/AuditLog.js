import React, { useEffect, useState } from 'react';
import api from '../api/client';

const actionColors = {
  carrier_confirm: { bg: '#dbeafe', color: '#1d4ed8', label: 'Confirm' },
  activate: { bg: '#dcfce7', color: '#15803d', label: 'Activate' },
  terminate: { bg: '#fee2e2', color: '#dc2626', label: 'Terminate' },
  add_member: { bg: '#ede9fe', color: '#6d28d9', label: 'Add Member' },
  remove_member: { bg: '#ffedd5', color: '#c2410c', label: 'Remove' },
  generate_deductions: { bg: '#e0f2fe', color: '#0369a1', label: 'Gen Deductions' },
  resolve_invoice: { bg: '#dcfce7', color: '#15803d', label: 'Resolve' },
  pay_invoice: { bg: '#dcfce7', color: '#15803d', label: 'Pay Invoice' },
  claim_received: { bg: '#e0f2fe', color: '#0369a1', label: 'Received' },
  claim_in_review: { bg: '#fef9c3', color: '#a16207', label: 'In Review' },
  claim_approved: { bg: '#dcfce7', color: '#15803d', label: 'Approved' },
  claim_denied: { bg: '#fee2e2', color: '#dc2626', label: 'Denied' },
  claim_paid: { bg: '#dcfce7', color: '#15803d', label: 'Paid' },
};

export default function AuditLog() {
  const [logs, setLogs] = useState([]);
  const [search, setSearch] = useState('');
  const [entityFilter, setEntityFilter] = useState('');

  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (entityFilter) params.set('entity_type', entityFilter);
    api.get(`/audit-log/?${params}`).then(r => setLogs(r.data));
  }, [search, entityFilter]);

  const entityTypes = [...new Set(logs.map(l => l.entity_type))].sort();

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 600, marginBottom: 4 }}>System</div>
        <h2 style={{ margin: '0 0 6px', fontSize: 24, fontWeight: 700 }}>Audit Log</h2>
        <p style={{ margin: 0, fontSize: 14, color: 'var(--text-secondary)' }}>
          System activity and change tracking across all entities.
        </p>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <StatCard label="Total events" value={logs.length} color="#3b82f6" />
        <StatCard label="Entity types" value={entityTypes.length} color="#7c3aed" />
        <StatCard label="Today" value={logs.filter(l => new Date(l.created_at).toDateString() === new Date().toDateString()).length} color="#16a34a" />
        <StatCard label="Unique actions" value={[...new Set(logs.map(l => l.action))].length} color="#ea580c" />
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search audit log..."
          style={{
            flex: 1, padding: '10px 14px', borderRadius: 8,
            border: '1px solid var(--border)', fontSize: 14,
            background: 'var(--card)', color: 'var(--text)', outline: 'none',
          }}
        />
        <select
          value={entityFilter}
          onChange={e => setEntityFilter(e.target.value)}
          style={{
            padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)',
            fontSize: 14, background: 'var(--card)', color: 'var(--text)', cursor: 'pointer', outline: 'none',
          }}
        >
          <option value="">All entities</option>
          {entityTypes.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {/* Log table */}
      <div style={cardStyle}>
        <table style={{ width: '100%' }}>
          <thead>
            <tr>
              <th style={thStyle}>TIMESTAMP</th>
              <th style={thStyle}>ACTION</th>
              <th style={thStyle}>ENTITY</th>
              <th style={thStyle}>DESCRIPTION</th>
              <th style={thStyle}>PERFORMED BY</th>
            </tr>
          </thead>
          <tbody>
            {logs.map(log => {
              const ac = actionColors[log.action] || { bg: '#f0f2f5', color: '#666', label: log.action };
              return (
                <tr key={log.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ ...tdStyle, whiteSpace: 'nowrap', fontSize: 13, color: 'var(--text-secondary)' }}>
                    {new Date(log.created_at).toLocaleDateString()}{' '}
                    <span style={{ color: 'var(--text-muted)' }}>
                      {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <span style={{
                      padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700,
                      background: ac.bg, color: ac.color, whiteSpace: 'nowrap',
                    }}>
                      {ac.label}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <span style={{
                      fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)',
                      background: 'var(--bg)', padding: '2px 8px', borderRadius: 4,
                    }}>
                      {log.entity_type}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 4 }}>#{log.entity_id}</span>
                  </td>
                  <td style={{ ...tdStyle, fontSize: 13, maxWidth: 400 }}>{log.description}</td>
                  <td style={{ ...tdStyle, fontSize: 13, fontWeight: 500 }}>{log.performed_by}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {logs.length === 0 && (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
            No audit log entries found.
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div style={cardStyle}>
      <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color }}>{value}</div>
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

const thStyle = {
  padding: '8px 16px', fontSize: 11, fontWeight: 700,
  color: 'var(--text-secondary)', textAlign: 'left',
  borderBottom: '1px solid var(--border)',
};

const tdStyle = { padding: '12px 16px', fontSize: 14 };
