import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import StatusBadge from '../components/StatusBadge';

const fmt = (v) => `$${Number(v).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

const actionColors = {
  carrier_confirm: { bg: 'rgba(13,148,136,0.15)', color: '#2DD4BF', label: 'Confirm' },
  activate: { bg: 'rgba(5,150,105,0.15)', color: '#34D399', label: 'Activate' },
  terminate: { bg: 'rgba(244,63,94,0.15)', color: '#F43F5E', label: 'Terminate' },
  add_member: { bg: 'rgba(139,92,246,0.15)', color: '#A78BFA', label: 'Add Member' },
  remove_member: { bg: 'rgba(245,158,11,0.15)', color: '#F59E0B', label: 'Remove' },
  generate_deductions: { bg: 'rgba(13,148,136,0.15)', color: '#2DD4BF', label: 'Deductions' },
  resolve_invoice: { bg: 'rgba(5,150,105,0.15)', color: '#34D399', label: 'Resolve' },
  pay_invoice: { bg: 'rgba(5,150,105,0.15)', color: '#34D399', label: 'Pay' },
  claim_paid: { bg: 'rgba(5,150,105,0.15)', color: '#34D399', label: 'Paid' },
  claim_approved: { bg: 'rgba(5,150,105,0.15)', color: '#34D399', label: 'Approved' },
  claim_denied: { bg: 'rgba(244,63,94,0.15)', color: '#F43F5E', label: 'Denied' },
  eligibility_sent: { bg: 'rgba(13,148,136,0.15)', color: '#2DD4BF', label: 'Eligibility' },
  eligibility_generated: { bg: 'rgba(13,148,136,0.15)', color: '#2DD4BF', label: 'Eligibility' },
};

export default function Dashboard() {
  const [data, setData] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/dashboard/').then(r => setData(r.data));
  }, []);

  if (!data) return <div style={{ padding: 40, color: 'var(--text-muted)' }}>Loading...</div>;

  const alerts = [];
  if (data.invoice_discrepancies > 0)
    alerts.push({ label: `${data.invoice_discrepancies} invoice discrepancies`, color: '#ef4444', path: '/staff/invoices' });
  if (data.unread_messages > 0)
    alerts.push({ label: `${data.unread_messages} unread messages`, color: '#f59e0b', path: '/staff/messages' });
  if (data.pending_life_events > 0)
    alerts.push({ label: `${data.pending_life_events} pending life events`, color: '#8b5cf6', path: '/staff/life-events' });
  if (data.pending_reimbursements > 0)
    alerts.push({ label: `${data.pending_reimbursements} reimbursements to review`, color: '#0891b2', path: '/staff/reimbursements' });

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 600, marginBottom: 4 }}>Overview</div>
        <h2 style={{ margin: '0 0 6px', fontSize: 24, fontWeight: 700 }}>Staff Dashboard</h2>
        <p style={{ margin: 0, fontSize: 14, color: 'var(--text-secondary)' }}>
          Benefits administration overview across all employer groups.
        </p>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div style={{
          display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap',
        }}>
          {alerts.map((a, i) => (
            <div
              key={i}
              onClick={() => navigate(a.path)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 16px', borderRadius: 8, cursor: 'pointer',
                background: `${a.color}10`, border: `1px solid ${a.color}30`,
                fontSize: 13, fontWeight: 600, color: a.color,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {a.label}
            </div>
          ))}
        </div>
      )}

      {/* Primary KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <KpiCard label="Active Employees" value={data.total_employees} color="#2DD4BF" icon="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197" />
        <KpiCard label="Active Enrollments" value={data.active_enrollments} sub={`${data.pending_enrollments} pending`} color="#059669" icon="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        <KpiCard label="Monthly Premiums" value={fmt(data.total_monthly_premiums)} color="#8B5CF6" icon="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        <KpiCard label="Open Claims" value={data.open_claims} color="#F59E0B" icon="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </div>

      {/* Financial row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
        <MiniCard label="Employers" value={data.total_employers} onClick={() => navigate('/staff/employers')} />
        <MiniCard label="Associations" value={data.total_associations} />
        <MiniCard label="Brokers" value={data.total_brokers} />
        <MiniCard label="Outstanding Invoices" value={fmt(data.outstanding_invoice_amount)} alert={data.pending_invoices > 0} onClick={() => navigate('/staff/invoices')} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 24, marginBottom: 24 }}>
        {/* Employer summary */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={cardHeading}>Employer Summary</h3>
            <button className="btn-outline btn-sm" onClick={() => navigate('/staff/employers')}>View all</button>
          </div>
          <table style={{ width: '100%' }}>
            <thead>
              <tr>
                <th style={thStyle}>EMPLOYER</th>
                <th style={thStyle}>EEs</th>
                <th style={thStyle}>ENROLLED</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>PREMIUM</th>
              </tr>
            </thead>
            <tbody>
              {data.employer_summary.map(emp => (
                <tr key={emp.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/staff/employers/${emp.id}`)}>
                  <td style={{ ...tdStyle, fontWeight: 600 }}>{emp.name}</td>
                  <td style={tdStyle}>{emp.employees}</td>
                  <td style={tdStyle}>{emp.enrollments}</td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>{fmt(emp.monthly_premium)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Recent claims */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={cardHeading}>Recent Claims</h3>
            <button className="btn-outline btn-sm" onClick={() => navigate('/staff/claims')}>View all</button>
          </div>
          {data.recent_claims.map(claim => (
            <div
              key={claim.id}
              onClick={() => navigate(`/staff/claims/${claim.id}`)}
              style={{
                padding: '10px 0', borderBottom: '1px solid var(--border)',
                cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}
            >
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{claim.claim_number}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  {claim.patient_name} &middot; {claim.provider_name}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{fmt(claim.billed_amount)}</div>
                <StatusBadge status={claim.status} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={cardHeading}>Recent Activity</h3>
          <button className="btn-outline btn-sm" onClick={() => navigate('/staff/audit-log')}>View audit log</button>
        </div>
        {data.recent_activity.map((log, i) => {
          const ac = actionColors[log.action] || { bg: 'var(--bg)', color: 'var(--text-secondary)', label: log.action };
          return (
            <div key={log.id || i} style={{
              padding: '10px 0',
              borderBottom: i < data.recent_activity.length - 1 ? '1px solid var(--border)' : 'none',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{
                  padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700,
                  background: ac.bg, color: ac.color, whiteSpace: 'nowrap',
                }}>
                  {ac.label}
                </span>
                <span style={{ fontSize: 13 }}>{log.description}</span>
              </div>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                {new Date(log.created_at).toLocaleDateString()}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function KpiCard({ label, value, sub, color, icon }) {
  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500, marginBottom: 8 }}>{label}</div>
          <div style={{ fontSize: 28, fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
          {sub && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>{sub}</div>}
        </div>
        <div style={{
          width: 40, height: 40, borderRadius: 10, background: `${color}12`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d={icon} />
          </svg>
        </div>
      </div>
    </div>
  );
}

function MiniCard({ label, value, alert, onClick }) {
  return (
    <div onClick={onClick} style={{
      ...cardStyle, cursor: onClick ? 'pointer' : 'default',
      padding: '14px 18px',
    }}>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: alert ? '#ef4444' : 'var(--text)' }}>{value}</div>
    </div>
  );
}

const cardStyle = {
  background: 'var(--card)',
  borderRadius: 'var(--radius-lg)',
  padding: '20px 24px',
  boxShadow: 'var(--card-shadow)',
  border: '1px solid var(--border)',
};

const cardHeading = { margin: 0, fontSize: 16, fontWeight: 700 };

const thStyle = {
  padding: '8px 12px', fontSize: 11, fontWeight: 700,
  color: 'var(--text-secondary)', textAlign: 'left',
  borderBottom: '1px solid var(--border)',
};

const tdStyle = { padding: '10px 12px', fontSize: 14 };
