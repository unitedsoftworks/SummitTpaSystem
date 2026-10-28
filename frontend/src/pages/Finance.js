import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import StatusBadge from '../components/StatusBadge';

const fmt = (v) => `$${Number(v).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

export default function Finance() {
  const [data, setData] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/finance-summary/').then(r => setData(r.data));
  }, []);

  if (!data) return <div style={{ padding: 40, color: 'var(--text-muted)' }}>Loading...</div>;

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 600, marginBottom: 4 }}>Finance</div>
        <h2 style={{ margin: '0 0 6px', fontSize: 24, fontWeight: 700 }}>Financial Overview</h2>
        <p style={{ margin: 0, fontSize: 14, color: 'var(--text-secondary)', maxWidth: 600 }}>
          Premium billing, payments, claims expense, and reimbursement summary across all employers.
        </p>
      </div>

      {/* Top-level KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
        <KpiCard label="Monthly premiums" value={fmt(data.monthly_premiums)} sub="All active enrollments" color="#3b82f6" />
        <KpiCard label="Payments received" value={fmt(data.total_payments_received)} sub="Year to date" color="#16a34a" />
        <KpiCard label="Claims paid" value={fmt(data.total_claims_paid)} sub={`${fmt(data.total_claims_pending)} pending`} color="#7c3aed" />
        <KpiCard label="Outstanding invoices" value={fmt(data.outstanding_invoices)} sub={`${data.unpaid_invoice_count} invoices`} color={data.unpaid_invoice_count > 0 ? '#ef4444' : '#16a34a'} />
      </div>

      {/* Premium breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
        <div style={cardStyle}>
          <h3 style={cardHeading}>Premium Breakdown (Monthly)</h3>
          <div style={{ marginTop: 16 }}>
            <BreakdownRow label="Total premiums" value={fmt(data.monthly_premiums)} bold />
            <BreakdownRow label="Employer contributions" value={fmt(data.employer_contributions)} color="#16a34a" />
            <BreakdownRow label="Employee deductions" value={fmt(data.employee_deductions)} color="#3b82f6" />
            <div style={{ marginTop: 16, padding: '12px 16px', background: 'var(--bg)', borderRadius: 8 }}>
              <div style={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden', gap: 2 }}>
                <div style={{ flex: Number(data.employer_contributions), background: '#16a34a', borderRadius: 4 }} />
                <div style={{ flex: Number(data.employee_deductions), background: '#3b82f6', borderRadius: 4 }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 11, color: 'var(--text-secondary)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: '#16a34a', display: 'inline-block' }} />
                  Employer ({(Number(data.employer_contributions) / Number(data.monthly_premiums) * 100).toFixed(0)}%)
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: '#3b82f6', display: 'inline-block' }} />
                  Employee ({(Number(data.employee_deductions) / Number(data.monthly_premiums) * 100).toFixed(0)}%)
                </span>
              </div>
            </div>
          </div>
        </div>

        <div style={cardStyle}>
          <h3 style={cardHeading}>Reimbursements & Claims</h3>
          <div style={{ marginTop: 16 }}>
            <BreakdownRow label="Claims paid" value={fmt(data.total_claims_paid)} color="#7c3aed" />
            <BreakdownRow label="Claims pending" value={fmt(data.total_claims_pending)} color="#f59e0b" />
            <BreakdownRow label="Reimbursements paid" value={fmt(data.total_reimbursed)} color="#16a34a" />
            <BreakdownRow label="Reimbursements pending" value={fmt(data.pending_reimbursements)} color="#f59e0b" />
          </div>
        </div>
      </div>

      {/* Employer financials table */}
      <div style={{ ...cardStyle, marginBottom: 24 }}>
        <h3 style={cardHeading}>Employer Premium Summary</h3>
        <table style={{ width: '100%', marginTop: 16 }}>
          <thead>
            <tr>
              <th style={thStyle}>EMPLOYER</th>
              <th style={thStyle}>EMPLOYEES</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>MONTHLY PREMIUMS</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>EMPLOYER SHARE</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>EMPLOYEE SHARE</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>PAYMENTS RECEIVED</th>
            </tr>
          </thead>
          <tbody>
            {data.employer_financials.map(emp => (
              <tr key={emp.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/staff/employers/${emp.id}`)}>
                <td style={{ padding: '12px 16px', fontWeight: 600, fontSize: 14 }}>{emp.name}</td>
                <td style={{ padding: '12px 16px', fontSize: 14 }}>{emp.active_employees}</td>
                <td style={{ padding: '12px 16px', fontSize: 14, textAlign: 'right', fontWeight: 600 }}>{fmt(emp.monthly_premiums)}</td>
                <td style={{ padding: '12px 16px', fontSize: 14, textAlign: 'right', color: '#16a34a' }}>{fmt(emp.employer_share)}</td>
                <td style={{ padding: '12px 16px', fontSize: 14, textAlign: 'right', color: '#3b82f6' }}>{fmt(emp.employee_share)}</td>
                <td style={{ padding: '12px 16px', fontSize: 14, textAlign: 'right', fontWeight: 600 }}>{fmt(emp.payments_received)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ borderTop: '2px solid var(--border)' }}>
              <td style={{ padding: '12px 16px', fontWeight: 700, fontSize: 14 }}>Total</td>
              <td style={{ padding: '12px 16px', fontWeight: 700, fontSize: 14 }}>
                {data.employer_financials.reduce((s, e) => s + e.active_employees, 0)}
              </td>
              <td style={{ padding: '12px 16px', fontWeight: 700, fontSize: 14, textAlign: 'right' }}>{fmt(data.monthly_premiums)}</td>
              <td style={{ padding: '12px 16px', fontWeight: 700, fontSize: 14, textAlign: 'right', color: '#16a34a' }}>{fmt(data.employer_contributions)}</td>
              <td style={{ padding: '12px 16px', fontWeight: 700, fontSize: 14, textAlign: 'right', color: '#3b82f6' }}>{fmt(data.employee_deductions)}</td>
              <td style={{ padding: '12px 16px', fontWeight: 700, fontSize: 14, textAlign: 'right' }}>{fmt(data.total_payments_received)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Recent payments + Recent invoices */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={cardHeading}>Recent Payments</h3>
            <button className="btn-outline btn-sm" onClick={() => navigate('/staff/invoices')}>View all</button>
          </div>
          {data.recent_payments.map(p => (
            <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{p.employer_name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  {p.payment_date} · {p.reference_number}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{fmt(p.amount)}</div>
                <StatusBadge status={p.status} />
              </div>
            </div>
          ))}
        </div>

        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={cardHeading}>Recent Invoices</h3>
            <button className="btn-outline btn-sm" onClick={() => navigate('/staff/invoices')}>View all</button>
          </div>
          {data.recent_invoices.map(inv => (
            <div key={inv.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{inv.carrier_name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  {inv.invoice_number} · {inv.employer_name}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{fmt(inv.billed_amount)}</div>
                <StatusBadge status={inv.status} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function KpiCard({ label, value, sub, color }) {
  return (
    <div style={cardStyle}>
      <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500, marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

function BreakdownRow({ label, value, color, bold }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
      <span style={{ fontSize: 14, fontWeight: bold ? 700 : 400, display: 'flex', alignItems: 'center', gap: 8 }}>
        {color && <span style={{ width: 8, height: 8, borderRadius: 2, background: color, display: 'inline-block' }} />}
        {label}
      </span>
      <span style={{ fontSize: 14, fontWeight: 700, color: color || 'var(--text)' }}>{value}</span>
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
  padding: '8px 16px', fontSize: 11, fontWeight: 700,
  color: 'var(--text-secondary)', textAlign: 'left',
  borderBottom: '1px solid var(--border)',
};
