import React, { useEffect, useState } from 'react';
import api from '../api/client';
import { useConfirm } from '../components/ConfirmDialog';

const typeColors = {
  medical: { bg: '#dbeafe', color: '#1d4ed8', icon: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z' },
  dental: { bg: '#d1fae5', color: '#059669', icon: 'M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
  vision: { bg: '#ede9fe', color: '#7c3aed', icon: 'M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z' },
  life: { bg: '#fef9c3', color: '#a16207', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
};

const tierLabels = {
  employee_only: 'Employee Only',
  employee_spouse: 'Employee + Spouse',
  employee_children: 'Employee + Children',
  family: 'Family',
};

const tierShort = {
  employee_only: 'EE Only',
  employee_spouse: 'EE + Spouse',
  employee_children: 'EE + Child',
  family: 'Family',
};

const allTiers = ['employee_only', 'employee_spouse', 'employee_children', 'family'];

const defaultLabel = (vendorType) => {
  switch (vendorType) {
    case 'carrier': return 'Carrier Premium';
    case 'tpa': return 'TPA Admin Fee';
    case 'broker': return 'Broker Fee';
    default: return 'Service Fee';
  }
};

const blankTierRow = () => ({
  enabled: false,
  employer_contribution: '',
  employee_deduction: '',
  allocations: [],
});

function buildTierRows(existingTiers) {
  const rows = {};
  allTiers.forEach(t => { rows[t] = blankTierRow(); });
  if (existingTiers) {
    existingTiers.forEach(t => {
      rows[t.tier] = {
        id: t.id,
        enabled: true,
        employer_contribution: t.employer_contribution,
        employee_deduction: t.employee_deduction,
        enrollment_count: t.enrollment_count || 0,
        allocations: (t.allocations || []).map(a => ({
          vendor: a.vendor,
          label: a.label,
          amount: a.amount,
        })),
      };
    });
  }
  return rows;
}

function tierPremium(row) {
  return row.allocations.reduce((s, a) => s + (parseFloat(a.amount) || 0), 0);
}

export default function Plans() {
  const [products, setProducts] = useState([]);
  const [employers, setEmployers] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [typeFilter, setTypeFilter] = useState('');
  const [employerFilter, setEmployerFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [form, setForm] = useState({ employer: '', name: '', plan_type: 'medical', effective_date: '', active: true });
  const [tierRows, setTierRows] = useState(() => buildTierRows());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [expandedTiers, setExpandedTiers] = useState({});
  const confirm = useConfirm();

  useEffect(() => {
    api.get('/employers/').then(r => setEmployers(r.data));
    api.get('/vendors/').then(r => setVendors(r.data));
  }, []);

  const loadProducts = () => {
    const params = new URLSearchParams();
    if (employerFilter) params.set('employer', employerFilter);
    api.get(`/products/?${params}`).then(r => setProducts(r.data));
  };

  useEffect(() => { loadProducts(); }, [employerFilter]);

  const openCreate = () => {
    setEditProduct(null);
    setForm({ employer: '', name: '', plan_type: 'medical', effective_date: '', active: true });
    setTierRows(buildTierRows());
    setExpandedTiers({});
    setError('');
    setShowModal(true);
  };

  const openEdit = (product) => {
    setEditProduct(product);
    setForm({
      employer: product.employer,
      name: product.name,
      plan_type: product.plan_type,
      effective_date: product.effective_date,
      active: product.active,
    });
    setTierRows(buildTierRows(product.tiers));
    const expanded = {};
    (product.tiers || []).forEach(t => { expanded[t.tier] = true; });
    setExpandedTiers(expanded);
    setError('');
    setShowModal(true);
  };

  const closeModal = () => { setShowModal(false); setEditProduct(null); setError(''); };

  const pushRates = async (product) => {
    const enrolled = product.total_enrolled || 0;
    const ok = await confirm({
      title: 'Push Rates to Enrollments',
      message: `This will update all ${enrolled} active enrollment${enrolled !== 1 ? 's' : ''} on "${product.name}" to match the current plan rates. Enrollment-level rate overrides will be replaced.`,
      confirmLabel: `Update ${enrolled} Enrollment${enrolled !== 1 ? 's' : ''}`,
      variant: 'warning',
    });
    if (!ok) return;
    await api.post(`/products/${product.id}/push_rates/`);
    loadProducts();
  };

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const toggleTier = (tier) => {
    setTierRows(prev => {
      const row = prev[tier];
      const nowEnabled = !row.enabled;
      return {
        ...prev,
        [tier]: {
          ...row,
          enabled: nowEnabled,
          allocations: nowEnabled ? [] : [],
          employer_contribution: nowEnabled ? row.employer_contribution : '',
          employee_deduction: nowEnabled ? row.employee_deduction : '',
        },
      };
    });
    if (!tierRows[tier].enabled) {
      setExpandedTiers(prev => ({ ...prev, [tier]: true }));
    }
  };

  const toggleExpand = (tier) => {
    setExpandedTiers(prev => ({ ...prev, [tier]: !prev[tier] }));
  };

  const addAllocation = (tier) => {
    setTierRows(prev => ({
      ...prev,
      [tier]: {
        ...prev[tier],
        allocations: [...prev[tier].allocations, { vendor: '', label: '', amount: '' }],
      },
    }));
  };

  const removeAllocation = (tier, idx) => {
    setTierRows(prev => ({
      ...prev,
      [tier]: {
        ...prev[tier],
        allocations: prev[tier].allocations.filter((_, i) => i !== idx),
      },
    }));
  };

  const setAllocationField = (tier, idx, field, value) => {
    setTierRows(prev => {
      const allocs = [...prev[tier].allocations];
      allocs[idx] = { ...allocs[idx], [field]: value };
      if (field === 'vendor' && value) {
        const v = vendors.find(vn => String(vn.id) === String(value));
        if (v && !allocs[idx].label) {
          allocs[idx].label = defaultLabel(v.vendor_type);
        }
      }
      const updated = { ...prev[tier], allocations: allocs };
      const premium = tierPremium(updated);
      const er = parseFloat(updated.employer_contribution) || 0;
      updated.employee_deduction = Math.max(0, premium - er).toFixed(2);
      return { ...prev, [tier]: updated };
    });
  };

  const setTierField = (tier, field, value) => {
    setTierRows(prev => {
      const row = { ...prev[tier], [field]: value };
      const premium = tierPremium(row);
      if (field === 'employer_contribution') {
        const er = parseFloat(value) || 0;
        row.employee_deduction = Math.max(0, premium - er).toFixed(2);
      }
      return { ...prev, [tier]: row };
    });
  };

  const copyAllocationsDown = (sourceTier) => {
    setTierRows(prev => {
      const sourceAllocs = prev[sourceTier].allocations;
      if (sourceAllocs.length === 0) return prev;
      const updated = { ...prev };
      const sourceTierIdx = allTiers.indexOf(sourceTier);
      for (let i = sourceTierIdx + 1; i < allTiers.length; i++) {
        const t = allTiers[i];
        if (updated[t].enabled && updated[t].allocations.length === 0) {
          updated[t] = { ...updated[t], allocations: sourceAllocs.map(a => ({ ...a })) };
        }
      }
      return updated;
    });
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const enabledTiers = allTiers
        .filter(t => tierRows[t].enabled)
        .map(t => {
          const row = tierRows[t];
          const premium = tierPremium(row);
          return {
            tier: t,
            monthly_premium: premium.toFixed(2),
            employer_contribution: row.employer_contribution || '0',
            employee_deduction: row.employee_deduction || '0',
            allocations: row.allocations
              .filter(a => a.vendor && a.amount)
              .map(a => ({
                vendor: parseInt(a.vendor),
                label: a.label || 'Fee',
                amount: parseFloat(a.amount).toFixed(2),
              })),
          };
        });
      if (enabledTiers.length === 0) {
        setError('At least one tier is required.');
        setSaving(false);
        return;
      }
      const payload = { ...form, tiers: enabledTiers };
      if (editProduct) {
        await api.put(`/products/${editProduct.id}/`, payload);
      } else {
        await api.post('/products/', payload);
      }
      closeModal();
      loadProducts();
    } catch (err) {
      const data = err.response?.data;
      if (data) {
        const msgs = typeof data === 'string' ? [data] :
          Object.entries(data).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`);
        setError(msgs.join(' | '));
      } else {
        setError('Failed to save product.');
      }
    } finally {
      setSaving(false);
    }
  };

  const filtered = typeFilter ? products.filter(p => p.plan_type === typeFilter) : products;

  const typeCounts = {};
  filtered.forEach(p => { typeCounts[p.plan_type] = (typeCounts[p.plan_type] || 0) + 1; });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 600, marginBottom: 4 }}>Benefits</div>
          <h2 style={{ margin: '0 0 6px', fontSize: 24, fontWeight: 700 }}>Plan Management</h2>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--text-secondary)', maxWidth: 600 }}>
            View and manage benefit products, tiers, and premium allocations across all employers.
          </p>
        </div>
        <button className="btn-primary" onClick={openCreate} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
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
                    {product.employer_name}{product.carrier_name ? ` · ${product.carrier_name}` : ''}
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
                <div style={{ display: 'flex', gap: 8 }}>
                  {product.total_enrolled > 0 && (
                    <button
                      onClick={() => pushRates(product)}
                      style={{
                        background: 'none', border: '1px solid var(--border)', borderRadius: 8,
                        padding: '6px 14px', fontSize: 12, fontWeight: 600, color: 'var(--accent)',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
                      }}
                      title="Push current rates to all active enrollments"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 5v14m0-14l-4 4m4-4l4 4" />
                      </svg>
                      Push Rates
                    </button>
                  )}
                  <button
                    onClick={() => openEdit(product)}
                    style={{
                      background: 'none', border: '1px solid var(--border)', borderRadius: 8,
                      padding: '6px 14px', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                    Edit
                  </button>
                </div>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={thStyle}>Tier</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Monthly Premium</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Employer Pays</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Employee Pays</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Vendors</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Enrolled</th>
                  </tr>
                </thead>
                <tbody>
                  {(product.tiers || []).map(t => (
                    <tr key={t.id} style={{ borderBottom: '1px solid var(--table-row-border)' }}>
                      <td style={tdStyle}>
                        <span style={{ fontWeight: 600 }}>{tierShort[t.tier] || t.tier}</span>
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
                      <td style={{ ...tdStyle, textAlign: 'right', fontSize: 12, color: 'var(--text-secondary)' }}>
                        {(t.allocations || []).length}
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

      {/* Create / Edit Product Modal */}
      {showModal && (
        <div style={overlay} onClick={closeModal}>
          <div style={modal} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>
                {editProduct ? 'Edit Product' : 'Add Product'}
              </h3>
              <button onClick={closeModal} style={{ background: 'none', padding: 4, color: 'var(--text-muted)', border: 'none', cursor: 'pointer' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>

            {error && (
              <div style={{ padding: '10px 14px', borderRadius: 8, background: '#fee2e2', color: '#dc2626', fontSize: 13, fontWeight: 500, marginBottom: 16 }}>
                {error}
              </div>
            )}

            <form onSubmit={submit}>
              {/* Product info row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 16 }}>
                <label style={labelStyle}>
                  Employer *
                  <select required value={form.employer} onChange={e => setField('employer', e.target.value)} style={inputStyle}>
                    <option value="">Select</option>
                    {employers.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                  </select>
                </label>
                <label style={labelStyle}>
                  Plan Type *
                  <select required value={form.plan_type} onChange={e => setField('plan_type', e.target.value)} style={inputStyle}>
                    <option value="medical">Medical</option>
                    <option value="dental">Dental</option>
                    <option value="vision">Vision</option>
                    <option value="life">Life</option>
                  </select>
                </label>
                <label style={labelStyle}>
                  Effective Date *
                  <input type="date" required value={form.effective_date} onChange={e => setField('effective_date', e.target.value)} style={inputStyle} />
                </label>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>
                  Product Name *
                  <input type="text" required value={form.name} onChange={e => setField('name', e.target.value)} style={inputStyle} placeholder="e.g. Blue Cross PPO" />
                </label>
              </div>

              {/* Tier sections */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10, color: 'var(--text)' }}>Rate Tiers & Vendor Allocations</div>
                <div style={{ display: 'grid', gap: 8 }}>
                  {allTiers.map(tier => {
                    const row = tierRows[tier];
                    const hasEnrollments = (row.enrollment_count || 0) > 0;
                    const premium = row.enabled ? tierPremium(row) : 0;
                    const isExpanded = expandedTiers[tier];

                    return (
                      <div key={tier} style={{
                        border: '1px solid var(--border)',
                        borderRadius: 10,
                        overflow: 'hidden',
                        background: row.enabled ? 'var(--card)' : 'var(--bg)',
                        opacity: row.enabled ? 1 : 0.6,
                      }}>
                        {/* Tier header row */}
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                          cursor: row.enabled ? 'pointer' : 'default',
                        }} onClick={() => row.enabled && toggleExpand(tier)}>
                          <input
                            type="checkbox"
                            checked={row.enabled}
                            onChange={(e) => { e.stopPropagation(); if (row.enabled && hasEnrollments) return; toggleTier(tier); }}
                            disabled={row.enabled && hasEnrollments}
                            title={row.enabled && hasEnrollments ? 'Cannot remove tier with active enrollments' : ''}
                            style={{ accentColor: 'var(--accent)', cursor: row.enabled && hasEnrollments ? 'not-allowed' : 'pointer', width: 16, height: 16 }}
                          />
                          <span style={{ fontSize: 13, fontWeight: 600, flex: 1, color: row.enabled ? 'var(--text)' : 'var(--text-muted)' }}>
                            {tierLabels[tier]}
                          </span>
                          {row.enabled && (
                            <>
                              <div style={{ textAlign: 'right', minWidth: 90 }}>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>PREMIUM</div>
                                <div style={{ fontSize: 14, fontWeight: 700, color: row.allocations.length > 0 ? 'var(--text)' : 'var(--text-muted)' }}>
                                  ${premium.toFixed(2)}
                                </div>
                              </div>
                              <div style={{ textAlign: 'right', minWidth: 80 }}>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>VENDORS</div>
                                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)' }}>
                                  {row.allocations.filter(a => a.vendor).length}
                                </div>
                              </div>
                              {editProduct && (
                                <div style={{ textAlign: 'right', minWidth: 60 }}>
                                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>ENROLLED</div>
                                  <div style={{ fontSize: 14, fontWeight: 600, color: hasEnrollments ? '#059669' : 'var(--text-muted)' }}>
                                    {row.enrollment_count || 0}
                                  </div>
                                </div>
                              )}
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round"
                                style={{ transition: 'transform 0.2s', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)' }}>
                                <path d="M6 9l6 6 6-6" />
                              </svg>
                            </>
                          )}
                        </div>

                        {/* Expanded: allocations + ER/EE */}
                        {row.enabled && isExpanded && (
                          <div style={{ borderTop: '1px solid var(--border)', padding: '14px 14px 10px' }}>
                            {/* Allocation rows */}
                            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                              Vendor Allocations
                            </div>
                            {row.allocations.length === 0 && (
                              <div style={{ padding: '12px 0', fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                No allocations yet. Add vendors to set premium breakdown.
                              </div>
                            )}
                            {row.allocations.map((alloc, idx) => (
                              <div key={idx} style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'center' }}>
                                <select
                                  value={alloc.vendor}
                                  onChange={e => setAllocationField(tier, idx, 'vendor', e.target.value)}
                                  style={{ ...allocInputStyle, flex: 2 }}
                                >
                                  <option value="">Select vendor</option>
                                  {vendors.map(v => (
                                    <option key={v.id} value={v.id}>
                                      {v.name} ({v.vendor_type_display || v.vendor_type})
                                    </option>
                                  ))}
                                </select>
                                <input
                                  type="text"
                                  value={alloc.label}
                                  onChange={e => setAllocationField(tier, idx, 'label', e.target.value)}
                                  style={{ ...allocInputStyle, flex: 1.5 }}
                                  placeholder="Label"
                                />
                                <div style={{ position: 'relative', flex: 1 }}>
                                  <span style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: 'var(--text-muted)' }}>$</span>
                                  <input
                                    type="number" step="0.01" min="0"
                                    value={alloc.amount}
                                    onChange={e => setAllocationField(tier, idx, 'amount', e.target.value)}
                                    style={{ ...allocInputStyle, paddingLeft: 20, textAlign: 'right' }}
                                    placeholder="0.00"
                                  />
                                </div>
                                <button
                                  type="button"
                                  onClick={() => removeAllocation(tier, idx)}
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#ef4444', flexShrink: 0 }}
                                  title="Remove allocation"
                                >
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                    <path d="M18 6L6 18M6 6l12 12" />
                                  </svg>
                                </button>
                              </div>
                            ))}
                            <button
                              type="button"
                              onClick={() => addAllocation(tier)}
                              style={{
                                background: 'none', border: '1px dashed var(--border)', borderRadius: 6,
                                padding: '6px 12px', fontSize: 12, fontWeight: 600, color: 'var(--accent)',
                                cursor: 'pointer', width: '100%', marginTop: 4, marginBottom: 12,
                              }}
                            >
                              + Add Vendor Allocation
                            </button>

                            {/* ER / EE split */}
                            <div style={{ display: 'flex', gap: 12, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 4, textTransform: 'uppercase' }}>
                                  Total Premium
                                </div>
                                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>
                                  ${premium.toFixed(2)}
                                </div>
                              </div>
                              <label style={{ flex: 1 }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 4, textTransform: 'uppercase' }}>
                                  Employer Contribution
                                </div>
                                <input
                                  type="number" step="0.01" min="0"
                                  value={row.employer_contribution}
                                  onChange={e => setTierField(tier, 'employer_contribution', e.target.value)}
                                  style={allocInputStyle}
                                  placeholder="0.00"
                                />
                              </label>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 4, textTransform: 'uppercase' }}>
                                  Employee Deduction
                                </div>
                                <div style={{ fontSize: 16, fontWeight: 600, color: '#3b82f6', paddingTop: 6 }}>
                                  ${(parseFloat(row.employee_deduction) || 0).toFixed(2)}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" className="btn-outline" onClick={closeModal}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : editProduct ? 'Save Changes' : 'Create Product'}
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
  width: '100%', maxWidth: 840, boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
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
const labelStyle = { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' };
const inputStyle = {
  padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)',
  fontSize: 14, background: 'var(--input-bg)', color: 'var(--text)', outline: 'none',
  fontFamily: 'inherit',
};
const allocInputStyle = {
  padding: '7px 10px', borderRadius: 6, border: '1px solid var(--border)',
  fontSize: 13, background: 'var(--input-bg)', color: 'var(--text)', outline: 'none',
  fontFamily: 'inherit', width: '100%', boxSizing: 'border-box',
};
