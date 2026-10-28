import React, { useEffect, useState } from 'react';
import api from '../api/client';
import StatusBadge from '../components/StatusBadge';

const fmt = (v) => `$${Number(v).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

const planTypeColors = {
  medical: { bg: '#dbeafe', color: '#1d4ed8', icon: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z' },
  dental: { bg: '#ede9fe', color: '#6d28d9', icon: 'M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
  vision: { bg: '#ffedd5', color: '#c2410c', icon: 'M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z' },
  life: { bg: '#dcfce7', color: '#15803d', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
};

export default function EmployeePortal() {
  const [employees, setEmployees] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('benefits');

  useEffect(() => {
    api.get('/employees/?status=active').then(r => setEmployees(r.data));
  }, []);

  useEffect(() => {
    if (selectedId) {
      setData(null);
      api.get(`/employee-portal/${selectedId}/`).then(r => setData(r.data));
    }
  }, [selectedId]);

  const tabs = [
    { key: 'benefits', label: 'My Benefits' },
    { key: 'claims', label: 'Claims History' },
    { key: 'deductions', label: 'Payroll Deductions' },
    { key: 'idcard', label: 'ID Cards' },
  ];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 600, marginBottom: 4 }}>Employee Portal</div>
        <h2 style={{ margin: '0 0 6px', fontSize: 24, fontWeight: 700 }}>My Benefits</h2>
        <p style={{ margin: 0, fontSize: 14, color: 'var(--text-secondary)' }}>
          View your benefits, claims, and payroll deductions
        </p>
      </div>

      {/* Employee selector */}
      <div style={{
        ...cardStyle, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.5px' }}>EMPLOYEE:</label>
        <select
          value={selectedId}
          onChange={e => { setSelectedId(e.target.value); setTab('benefits'); }}
          style={{
            flex: 1, padding: '8px 12px', borderRadius: 8, maxWidth: 400,
            border: '1px solid var(--border)', fontSize: 14,
            background: 'var(--card)', color: 'var(--text)', outline: 'none',
          }}
        >
          <option value="">-- Select an employee --</option>
          {employees.map(emp => (
            <option key={emp.id} value={emp.id}>
              {emp.full_name} — {emp.employer_name}
            </option>
          ))}
        </select>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          (In production, this would be behind employee login)
        </span>
      </div>

      {!selectedId && (
        <div style={{ ...cardStyle, padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
          Select an employee above to view their benefits dashboard
        </div>
      )}

      {selectedId && !data && <div style={{ padding: 40, color: 'var(--text-muted)' }}>Loading...</div>}

      {data && (
        <>
          {/* Employee header */}
          <div style={{ ...cardStyle, marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{
                width: 48, height: 48, borderRadius: 12, background: 'var(--accent)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: 18, fontWeight: 700,
              }}>
                {data.employee.first_name[0]}{data.employee.last_name[0]}
              </div>
              <div>
                <h3 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 700 }}>{data.employee.full_name}</h3>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  {data.employee.employer_name} &middot; Hired {data.employee.hire_date}
                  {data.employee.job_title && ` · ${data.employee.job_title}`}
                </div>
              </div>
            </div>
            <StatusBadge status={data.employee.status} />
          </div>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
            <StatCard label="Active Plans" value={data.summary.total_plans} color="#7c3aed" />
            <StatCard label="Your Monthly Deduction" value={fmt(data.summary.total_monthly_deduction)} color="#ef4444" />
            <StatCard label="Total Premium" value={fmt(data.summary.total_monthly_premium)} color="#3b82f6" />
            <StatCard label="Employer Pays" value={fmt(data.summary.employer_contribution)} color="#16a34a" sub="Your employer covers this" />
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 0, marginBottom: 24, borderBottom: '2px solid var(--border)' }}>
            {tabs.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                style={{
                  padding: '10px 20px', fontSize: 14, fontWeight: tab === t.key ? 700 : 500,
                  color: tab === t.key ? 'var(--accent)' : 'var(--text-secondary)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  borderBottom: tab === t.key ? '2px solid var(--accent)' : '2px solid transparent',
                  marginBottom: -2,
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Benefits tab */}
          {tab === 'benefits' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
              {data.enrollments.map(enrollment => {
                const ptc = planTypeColors[enrollment.plan_type] || planTypeColors.medical;
                return (
                  <div key={enrollment.id} style={{
                    ...cardStyle, borderLeft: `4px solid ${ptc.color}`,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 12 }}>
                      <div style={{ display: 'flex', gap: 10 }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: 8, background: ptc.bg,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        }}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={ptc.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d={ptc.icon} />
                          </svg>
                        </div>
                        <div>
                          <div style={{ fontSize: 15, fontWeight: 600 }}>{enrollment.plan_name}</div>
                          <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{enrollment.carrier_name}</div>
                        </div>
                      </div>
                      <StatusBadge status={enrollment.status} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 13 }}>
                      <div>
                        <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>EFFECTIVE DATE</div>
                        <div>{enrollment.effective_date}</div>
                      </div>
                      <div>
                        <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>YOUR DEDUCTION</div>
                        <div style={{ fontWeight: 600, color: ptc.color }}>{fmt(enrollment.employee_deduction)}/mo</div>
                      </div>
                      <div>
                        <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>TIER</div>
                        <div>{enrollment.tier_display}</div>
                      </div>
                      <div>
                        <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>MEMBERS</div>
                        <div>{enrollment.member_count} covered</div>
                      </div>
                    </div>
                    {enrollment.carrier_confirmation_number && (
                      <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-muted)', padding: '6px 10px', background: 'var(--bg)', borderRadius: 6 }}>
                        Confirmation: {enrollment.carrier_confirmation_number}
                      </div>
                    )}
                  </div>
                );
              })}
              {data.enrollments.length === 0 && (
                <div style={{ ...cardStyle, padding: 40, textAlign: 'center', color: 'var(--text-muted)', gridColumn: '1 / -1' }}>
                  No active enrollments
                </div>
              )}
            </div>
          )}

          {/* Claims tab */}
          {tab === 'claims' && (
            <div style={cardStyle}>
              <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700 }}>Claims History</h3>
              {data.claims && data.claims.length > 0 ? (
                <table style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th style={thStyle}>CLAIM #</th>
                      <th style={thStyle}>DATE</th>
                      <th style={thStyle}>PROVIDER</th>
                      <th style={thStyle}>TYPE</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>BILLED</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>YOU OWE</th>
                      <th style={thStyle}>STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.claims.map(claim => (
                      <tr key={claim.id}>
                        <td style={{ ...tdStyle, fontWeight: 600 }}>{claim.claim_number}</td>
                        <td style={tdStyle}>{claim.service_date}</td>
                        <td style={tdStyle}>{claim.provider_name}</td>
                        <td style={tdStyle}>
                          <span style={{
                            padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                            background: (planTypeColors[claim.claim_type] || {}).bg || '#f0f2f5',
                            color: (planTypeColors[claim.claim_type] || {}).color || '#666',
                            textTransform: 'capitalize',
                          }}>
                            {claim.claim_type}
                          </span>
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>{fmt(claim.billed_amount)}</td>
                        <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600, color: Number(claim.member_owes) > 0 ? '#ef4444' : 'var(--text)' }}>
                          {claim.member_owes ? fmt(claim.member_owes) : '—'}
                        </td>
                        <td style={tdStyle}><StatusBadge status={claim.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>No claims found</div>
              )}
            </div>
          )}

          {/* Deductions tab */}
          {tab === 'deductions' && (
            <div style={cardStyle}>
              <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700 }}>Payroll Deductions</h3>
              {data.deductions.length > 0 ? (
                <table style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th style={thStyle}>PLAN</th>
                      <th style={thStyle}>PERIOD</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>AMOUNT</th>
                      <th style={thStyle}>STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.deductions.map(d => (
                      <tr key={d.id}>
                        <td style={{ ...tdStyle, fontWeight: 600 }}>{d.plan_name}</td>
                        <td style={tdStyle}>{d.period_start} — {d.period_end}</td>
                        <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700 }}>{fmt(d.amount)}</td>
                        <td style={tdStyle}><StatusBadge status={d.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>No deductions found</div>
              )}
            </div>
          )}

          {/* ID Cards tab */}
          {tab === 'idcard' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))', gap: 20 }}>
              {data.enrollments.filter(e => ['active', 'carrier_confirmed'].includes(e.status)).map(enrollment => {
                const ptc = planTypeColors[enrollment.plan_type] || planTypeColors.medical;
                return (
                  <div key={enrollment.id} style={{
                    background: `linear-gradient(135deg, ${ptc.color} 0%, ${ptc.color}dd 100%)`,
                    borderRadius: 16, padding: '24px 28px', color: '#fff',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
                    position: 'relative', overflow: 'hidden',
                  }}>
                    <div style={{
                      position: 'absolute', top: -20, right: -20,
                      width: 120, height: 120, borderRadius: '50%',
                      background: 'rgba(255,255,255,0.08)',
                    }} />
                    <div style={{
                      position: 'absolute', bottom: -30, left: -10,
                      width: 80, height: 80, borderRadius: '50%',
                      background: 'rgba(255,255,255,0.06)',
                    }} />

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 600, opacity: 0.7, letterSpacing: '1px', textTransform: 'uppercase' }}>
                          {enrollment.plan_type} Insurance
                        </div>
                        <div style={{ fontSize: 18, fontWeight: 700, marginTop: 2 }}>{enrollment.carrier_name}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <svg width="32" height="32" viewBox="0 0 40 40" fill="none">
                          <rect width="40" height="40" rx="10" fill="rgba(255,255,255,0.2)" />
                          <path d="M12 28L20 12L28 28H12Z" fill="white" opacity="0.6" />
                          <path d="M16 28L20 20L24 28H16Z" fill="white" />
                        </svg>
                      </div>
                    </div>

                    <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{data.employee.full_name}</div>
                    <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 16 }}>
                      {enrollment.plan_name} · {enrollment.tier_display}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, fontSize: 12 }}>
                      <div>
                        <div style={{ opacity: 0.6, fontSize: 10, fontWeight: 600, letterSpacing: '0.5px' }}>MEMBER ID</div>
                        <div style={{ fontWeight: 700, marginTop: 2 }}>
                          {enrollment.carrier_confirmation_number || `MBR-${String(data.employee.id).padStart(6, '0')}`}
                        </div>
                      </div>
                      <div>
                        <div style={{ opacity: 0.6, fontSize: 10, fontWeight: 600, letterSpacing: '0.5px' }}>GROUP #</div>
                        <div style={{ fontWeight: 700, marginTop: 2 }}>GRP-{String(enrollment.plan).padStart(4, '0')}</div>
                      </div>
                      <div>
                        <div style={{ opacity: 0.6, fontSize: 10, fontWeight: 600, letterSpacing: '0.5px' }}>EFFECTIVE</div>
                        <div style={{ fontWeight: 700, marginTop: 2 }}>{enrollment.effective_date}</div>
                      </div>
                    </div>

                    {enrollment.members && enrollment.members.length > 0 && (
                      <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.2)', fontSize: 12 }}>
                        <div style={{ opacity: 0.6, fontSize: 10, fontWeight: 600, letterSpacing: '0.5px', marginBottom: 4 }}>COVERED MEMBERS</div>
                        {enrollment.members.map(m => (
                          <span key={m.id} style={{ marginRight: 12 }}>
                            {m.person_name} ({m.relationship})
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
              {data.enrollments.filter(e => ['active', 'carrier_confirmed'].includes(e.status)).length === 0 && (
                <div style={{ ...cardStyle, padding: 40, textAlign: 'center', color: 'var(--text-muted)', gridColumn: '1 / -1' }}>
                  No active coverage to display ID cards for
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function StatCard({ label, value, color, sub }) {
  return (
    <div style={cardStyle}>
      <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{sub}</div>}
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

const thStyle = {
  padding: '8px 16px', fontSize: 11, fontWeight: 700,
  color: 'var(--text-secondary)', textAlign: 'left',
  borderBottom: '1px solid var(--border)',
};

const tdStyle = { padding: '12px 16px', fontSize: 14 };
