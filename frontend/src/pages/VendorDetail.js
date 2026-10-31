import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/client';
import StatusBadge from '../components/StatusBadge';

const fmt = (v) => `$${Number(v).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

const typeColors = {
  carrier: { bg: '#dbeafe', color: '#1d4ed8' },
  broker: { bg: '#ede9fe', color: '#6d28d9' },
  tpa: { bg: '#ffedd5', color: '#c2410c' },
  other: { bg: '#dcfce7', color: '#15803d' },
};

const planTypeColors = {
  medical: { bg: '#dbeafe', color: '#1d4ed8' },
  dental: { bg: '#ede9fe', color: '#6d28d9' },
  vision: { bg: '#ffedd5', color: '#c2410c' },
  life: { bg: '#dcfce7', color: '#15803d' },
};

export default function VendorDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get(`/vendor-detail/${id}/`).then(r => setData(r.data));
  }, [id]);

  if (!data) return <div style={{ padding: 40, color: 'var(--text-muted)' }}>Loading...</div>;

  const { vendor, products, invoices, summary } = data;
  const tc = typeColors[vendor.vendor_type] || typeColors.carrier;

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <button
          onClick={() => navigate('/staff/vendors')}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--accent)', fontSize: 13, fontWeight: 600,
            padding: 0, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 4,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Back to Vendors
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12, background: tc.bg,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={tc.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
          </div>
          <div>
            <h2 style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 700 }}>{vendor.name}</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{
                padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600,
                background: tc.bg, color: tc.color, textTransform: 'capitalize',
              }}>
                {vendor.vendor_type_display || vendor.vendor_type}
              </span>
              {vendor.contact_name && (
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  {vendor.contact_name}
                </span>
              )}
              {vendor.agency && (
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  {vendor.agency}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
        <KpiCard label="Active products" value={summary.active_products} color="#3b82f6" />
        <KpiCard label="Active enrollments" value={summary.active_enrollments} sub={`${summary.total_members} members`} color="#16a34a" />
        <KpiCard label="Monthly allocation" value={fmt(summary.total_monthly_allocation)} sub={`${summary.employers_served} employers`} color="#7c3aed" />
        <KpiCard label="Claims paid" value={fmt(summary.claims_paid)} sub={`${summary.claims_pending} pending`} color="#ea580c" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
        {/* Contact info */}
        <div style={cardStyle}>
          <h3 style={cardHeading}>Contact Information</h3>
          <div style={{ marginTop: 16, fontSize: 14, lineHeight: 2.2 }}>
            <InfoRow label="Contact" value={vendor.contact_name || '—'} />
            <InfoRow label="Email" value={vendor.contact_email || '—'} />
            <InfoRow label="Phone" value={vendor.contact_phone || '—'} />
            {vendor.agency && <InfoRow label="Agency" value={vendor.agency} />}
            {vendor.license_number && <InfoRow label="License" value={`${vendor.license_number} (${vendor.license_state})`} />}
            <InfoRow label="Employers served" value={summary.employers_served} />
            <InfoRow label="Total billed" value={fmt(summary.total_billed)} />
            <InfoRow label="Discrepancies" value={
              <span style={{ color: summary.total_discrepancies > 0 ? '#ef4444' : '#16a34a', fontWeight: 600 }}>
                {summary.total_discrepancies}
              </span>
            } />
          </div>
        </div>

        {/* Products */}
        <div style={cardStyle}>
          <h3 style={cardHeading}>Benefit Products ({products.length})</h3>
          <div style={{ marginTop: 12 }}>
            {products.length === 0 ? (
              <div style={{ padding: 20, color: 'var(--text-muted)', fontSize: 14, textAlign: 'center' }}>No active products</div>
            ) : products.map(product => {
              const ptc = planTypeColors[product.plan_type] || planTypeColors.medical;
              return (
                <div key={product.id} style={{
                  padding: '12px 0', borderBottom: '1px solid var(--border)',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{product.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', gap: 8, marginTop: 2 }}>
                      <span>{product.employer_name}</span>
                      <span style={{
                        padding: '1px 6px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                        background: ptc.bg, color: ptc.color, textTransform: 'capitalize',
                      }}>
                        {product.plan_type}
                      </span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{(product.tiers || []).length} tiers</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      {product.total_enrolled} enrolled
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent Invoices */}
      {invoices && invoices.length > 0 && (
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={cardHeading}>Recent Invoices</h3>
            <button className="btn-outline btn-sm" onClick={() => navigate('/staff/invoices')}>View all invoices</button>
          </div>
          <table style={{ width: '100%' }}>
            <thead>
              <tr>
                <th style={thStyle}>INVOICE #</th>
                <th style={thStyle}>EMPLOYER</th>
                <th style={thStyle}>PERIOD</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>BILLED</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>EXPECTED</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>VARIANCE</th>
                <th style={thStyle}>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map(inv => (
                <tr key={inv.id}>
                  <td style={tdStyle}><span style={{ fontWeight: 600 }}>{inv.invoice_number}</span></td>
                  <td style={tdStyle}>{inv.employer_name}</td>
                  <td style={tdStyle}>{inv.billing_period_start}</td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>{fmt(inv.billed_amount)}</td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>{fmt(inv.expected_amount)}</td>
                  <td style={{
                    ...tdStyle, textAlign: 'right', fontWeight: 600,
                    color: Number(inv.discrepancy) !== 0 ? '#ef4444' : 'var(--text-secondary)',
                  }}>
                    {Number(inv.discrepancy) !== 0 ? fmt(inv.discrepancy) : '—'}
                  </td>
                  <td style={tdStyle}><StatusBadge status={inv.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
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

function InfoRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
      <span style={{ fontWeight: 600 }}>{value}</span>
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

const tdStyle = { padding: '12px 16px', fontSize: 14 };
