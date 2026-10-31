import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/client';
import StatusBadge from '../components/StatusBadge';

const planColors = {
  medical: '#3b82f6',
  dental: '#7c3aed',
  vision: '#ea580c',
  life: '#16a34a',
};

const typeColors = {
  carrier: { bg: '#dbeafe', color: '#1d4ed8' },
  broker: { bg: '#ede9fe', color: '#6d28d9' },
  tpa: { bg: '#ffedd5', color: '#c2410c' },
  other: { bg: '#dcfce7', color: '#15803d' },
};

export default function EnrollmentEdit() {
  const { id } = useParams();
  const [enrollment, setEnrollment] = useState(null);
  const [dependents, setDependents] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [saving, setSaving] = useState(false);
  const [showRateModal, setShowRateModal] = useState(false);
  const [rateForm, setRateForm] = useState({ employer_contribution: '', allocations: [] });

  const load = () => {
    api.get(`/enrollments/${id}/`).then(r => {
      setEnrollment(r.data);
      api.get(`/dependents/?employee=${r.data.employee}`).then(dr => setDependents(dr.data));
    });
  };

  useEffect(() => {
    load();
    api.get('/vendors/').then(r => setVendors(r.data));
  }, [id]);

  const addSubscriber = async () => {
    setSaving(true);
    await api.post(`/enrollments/${id}/add_member/`, { is_subscriber: true });
    load();
    setSaving(false);
  };

  const addDependent = async (dependentId) => {
    setSaving(true);
    await api.post(`/enrollments/${id}/add_member/`, { dependent_id: dependentId });
    load();
    setSaving(false);
  };

  const removeMember = async (memberId) => {
    setSaving(true);
    await api.post(`/enrollments/${id}/remove_member/`, { member_id: memberId });
    load();
    setSaving(false);
  };

  const handleAction = async (action) => {
    setSaving(true);
    await api.post(`/enrollments/${id}/${action}/`);
    load();
    setSaving(false);
  };

  const handleResnapshot = async () => {
    setSaving(true);
    await api.post(`/enrollments/${id}/resnapshot/`);
    load();
    setSaving(false);
  };

  const openRateModal = () => {
    const allocs = (enrollment.allocations || []).map(a => ({
      vendor: a.vendor,
      label: a.label,
      amount: a.amount,
    }));
    setRateForm({
      employer_contribution: enrollment.employer_contribution || '0.00',
      allocations: allocs.length > 0 ? allocs : [{ vendor: '', label: '', amount: '' }],
    });
    setShowRateModal(true);
  };

  const allocTotal = () =>
    rateForm.allocations.reduce((s, a) => s + (parseFloat(a.amount) || 0), 0);

  const setAllocField = (i, field, value) => {
    const next = [...rateForm.allocations];
    next[i] = { ...next[i], [field]: value };
    if (field === 'vendor') {
      const v = vendors.find(vd => vd.id === parseInt(value));
      if (v && !next[i].label) {
        const labels = { carrier: 'Carrier Premium', broker: 'Broker Fee', tpa: 'TPA Admin Fee' };
        next[i].label = labels[v.vendor_type] || 'Fee';
      }
    }
    setRateForm(f => ({ ...f, allocations: next }));
  };

  const addAlloc = () =>
    setRateForm(f => ({ ...f, allocations: [...f.allocations, { vendor: '', label: '', amount: '' }] }));

  const removeAlloc = (i) =>
    setRateForm(f => ({ ...f, allocations: f.allocations.filter((_, j) => j !== i) }));

  const saveRates = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put(`/enrollments/${id}/rates/`, {
        employer_contribution: rateForm.employer_contribution,
        allocations: rateForm.allocations.filter(a => a.vendor && a.amount).map(a => ({
          vendor: parseInt(a.vendor),
          label: a.label,
          amount: a.amount,
        })),
      });
      setShowRateModal(false);
      load();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (!enrollment) return <div style={{ padding: 40, color: 'var(--text-muted)' }}>Loading...</div>;

  const members = enrollment.members || [];
  const allocations = enrollment.allocations || [];
  const hasSubscriber = members.some(m => m.is_subscriber);
  const enrolledDepIds = members.filter(m => m.dependent).map(m => m.dependent);
  const availableDependents = dependents.filter(d => !enrolledDepIds.includes(d.id));
  const premium = parseFloat(enrollment.monthly_premium) || 0;
  const erContrib = parseFloat(enrollment.employer_contribution) || 0;
  const eeDeduction = parseFloat(enrollment.employee_deduction) || 0;
  const planPremium = parseFloat(enrollment.plan_monthly_premium) || 0;
  const ratesDiffer = premium !== planPremium;

  return (
    <div>
      <Link to="/staff/enrollments" style={{ color: 'var(--accent)', textDecoration: 'none', fontSize: 14 }}>
        ← Back to Enrollments
      </Link>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 16, marginBottom: 28 }}>
        <div>
          <h2 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 700 }}>
            {enrollment.employee_name} — {enrollment.plan_name}
          </h2>
          <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
            {enrollment.employer_name} · {enrollment.tier_display} · Effective {enrollment.effective_date}
          </div>
        </div>
        <StatusBadge status={enrollment.status} />
      </div>

      {/* Summary row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'MONTHLY PREMIUM', value: `$${premium.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, color: 'var(--text)' },
          { label: 'ER CONTRIBUTION', value: `$${erContrib.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, color: '#16a34a' },
          { label: 'EE DEDUCTION', value: `$${eeDeduction.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, color: 'var(--red, #dc2626)' },
          { label: 'MEMBERS', value: members.length, color: 'var(--text)' },
        ].map(stat => (
          <div key={stat.label} style={cardStyle}>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 6 }}>{stat.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: stat.color }}>{stat.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 28 }}>
        {/* Plan Details */}
        <div style={{
          ...cardStyle,
          borderLeft: `4px solid ${planColors[enrollment.plan_type] || 'var(--accent)'}`,
        }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700 }}>Plan Details</h3>
          <div style={{ fontSize: 14, lineHeight: 2 }}>
            <div><span style={labelColor}>Plan:</span> {enrollment.plan_name}</div>
            <div><span style={labelColor}>Type:</span> <span style={{ textTransform: 'capitalize' }}>{enrollment.plan_type}</span></div>
            <div><span style={labelColor}>Carrier:</span> {enrollment.carrier_name}</div>
            <div><span style={labelColor}>Tier:</span> {enrollment.tier_display}</div>
            <div><span style={labelColor}>Effective:</span> {enrollment.effective_date}</div>
            {enrollment.termination_date && (
              <div><span style={labelColor}>Terminated:</span> {enrollment.termination_date}</div>
            )}
            {enrollment.carrier_confirmation_number && (
              <div><span style={labelColor}>Confirmation:</span> {enrollment.carrier_confirmation_number}</div>
            )}
          </div>
        </div>

        {/* Rate Breakdown */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Rate Breakdown</h3>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-outline btn-xs" onClick={handleResnapshot} disabled={saving}
                title="Reset to current plan rates">
                Re-sync
              </button>
              <button className="btn-primary btn-xs" onClick={openRateModal} disabled={saving}>
                Edit Rates
              </button>
            </div>
          </div>

          {ratesDiffer && (
            <div style={{
              padding: '6px 12px', borderRadius: 6, background: '#fef3c7', color: '#92400e',
              fontSize: 12, fontWeight: 500, marginBottom: 12,
            }}>
              Enrollment rates differ from current plan rates (plan: ${planPremium.toFixed(2)}/mo)
            </div>
          )}

          {allocations.length > 0 ? (
            <div>
              {allocations.map((a, i) => {
                const tc = typeColors[a.vendor_type] || typeColors.other;
                return (
                  <div key={i} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 0',
                    borderBottom: i < allocations.length - 1 ? '1px solid var(--border)' : 'none',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{
                        padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 600,
                        background: tc.bg, color: tc.color,
                      }}>
                        {a.vendor_type}
                      </span>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>{a.vendor_name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{a.label}</div>
                      </div>
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 700 }}>
                      ${parseFloat(a.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                );
              })}
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                paddingTop: 12, marginTop: 4,
                borderTop: '2px solid var(--border)',
                fontSize: 14, fontWeight: 700,
              }}>
                <span>Total Premium</span>
                <span>${premium.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          ) : (
            <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: '12px 0' }}>
              No allocations recorded. Click "Re-sync" to pull from plan rates.
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div style={{ ...cardStyle, marginBottom: 28, display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginRight: 8 }}>ACTIONS:</span>
        {enrollment.status === 'pending' && (
          <>
            <button className="btn-success btn-sm" onClick={() => handleAction('activate')} disabled={saving}>Activate</button>
            <button className="btn-primary btn-sm" onClick={() => handleAction('confirm')} disabled={saving}>Carrier Confirm</button>
          </>
        )}
        {enrollment.status === 'active' && (
          <button className="btn-primary btn-sm" onClick={() => handleAction('confirm')} disabled={saving}>Carrier Confirm</button>
        )}
        {(enrollment.status === 'active' || enrollment.status === 'carrier_confirmed') && (
          <button className="btn-danger btn-sm" onClick={() => handleAction('terminate')} disabled={saving}>Terminate</button>
        )}
      </div>

      {/* Members */}
      <div style={{ ...cardStyle, marginBottom: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Policy Members</h3>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{members.length} member{members.length !== 1 ? 's' : ''}</span>
        </div>

        {members.length === 0 ? (
          <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
            No members added yet. Add the subscriber and any dependents below.
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>NAME</th>
                <th>RELATIONSHIP</th>
                <th>EFFECTIVE DATE</th>
                <th style={{ width: 100 }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {members.map(member => (
                <tr key={member.id}>
                  <td style={{ fontWeight: 600 }}>
                    {member.person_name}
                    {member.is_subscriber && (
                      <span style={{
                        marginLeft: 8, padding: '2px 6px', borderRadius: 4,
                        background: '#dbeafe', color: '#1d4ed8', fontSize: 10, fontWeight: 700,
                      }}>SUBSCRIBER</span>
                    )}
                  </td>
                  <td>{member.relationship}</td>
                  <td>{member.effective_date || enrollment.effective_date}</td>
                  <td>
                    <button
                      className="btn-outline btn-xs"
                      onClick={() => removeMember(member.id)}
                      disabled={saving}
                      style={{ color: 'var(--red)', borderColor: 'var(--red)' }}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: 'var(--text-secondary)' }}>ADD MEMBERS</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {!hasSubscriber && (
              <button className="btn-primary btn-sm" onClick={addSubscriber} disabled={saving}>
                + Add Subscriber ({enrollment.employee_name})
              </button>
            )}
            {availableDependents.map(dep => (
              <button
                key={dep.id}
                className="btn-outline btn-sm"
                onClick={() => addDependent(dep.id)}
                disabled={saving}
              >
                + {dep.full_name} ({dep.relationship_display})
              </button>
            ))}
            {hasSubscriber && availableDependents.length === 0 && (
              <span style={{ fontSize: 13, color: 'var(--text-muted)', padding: '4px 0' }}>
                All available dependents are enrolled.
                {dependents.length === 0 && ' This employee has no dependents on file.'}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Edit Rates Modal */}
      {showRateModal && (
        <div style={overlay} onClick={() => setShowRateModal(false)}>
          <div style={modal} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Edit Enrollment Rates</h3>
              <button onClick={() => setShowRateModal(false)} style={{ background: 'none', border: 'none', padding: 4, color: 'var(--text-muted)', cursor: 'pointer' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>

            <form onSubmit={saveRates}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 12 }}>
                VENDOR ALLOCATIONS
              </div>
              {rateForm.allocations.map((alloc, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 100px 32px', gap: 8, marginBottom: 8 }}>
                  <select
                    value={alloc.vendor}
                    onChange={e => setAllocField(i, 'vendor', e.target.value)}
                    style={inputStyle}
                  >
                    <option value="">Select vendor...</option>
                    {vendors.map(v => (
                      <option key={v.id} value={v.id}>{v.name} ({v.vendor_type_display || v.vendor_type})</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="Label"
                    value={alloc.label}
                    onChange={e => setAllocField(i, 'label', e.target.value)}
                    style={inputStyle}
                  />
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={alloc.amount}
                    onChange={e => setAllocField(i, 'amount', e.target.value)}
                    style={inputStyle}
                  />
                  <button type="button" onClick={() => removeAlloc(i)} style={{
                    background: 'none', border: 'none', color: 'var(--red, #dc2626)',
                    cursor: 'pointer', fontSize: 18, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>×</button>
                </div>
              ))}
              <button type="button" onClick={addAlloc} style={{
                background: 'none', border: 'none', color: 'var(--accent)',
                fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: '4px 0', marginBottom: 16,
              }}>
                + Add Vendor Allocation
              </button>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16, marginTop: 8 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>TOTAL PREMIUM</div>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>
                    ${allocTotal().toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>
                  ER CONTRIBUTION
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={rateForm.employer_contribution}
                    onChange={e => setRateForm(f => ({ ...f, employer_contribution: e.target.value }))}
                    style={inputStyle}
                  />
                </label>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>EE DEDUCTION</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--red, #dc2626)' }}>
                    ${(allocTotal() - (parseFloat(rateForm.employer_contribution) || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                <button type="button" className="btn-outline" onClick={() => setShowRateModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Rates'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const cardStyle = {
  background: 'var(--card)',
  borderRadius: 'var(--radius-lg)',
  padding: 24,
  boxShadow: 'var(--card-shadow)',
};

const labelColor = { color: 'var(--text-secondary)' };

const overlay = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex',
  alignItems: 'center', justifyContent: 'center', zIndex: 1000,
};

const modal = {
  background: 'var(--card)', borderRadius: 'var(--radius-lg)', padding: '28px 32px',
  width: '100%', maxWidth: 640, boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
  border: '1px solid var(--border)', maxHeight: '90vh', overflowY: 'auto',
};

const inputStyle = {
  padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border)',
  fontSize: 13, background: 'var(--input-bg)', color: 'var(--text)',
  outline: 'none', fontFamily: 'inherit', width: '100%', boxSizing: 'border-box',
};
