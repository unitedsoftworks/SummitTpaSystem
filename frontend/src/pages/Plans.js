import React, { useEffect, useState } from 'react';
import api from '../api/client';

const typeColors = {
  medical: { bg: '#dbeafe', color: '#1d4ed8', icon: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z' },
  dental: { bg: '#d1fae5', color: '#059669', icon: 'M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
  vision: { bg: '#ede9fe', color: '#7c3aed', icon: 'M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z' },
  life: { bg: '#fef9c3', color: '#a16207', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
};

const tierLabels = {
  employee_only: 'EE Only',
  employee_spouse: 'EE + Spouse',
  employee_children: 'EE + Children',
  family: 'Family',
};

const emptyForm = {
  employer: '', carrier: '', name: '', plan_type: 'medical', tier: 'employee_only',
  monthly_premium: '', employer_contribution: '', employee_deduction: '',
  effective_date: '', active: true,
};

export default function Plans() {
  const [plans, setPlans] = useState([]);
  const [employers, setEmployers] = useState([]);
  const [carriers, setCarriers] = useState([]);
  const [typeFilter, setTypeFilter] = useState('');
  const [employerFilter, setEmployerFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/employers/').then(r => setEmployers(r.data));
    api.get('/carriers/').then(r => setCarriers(r.data));
  }, []);

  const loadPlans = () => {
    const params = new URLSearchParams();
    if (employerFilter) params.set('employer', employerFilter);
    api.get(`/plans/?${params}`).then(r => setPlans(r.data));
  };

  useEffect(() => { loadPlans(); }, [employerFilter]);

  const set = (k, v) => {
    setForm(f => {
      const next = { ...f, [k]: v };
      if (k === 'monthly_premium' || k === 'employer_contribution') {
        const premium = parseFloat(k === 'monthly_premium' ? v : next.monthly_premium) || 0;
        const contrib = parseFloat(k === 'employer_contribution' ? v : next.employer_contribution) || 0;
        next.employee_deduction = Math.max(0, premium - contrib).toFixed(2);
      }
      return next;
    });
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.post('/plans/', form);
      setShowModal(false);
      setForm(emptyForm);
      loadPlans();
    } catch (err) {
      const data = err.response?.data;
      if (data) {
        const msgs = Object.entries(data).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`);
        setError(msgs.join(' | '));
      } else {
        setError('Failed to create plan.');
      }
    } finally {
      setSaving(false);
    }
  };

  const filtered = typeFilter ? plans.filter(p => p.plan_type === typeFilter) : plans;

  const grouped = {};
  filtered.forEach(p => {
    const key = `${p.employer_name}|||${p.name}|||${p.plan_type}|||${p.carrier_name}`;
    if (!grouped[key]) grouped[key] = { employer: p.employer_name, name: p.name, type: p.plan_type, carrier: p.carrier_name, tiers: [], totalEnrolled: 0 };
    grouped[key].tiers.push(p);
    grouped[key].totalEnrolled += p.enrollment_count || 0;
  });
  const planGroups = Object.values(grouped);

  const typeCounts = {};
  filtered.forEach(p => { typeCounts[p.plan_type] = (typeCounts[p.plan_type] || 0) + 1; });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 600, marginBottom: 4 }}>Benefits</div>
          <h2 style={{ margin: '0 0 6px', fontSize: 24, fontWeight: 700 }}>Plan Management</h2>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--text-secondary)', maxWidth: 600 }}>
            View and manage benefit plan offerings, tiers, and premium rates across all employers.
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14m-7-7h14"/></svg>
          Add Plan
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Total Plans', value: filtered.length, color: '#3b82f6' },
          { label: 'Medical', value: typeCounts.medical || 0, color: '#1d4ed8' },
          { label: 'Dental', value: typeCounts.dental || 0, color: '#059669' },
          { label: 'Vision', value: typeCounts.vision || 0, color: '#7c3aed' },
          { label: 'Life', value: typeCounts.life || 0, color: '#a16207' },
        ].map((s, i) => (
          <div key={i} style={cardStyle}>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 500, marginBottom: 2 }}>{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={selectStyle}>
          <option value="">All types</option>
          <option value="medical">Medical</option>
          <option value="dental">Dental</option>
          <option value="vision">Vision</option>
          <option value="life">Life</option>
        </select>
        <select value={employerFilter} onChange={e => setEmployerFilter(e.target.value)} style={selectStyle}>
          <option value="">All employers</option>
          {employers.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
      </div>

      {/* Plan groups */}
      <div style={{ display: 'grid', gap: 16 }}>
        {planGroups.map((pg, i) => {
          const tc = typeColors[pg.type] || typeColors.medical;
          return (
            <div key={i} style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '18px 24px', display: 'flex', alignItems: 'center', gap: 16, borderBottom: '1px solid var(--border)' }}>
                <div style={{
                  width: 42, height: 42, borderRadius: 10,
                  background: tc.bg, display: 'flex',
                  alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={tc.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d={tc.icon} />
                  </svg>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 2 }}>{pg.name}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                    {pg.employer} &middot; {pg.carrier}
                  </div>
                </div>
                <span style={{
                  padding: '4px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                  background: tc.bg, color: tc.color, textTransform: 'capitalize',
                }}>
                  {pg.type}
                </span>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{pg.totalEnrolled} enrolled</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{pg.tiers.length} tier{pg.tiers.length !== 1 ? 's' : ''}</div>
                </div>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={thStyle}>Tier</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Monthly Premium</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Employer Pays</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Employee Pays</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Enrolled</th>
                  </tr>
                </thead>
                <tbody>
                  {pg.tiers.map(t => (
                    <tr key={t.id} style={{ borderBottom: '1px solid var(--table-row-border)' }}>
                      <td style={tdStyle}>
                        <span style={{ fontWeight: 600 }}>{tierLabels[t.tier] || t.tier}</span>
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>
                        ${parseFloat(t.monthly_premium).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right', color: '#059669' }}>
                        ${parseFloat(t.employer_contribution).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right', color: '#3b82f6' }}>
                        ${parseFloat(t.employee_deduction).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>
                        <span style={{
                          padding: '2px 10px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                          background: t.enrollment_count > 0 ? '#d1fae5' : '#f3f4f6',
                          color: t.enrollment_count > 0 ? '#059669' : '#6b7280',
                        }}>
                          {t.enrollment_count}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>
      {planGroups.length === 0 && (
        <div style={{ ...cardStyle, padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
          No plans found matching filters.
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div style={overlay} onClick={() => setShowModal(false)}>
          <div style={modal} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Add Plan</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', padding: 4, color: 'var(--text-muted)' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>

            {error && (
              <div style={{ padding: '10px 14px', borderRadius: 8, background: '#fee2e2', color: '#dc2626', fontSize: 13, fontWeight: 500, marginBottom: 16 }}>
                {error}
              </div>
            )}

            <form onSubmit={submit}>
              <div style={fieldGrid}>
                <label style={labelStyle}>
                  Employer *
                  <select required value={form.employer} onChange={e => set('employer', e.target.value)} style={inputStyle}>
                    <option value="">Select employer</option>
                    {employers.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                  </select>
                </label>
                <label style={labelStyle}>
                  Carrier *
                  <select required value={form.carrier} onChange={e => set('carrier', e.target.value)} style={inputStyle}>
                    <option value="">Select carrier</option>
                    {carriers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.carrier_type})</option>)}
                  </select>
                </label>
              </div>

              <div style={fieldGrid}>
                <label style={labelStyle}>
                  Plan Name *
                  <input type="text" required value={form.name} onChange={e => set('name', e.target.value)} style={inputStyle} placeholder="e.g. Blue Cross PPO" />
                </label>
                <label style={labelStyle}>
                  Effective Date *
                  <input type="date" required value={form.effective_date} onChange={e => set('effective_date', e.target.value)} style={inputStyle} />
                </label>
              </div>

              <div style={fieldGrid}>
                <label style={labelStyle}>
                  Plan Type *
                  <select required value={form.plan_type} onChange={e => set('plan_type', e.target.value)} style={inputStyle}>
                    <option value="medical">Medical</option>
                    <option value="dental">Dental</option>
                    <option value="vision">Vision</option>
                    <option value="life">Life</option>
                  </select>
                </label>
                <label style={labelStyle}>
                  Tier *
                  <select required value={form.tier} onChange={e => set('tier', e.target.value)} style={inputStyle}>
                    <option value="employee_only">Employee Only</option>
                    <option value="employee_spouse">Employee + Spouse</option>
                    <option value="employee_children">Employee + Children</option>
                    <option value="family">Family</option>
                  </select>
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 20 }}>
                <label style={labelStyle}>
                  Monthly Premium *
                  <input type="number" step="0.01" min="0" required value={form.monthly_premium} onChange={e => set('monthly_premium', e.target.value)} style={inputStyle} placeholder="0.00" />
                </label>
                <label style={labelStyle}>
                  Employer Contribution *
                  <input type="number" step="0.01" min="0" required value={form.employer_contribution} onChange={e => set('employer_contribution', e.target.value)} style={inputStyle} placeholder="0.00" />
                </label>
                <label style={labelStyle}>
                  Employee Deduction
                  <input type="number" step="0.01" min="0" value={form.employee_deduction} readOnly style={{ ...inputStyle, background: 'var(--bg)', cursor: 'not-allowed' }} placeholder="Auto-calculated" />
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" className="btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Creating...' : 'Create Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const overlay = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex',
  alignItems: 'center', justifyContent: 'center', zIndex: 1000,
};
const modal = {
  background: 'var(--card)', borderRadius: 'var(--radius-lg)', padding: '28px 32px',
  width: '100%', maxWidth: 600, boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
  border: '1px solid var(--border)', maxHeight: '90vh', overflowY: 'auto',
};
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
  background: 'var(--table-header-bg)',
};
const tdStyle = { padding: '12px 16px', fontSize: 14 };
const fieldGrid = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 };
const labelStyle = { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' };
const inputStyle = {
  padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)',
  fontSize: 14, background: 'var(--input-bg)', color: 'var(--text)', outline: 'none',
  fontFamily: 'inherit',
};
