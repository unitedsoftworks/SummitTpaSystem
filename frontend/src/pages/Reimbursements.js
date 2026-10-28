import React, { useEffect, useState } from 'react';
import api from '../api/client';
import StatusBadge from '../components/StatusBadge';

export default function Reimbursements() {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [selected, setSelected] = useState(null);

  const load = () => {
    const params = {};
    if (filter) params.status = filter;
    if (typeFilter) params.reimbursement_type = typeFilter;
    api.get('/reimbursements/', { params }).then(r => setItems(r.data));
  };

  useEffect(load, [filter, typeFilter]);

  const updateStatus = async (id, data) => {
    await api.patch(`/reimbursements/${id}/`, data);
    setSelected(null);
    load();
  };

  const totalRequested = items.reduce((s, r) => s + Number(r.amount_requested), 0);
  const totalApproved = items.filter(r => r.amount_approved).reduce((s, r) => s + Number(r.amount_approved), 0);
  const pendingCount = items.filter(r => ['submitted', 'in_review'].includes(r.status)).length;

  const tabs = [
    { key: '', label: 'All', count: items.length },
    { key: 'submitted', label: 'Submitted' },
    { key: 'in_review', label: 'In Review' },
    { key: 'approved', label: 'Approved' },
    { key: 'paid', label: 'Paid' },
    { key: 'denied', label: 'Denied' },
  ];

  const typeLabels = { hra: 'HRA', fsa: 'FSA', hsa: 'HSA', other: 'Other' };
  const categoryLabels = {
    medical: 'Medical', dental: 'Dental', vision: 'Vision',
    prescription: 'Prescription', mental_health: 'Mental Health', other: 'Other',
  };

  const typeColors = { hra: '#3b82f6', fsa: '#7c3aed', hsa: '#16a34a', other: '#6b7280' };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 600, marginBottom: 4 }}>Member Service</div>
          <h2 style={{ margin: '0 0 6px', fontSize: 24, fontWeight: 700 }}>Reimbursements</h2>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--text-secondary)', maxWidth: 600 }}>
            HRA, FSA, and HSA reimbursement requests. {pendingCount} pending review.
          </p>
        </div>
        <button className="btn-primary" style={{ whiteSpace: 'nowrap' }}>+ Submit request</button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
        {[
          { label: 'Pending review', value: pendingCount, format: 'num', color: '#f59e0b' },
          { label: 'Total requested', value: `$${totalRequested.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, color: '#3b82f6' },
          { label: 'Total approved', value: `$${totalApproved.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, color: '#16a34a' },
          { label: 'Missing receipts', value: items.filter(r => !r.receipt_received && ['submitted', 'in_review'].includes(r.status)).length, format: 'num', color: '#ef4444' },
        ].map((s, i) => (
          <div key={i} style={cardStyle}>
            <div style={{ fontSize: 28, fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs + type filter */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)', marginBottom: 20 }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setFilter(t.key)} style={{
            padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer',
            fontSize: 13, fontWeight: 600,
            color: filter === t.key ? 'var(--text)' : 'var(--text-secondary)',
            borderBottom: filter === t.key ? '2px solid var(--accent)' : '2px solid transparent',
            marginBottom: -1,
          }}>
            {t.label}{t.count !== undefined ? ` (${t.count})` : ''}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={selectStyle}>
          <option value="">All types</option>
          {Object.entries(typeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {/* Table */}
      <div style={cardStyle}>
        <table style={{ width: '100%' }}>
          <thead>
            <tr>
              <th style={thStyle}>TYPE</th>
              <th style={thStyle}>EMPLOYEE</th>
              <th style={thStyle}>DESCRIPTION</th>
              <th style={thStyle}>CATEGORY</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>REQUESTED</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>APPROVED</th>
              <th style={thStyle}>STATUS</th>
              <th style={thStyle}>RECEIPT</th>
              <th style={thStyle}></th>
            </tr>
          </thead>
          <tbody>
            {items.map(r => (
              <tr key={r.id} style={{ cursor: 'pointer' }} onClick={() => setSelected(r)}>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{
                    fontWeight: 700, fontSize: 12, color: typeColors[r.reimbursement_type] || '#6b7280',
                    background: `${typeColors[r.reimbursement_type] || '#6b7280'}15`,
                    padding: '3px 8px', borderRadius: 4,
                  }}>
                    {typeLabels[r.reimbursement_type] || r.reimbursement_type}
                  </span>
                </td>
                <td style={{ padding: '12px 16px', fontSize: 14, fontWeight: 600 }}>{r.employee_name}</td>
                <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-secondary)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {r.description}
                </td>
                <td style={{ padding: '12px 16px', fontSize: 13 }}>{categoryLabels[r.category] || r.category}</td>
                <td style={{ padding: '12px 16px', fontSize: 14, textAlign: 'right', fontWeight: 600 }}>
                  ${Number(r.amount_requested).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </td>
                <td style={{ padding: '12px 16px', fontSize: 14, textAlign: 'right', fontWeight: 600, color: r.amount_approved ? 'var(--text)' : 'var(--text-muted)' }}>
                  {r.amount_approved ? `$${Number(r.amount_approved).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—'}
                </td>
                <td style={{ padding: '12px 16px' }}><StatusBadge status={r.status} /></td>
                <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                  {r.receipt_received ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
                    </svg>
                  )}
                </td>
                <td style={{ padding: '12px 16px' }}>
                  {r.status === 'submitted' && (
                    <button className="btn-primary btn-xs" onClick={e => { e.stopPropagation(); updateStatus(r.id, { status: 'in_review' }); }}>Review</button>
                  )}
                  {r.status === 'in_review' && (
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn-primary btn-xs" onClick={e => { e.stopPropagation(); updateStatus(r.id, { status: 'approved', amount_approved: r.amount_requested }); }}>Approve</button>
                      <button className="btn-outline btn-xs" onClick={e => { e.stopPropagation(); updateStatus(r.id, { status: 'denied', denial_reason: 'Not an eligible expense' }); }}>Deny</button>
                    </div>
                  )}
                  {r.status === 'approved' && (
                    <button className="btn-primary btn-xs" onClick={e => { e.stopPropagation(); updateStatus(r.id, { status: 'paid', paid_date: new Date().toISOString().slice(0, 10) }); }}>Pay</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 && (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>No reimbursements found.</div>
        )}
      </div>

      {/* Detail modal */}
      {selected && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000,
        }} onClick={() => setSelected(null)}>
          <div style={{
            background: 'var(--card)', borderRadius: 12, padding: 28,
            maxWidth: 520, width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 700 }}>Reimbursement Details</h3>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>{selected.employee_name} · {selected.employer_name}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Field label="Type" value={typeLabels[selected.reimbursement_type]} />
              <Field label="Category" value={categoryLabels[selected.category]} />
              <Field label="Amount requested" value={`$${Number(selected.amount_requested).toFixed(2)}`} />
              <Field label="Amount approved" value={selected.amount_approved ? `$${Number(selected.amount_approved).toFixed(2)}` : '—'} />
              <Field label="Expense date" value={selected.expense_date} />
              <Field label="Status" value={selected.status.replace(/_/g, ' ')} />
              <div style={{ gridColumn: '1 / -1' }}>
                <Field label="Description" value={selected.description} />
              </div>
              <Field label="Receipt received" value={selected.receipt_received ? 'Yes' : 'No'} />
              {selected.reviewed_by && <Field label="Reviewed by" value={selected.reviewed_by} />}
              {selected.denial_reason && (
                <div style={{ gridColumn: '1 / -1', padding: '10px 14px', background: '#fef2f2', borderRadius: 8, fontSize: 13, color: '#c62828' }}>
                  <strong>Denial reason:</strong> {selected.denial_reason}
                </div>
              )}
              {selected.paid_date && <Field label="Paid date" value={selected.paid_date} />}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
              <button className="btn-outline" onClick={() => setSelected(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div style={{ marginBottom: 4 }}>
      <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 500 }}>{value}</div>
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

const selectStyle = {
  padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border)',
  fontSize: 13, background: 'var(--card)', color: 'var(--text)', cursor: 'pointer', outline: 'none',
  marginBottom: -1,
};
