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

const allTiers = ['employee_only', 'employee_spouse', 'employee_children', 'family'];

const emptyTier = { monthly_premium: '', employer_contribution: '', employee_deduction: '' };

const emptyForm = {
  employer: '', carrier: '', name: '', plan_type: 'medical',
  effective_date: '', active: true,
  tiers: { employee_only: { ...emptyTier, enabled: true } },
};

export default function Plans() {
  const [products, setProducts] = useState([]);
  const [employers, setEmployers] = useState([]);
  const [carriers, setCarriers] = useState([]);
  const [typeFilter, setTypeFilter] = useState('');
  const [employerFilter, setEmployerFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [addTierModal, setAddTierModal] = useState(null);
  const [addTierForm, setAddTierForm] = useState({ tier: '', monthly_premium: '', employer_contribution: '', employee_deduction: '' });

  useEffect(() => {
    api.get('/employers/').then(r => setEmployers(r.data));
    api.get('/carriers/').then(r => setCarriers(r.data));
  }, []);

  const loadProducts = () => {
    const params = new URLSearchParams();
    if (employerFilter) params.set('employer', employerFilter);
    api.get(`/products/?${params}`).then(r => setProducts(r.data));
  };

  useEffect(() => { loadProducts(); }, [employerFilter]);

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const toggleTier = (tier) => {
    setForm(f => {
      const tiers = { ...f.tiers };
      if (tiers[tier]?.enabled) {
        delete tiers[tier];
      } else {
        tiers[tier] = { ...emptyTier, enabled: true };
      }
      return { ...f, tiers };
    });
  };

  const setTierField = (tier, field, value) => {
    setForm(f => {
      const t = { ...f.tiers[tier], [field]: value };
      if (field === 'monthly_premium' || field === 'employer_contribution') {
        const premium = parseFloat(field === 'monthly_premium' ? value : t.monthly_premium) || 0;
        const contrib = parseFloat(field === 'employer_contribution' ? value : t.employer_contribution) || 0;
        t.employee_deduction = Math.max(0, premium - contrib).toFixed(2);
      }
      return { ...f, tiers: { ...f.tiers, [tier]: t } };
    });
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const enabledTiers = Object.entries(form.tiers)
        .filter(([, v]) => v.enabled)
        .map(([tier, v]) => ({
          tier,
          monthly_premium: v.monthly_premium,
          employer_contribution: v.employer_contribution,
          employee_deduction: v.employee_deduction,
        }));
      if (enabledTiers.length === 0) {
        setError('At least one tier is required.');
        setSaving(false);
        return;
      }
      await api.post('/products/', {
        employer: form.employer,
        carrier: form.carrier,
        name: form.name,
        plan_type: form.plan_type,
        effective_date: form.effective_date,
        active: form.active,
        tiers: enabledTiers,
      });
      setShowModal(false);
      setForm(emptyForm);
      loadProducts();
    } catch (err) {
      const data = err.response?.data;
      if (data) {
        const msgs = Object.entries(data).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`);
        setError(msgs.join(' | '));
      } else {
        setError('Failed to create product.');
      }
    } finally {
      setSaving(false);
    }
  };

  const submitAddTier = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/products/${addTierModal.id}/add_tier/`, addTierForm);
      setAddTierModal(null);
      setAddTierForm({ tier: '', monthly_premium: '', employer_contribution: '', employee_deduction: '' });
      loadProducts();
    } catch (err) {
      const data = err.response?.data;
      alert(data?.error || 'Failed to add tier');
    }
  };

  const filtered = typeFilter ? products.filter(p => p.plan_type === typeFilter) : products;

  const typeCounts = {};
  filtered.forEach(p => { typeCounts[p.plan_type] = (typeCounts[p.plan_type] || 0) + 1; });
  const totalTiers = filtered.reduce((sum, p) => sum + (p.tiers?.length || 0), 0);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 600, marginBottom: 4 }}>Benefits</div>
          <h2 style={{ margin: '0 0 6px', fontSize: 24, fontWeight: 700 }}>Plan Management</h2>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--text-secondary)', maxWidth: 600 }}>
            View and manage benefit products, tiers, and premium rates across all employers.
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14m-7-7h14"/></svg>
          Add Product
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Products', value: filtered.length, color: '#3b82f6' },
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

      {/* Product cards */}
      <div style={{ display: 'grid', gap: 16 }}>
        {filtered.map((product) => {
          const tc = typeColors[product.plan_type] || typeColors.medical;
          const existingTiers = (product.tiers || []).map(t => t.tier);
          const canAddTier = allTiers.some(t => !existingTiers.includes(t));
          return (
            <div key={product.id} style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
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
                  <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 2 }}>{product.name}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                    {product.employer_name} &middot; {product.carrier_name}
                  </div>
                </div>
                <span style={{
                  padding: '4px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                  background: tc.bg, color: tc.color, textTransform: 'capitalize',
                }}>
                  {product.plan_type}
                </span>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{product.total_enrolled} enrolled</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{(product.tiers || []).length} tier{(product.tiers || []).length !== 1 ? 's' : ''}</div>
                </div>
                {canAddTier && (
                  <button
                    onClick={() => {
                      const available = allTiers.filter(t => !existingTiers.includes(t));
                      setAddTierForm({ tier: available[0], monthly_premium: '', employer_contribution: '', employee_deduction: '' });
                      setAddTierModal(product);
                    }}
                    style={{
                      background: 'none', border: '1px dashed var(--border)', borderRadius: 8,
                      padding: '6px 12px', fontSize: 12, fontWeight: 600, color: 'var(--accent)',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14m-7-7h14"/></svg>
                    Tier
                  </button>
                )}
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
                  {(product.tiers || []).map(t => (
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
      {filtered.length === 0 && (
        <div style={{ ...cardStyle, padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
          No products found matching filters.
        </div>
      )}

      {/* Add Product Modal */}
      {showModal && (
        <div style={overlay} onClick={() => setShowModal(false)}>
          <div style={modal} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Add Product</h3>
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
                  <select required value={form.employer} onChange={e => setField('employer', e.target.value)} style={inputStyle}>
                    <option value="">Select employer</option>
                    {employers.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                  </select>
                </label>
                <label style={labelStyle}>
                  Carrier *
                  <select required value={form.carrier} onChange={e => setField('carrier', e.target.value)} style={inputStyle}>
                    <option value="">Select carrier</option>
                    {carriers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.carrier_type})</option>)}
                  </select>
                </label>
              </div>

              <div style={fieldGrid}>
                <label style={labelStyle}>
                  Product Name *
                  <input type="text" required value={form.name} onChange={e => setField('name', e.target.value)} style={inputStyle} placeholder="e.g. Blue Cross PPO" />
                </label>
                <label style={labelStyle}>
                  Effective Date *
                  <input type="date" required value={form.effective_date} onChange={e => setField('effective_date', e.target.value)} style={inputStyle} />
                </label>
              </div>

              <label style={{ ...labelStyle, marginBottom: 20 }}>
                Plan Type *
                <select required value={form.plan_type} onChange={e => setField('plan_type', e.target.value)} style={inputStyle}>
                  <option value="medical">Medical</option>
                  <option value="dental">Dental</option>
                  <option value="vision">Vision</option>
                  <option value="life">Life</option>
                </select>
              </label>

              {/* Tier rates */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: 'var(--text)' }}>Rate Tiers</div>
                {allTiers.map(tier => {
                  const enabled = form.tiers[tier]?.enabled;
                  const tierData = form.tiers[tier] || emptyTier;
                  return (
                    <div key={tier} style={{
                      border: '1px solid var(--border)', borderRadius: 10, marginBottom: 10,
                      overflow: 'hidden', background: enabled ? 'var(--card)' : 'var(--bg)',
                    }}>
                      <label style={{
                        display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px',
                        cursor: 'pointer', userSelect: 'none', fontSize: 14, fontWeight: 600,
                        color: enabled ? 'var(--text)' : 'var(--text-muted)',
                      }}>
                        <input type="checkbox" checked={!!enabled} onChange={() => toggleTier(tier)}
                          style={{ accentColor: 'var(--accent)', cursor: 'pointer', width: 16, height: 16 }} />
                        {tierLabels[tier]}
                      </label>
                      {enabled && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, padding: '0 16px 14px' }}>
                          <label style={labelStyle}>
                            Premium *
                            <input type="number" step="0.01" min="0" required value={tierData.monthly_premium}
                              onChange={e => setTierField(tier, 'monthly_premium', e.target.value)}
                              style={inputStyle} placeholder="0.00" />
                          </label>
                          <label style={labelStyle}>
                            ER Contribution *
                            <input type="number" step="0.01" min="0" required value={tierData.employer_contribution}
                              onChange={e => setTierField(tier, 'employer_contribution', e.target.value)}
                              style={inputStyle} placeholder="0.00" />
                          </label>
                          <label style={labelStyle}>
                            EE Deduction
                            <input type="number" step="0.01" min="0" value={tierData.employee_deduction} readOnly
                              style={{ ...inputStyle, background: 'var(--bg)', cursor: 'not-allowed' }} placeholder="Auto" />
                          </label>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" className="btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Creating...' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Tier Modal */}
      {addTierModal && (
        <div style={overlay} onClick={() => setAddTierModal(null)}>
          <div style={{ ...modal, maxWidth: 440 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Add Tier to {addTierModal.name}</h3>
              <button onClick={() => setAddTierModal(null)} style={{ background: 'none', padding: 4, color: 'var(--text-muted)' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
            <form onSubmit={submitAddTier}>
              <label style={{ ...labelStyle, marginBottom: 16 }}>
                Tier *
                <select required value={addTierForm.tier} onChange={e => setAddTierForm(f => ({ ...f, tier: e.target.value }))} style={inputStyle}>
                  {allTiers.filter(t => !(addTierModal.tiers || []).some(et => et.tier === t)).map(t => (
                    <option key={t} value={t}>{tierLabels[t]}</option>
                  ))}
                </select>
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
                <label style={labelStyle}>
                  Premium *
                  <input type="number" step="0.01" min="0" required value={addTierForm.monthly_premium}
                    onChange={e => {
                      const v = e.target.value;
                      setAddTierForm(f => {
                        const premium = parseFloat(v) || 0;
                        const contrib = parseFloat(f.employer_contribution) || 0;
                        return { ...f, monthly_premium: v, employee_deduction: Math.max(0, premium - contrib).toFixed(2) };
                      });
                    }}
                    style={inputStyle} placeholder="0.00" />
                </label>
                <label style={labelStyle}>
                  ER Contribution *
                  <input type="number" step="0.01" min="0" required value={addTierForm.employer_contribution}
                    onChange={e => {
                      const v = e.target.value;
                      setAddTierForm(f => {
                        const premium = parseFloat(f.monthly_premium) || 0;
                        const contrib = parseFloat(v) || 0;
                        return { ...f, employer_contribution: v, employee_deduction: Math.max(0, premium - contrib).toFixed(2) };
                      });
                    }}
                    style={inputStyle} placeholder="0.00" />
                </label>
                <label style={labelStyle}>
                  EE Deduction
                  <input type="number" step="0.01" min="0" value={addTierForm.employee_deduction} readOnly
                    style={{ ...inputStyle, background: 'var(--bg)', cursor: 'not-allowed' }} placeholder="Auto" />
                </label>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" className="btn-outline" onClick={() => setAddTierModal(null)}>Cancel</button>
                <button type="submit" className="btn-primary">Add Tier</button>
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
