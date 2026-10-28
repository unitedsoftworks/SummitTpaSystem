import React, { useEffect, useState } from 'react';
import api from '../api/client';

const statusConfig = {
  draft: { bg: '#f1f5f9', color: '#64748b' },
  sent: { bg: '#dbeafe', color: '#1d4ed8' },
  paid: { bg: '#d1fae5', color: '#059669' },
  partial: { bg: '#fef9c3', color: '#a16207' },
  overdue: { bg: '#fee2e2', color: '#dc2626' },
};

const planTypeColors = {
  medical: { bg: '#dbeafe', color: '#1d4ed8' },
  dental: { bg: '#d1fae5', color: '#059669' },
  vision: { bg: '#ede9fe', color: '#7c3aed' },
  life: { bg: '#f1f5f9', color: '#64748b' },
};

export default function EmployerInvoices() {
  const [invoices, setInvoices] = useState([]);
  const [employers, setEmployers] = useState([]);
  const [employerFilter, setEmployerFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    api.get('/employers/').then(r => setEmployers(r.data));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (employerFilter) params.set('employer', employerFilter);
    if (statusFilter) params.set('status', statusFilter);
    api.get(`/employer-invoices/?${params}`).then(r => setInvoices(r.data));
  }, [employerFilter, statusFilter]);

  const totalDue = invoices.reduce((s, inv) => s + parseFloat(inv.total_due), 0);
  const totalPaid = invoices.filter(i => i.status === 'paid').reduce((s, inv) => s + parseFloat(inv.total_due), 0);
  const totalOutstanding = invoices.filter(i => i.status !== 'paid').reduce((s, inv) => s + parseFloat(inv.total_due), 0);

  const fmt = (v) => `$${parseFloat(v).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 600, marginBottom: 4 }}>Finance</div>
        <h2 style={{ margin: '0 0 6px', fontSize: 24, fontWeight: 700 }}>Employer Invoices</h2>
        <p style={{ margin: 0, fontSize: 14, color: 'var(--text-secondary)', maxWidth: 600 }}>
          Monthly invoices sent to employer groups for premium contributions, employee deductions, and admin fees.
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Total Invoices', value: invoices.length, fmt: false, color: '#3b82f6' },
          { label: 'Total Billed', value: totalDue, fmt: true, color: '#1e293b' },
          { label: 'Collected', value: totalPaid, fmt: true, color: '#059669' },
          { label: 'Outstanding', value: totalOutstanding, fmt: true, color: totalOutstanding > 0 ? '#dc2626' : '#6b7280' },
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
          <option value="draft">Draft</option>
          <option value="sent">Sent</option>
          <option value="paid">Paid</option>
          <option value="partial">Partially Paid</option>
          <option value="overdue">Overdue</option>
        </select>
      </div>

      {/* Invoice list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {invoices.map(inv => {
          const sc = statusConfig[inv.status] || statusConfig.draft;
          const isExpanded = expanded === inv.id;
          const lines = inv.lines || [];

          return (
            <div key={inv.id} style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
              {/* Invoice header */}
              <div
                onClick={() => setExpanded(isExpanded ? null : inv.id)}
                style={{
                  padding: '18px 24px', cursor: 'pointer', display: 'flex',
                  justifyContent: 'space-between', alignItems: 'center',
                  borderBottom: isExpanded ? '1px solid var(--border)' : 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>{inv.invoice_number}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
                      {inv.employer_name} &middot; {inv.billing_period_start} to {inv.billing_period_end}
                    </div>
                  </div>
                  <span style={{
                    padding: '3px 10px', borderRadius: 10, fontSize: 11, fontWeight: 700,
                    background: sc.bg, color: sc.color, textTransform: 'capitalize',
                  }}>
                    {inv.status}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>{fmt(inv.total_due)}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      Due {inv.due_date}
                    </div>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2"
                    style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>
              </div>

              {/* Expanded detail */}
              {isExpanded && (
                <div>
                  {/* Summary bar */}
                  <div style={{
                    padding: '12px 24px', background: 'var(--table-header-bg)',
                    display: 'flex', gap: 32, fontSize: 13,
                  }}>
                    <div><span style={{ color: 'var(--text-muted)' }}>Premium Total:</span> <strong>{fmt(inv.premium_total)}</strong></div>
                    <div><span style={{ color: 'var(--text-muted)' }}>Employer Share:</span> <strong style={{ color: '#059669' }}>{fmt(inv.employer_share)}</strong></div>
                    <div><span style={{ color: 'var(--text-muted)' }}>Employee Share:</span> <strong style={{ color: '#1d4ed8' }}>{fmt(inv.employee_share)}</strong></div>
                    {parseFloat(inv.admin_fee) > 0 && (
                      <div><span style={{ color: 'var(--text-muted)' }}>Admin Fee:</span> <strong>{fmt(inv.admin_fee)}</strong></div>
                    )}
                  </div>

                  {/* Line items table */}
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={thStyle}>Employee</th>
                        <th style={thStyle}>Plan</th>
                        <th style={thStyle}>Tier</th>
                        <th style={{ ...thStyle, textAlign: 'right' }}>Premium</th>
                        <th style={{ ...thStyle, textAlign: 'right' }}>Employer Pays</th>
                        <th style={{ ...thStyle, textAlign: 'right' }}>Employee Pays</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lines.map((line, idx) => {
                        const pc = planTypeColors[line.plan_type] || planTypeColors.medical;
                        return (
                          <tr key={idx} style={{ borderBottom: '1px solid var(--table-row-border)' }}>
                            <td style={tdStyle}><span style={{ fontWeight: 600 }}>{line.employee_name}</span></td>
                            <td style={tdStyle}>
                              <span style={{
                                padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                                background: pc.bg, color: pc.color,
                              }}>
                                {line.plan_name}
                              </span>
                            </td>
                            <td style={{ ...tdStyle, color: 'var(--text-secondary)', fontSize: 13 }}>{line.tier_display}</td>
                            <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>{fmt(line.monthly_premium)}</td>
                            <td style={{ ...tdStyle, textAlign: 'right', color: '#059669', fontWeight: 600 }}>{fmt(line.employer_contribution)}</td>
                            <td style={{ ...tdStyle, textAlign: 'right', color: '#1d4ed8', fontWeight: 600 }}>{fmt(line.employee_deduction)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr style={{ borderTop: '2px solid var(--border)' }}>
                        <td colSpan="3" style={{ ...tdStyle, fontWeight: 700 }}>
                          Total ({lines.length} line items)
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700 }}>{fmt(inv.premium_total)}</td>
                        <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, color: '#059669' }}>{fmt(inv.employer_share)}</td>
                        <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, color: '#1d4ed8' }}>{fmt(inv.employee_share)}</td>
                      </tr>
                    </tfoot>
                  </table>

                  {inv.notes && (
                    <div style={{ padding: '12px 24px', fontSize: 13, color: 'var(--text-secondary)', borderTop: '1px solid var(--border)' }}>
                      <strong>Notes:</strong> {inv.notes}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {invoices.length === 0 && (
          <div style={{ ...cardStyle, padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
            No employer invoices found.
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
  borderBottom: '2px solid var(--border)', background: 'var(--table-header-bg)',
};
const tdStyle = { padding: '10px 16px', fontSize: 13 };
