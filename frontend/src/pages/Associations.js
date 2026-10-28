import React, { useEffect, useState } from 'react';
import api from '../api/client';

const typeLabels = {
  chamber: 'Chamber of Commerce',
  trade: 'Trade Association',
  professional: 'Professional Association',
  industry: 'Industry Group',
};
const typeColors = {
  chamber: { bg: '#dbeafe', color: '#1d4ed8' },
  trade: { bg: '#d1fae5', color: '#059669' },
  professional: { bg: '#ede9fe', color: '#7c3aed' },
  industry: { bg: '#fef9c3', color: '#a16207' },
};

const emptyForm = {
  name: '', association_type: 'chamber', contact_name: '', contact_email: '',
  contact_phone: '', address: '', active: true,
};

export default function Associations() {
  const [associations, setAssociations] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = () => api.get('/associations/').then(r => setAssociations(r.data));
  useEffect(() => { load(); }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.post('/associations/', form);
      setShowModal(false);
      setForm(emptyForm);
      load();
    } catch (err) {
      const data = err.response?.data;
      if (data) {
        const msgs = Object.entries(data).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`);
        setError(msgs.join(' | '));
      } else {
        setError('Failed to create association.');
      }
    } finally {
      setSaving(false);
    }
  };

  const typeCounts = {};
  associations.forEach(a => { typeCounts[a.association_type] = (typeCounts[a.association_type] || 0) + 1; });
  const totalEmployers = associations.reduce((s, a) => s + (a.employer_count || 0), 0);
  const totalEmployees = associations.reduce((s, a) => s + (a.total_employees || 0), 0);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 600, marginBottom: 4 }}>People</div>
          <h2 style={{ margin: '0 0 6px', fontSize: 24, fontWeight: 700 }}>Associations</h2>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--text-secondary)', maxWidth: 600 }}>
            Manage association and buying group relationships across employer groups.
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14m-7-7h14"/></svg>
          Add Association
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Total Associations', value: associations.length, color: '#3b82f6' },
          { label: 'Member Groups', value: totalEmployers, color: '#059669' },
          { label: 'Total Employees', value: totalEmployees, color: '#7c3aed' },
          { label: 'Active', value: associations.filter(a => a.active).length, color: '#16a34a' },
        ].map((s, i) => (
          <div key={i} style={cardStyle}>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500, marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Association cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 16 }}>
        {associations.map(assoc => {
          const tc = typeColors[assoc.association_type] || typeColors.chamber;
          return (
            <div key={assoc.id} style={{ ...cardStyle, borderLeft: `3px solid ${tc.color}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 4 }}>{assoc.name}</div>
                  <span style={{
                    padding: '3px 10px', borderRadius: 10, fontSize: 12, fontWeight: 600,
                    background: tc.bg, color: tc.color,
                  }}>
                    {typeLabels[assoc.association_type]}
                  </span>
                </div>
                <span style={{
                  padding: '3px 10px', borderRadius: 10, fontSize: 11, fontWeight: 700,
                  background: assoc.active ? '#d1fae5' : '#fee2e2',
                  color: assoc.active ? '#059669' : '#dc2626',
                }}>
                  {assoc.active ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 14, fontSize: 13 }}>
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 11, marginBottom: 2 }}>CONTACT</div>
                  <div style={{ fontWeight: 500 }}>{assoc.contact_name}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 11, marginBottom: 2 }}>EMAIL</div>
                  <div style={{ fontWeight: 500, fontSize: 12 }}>{assoc.contact_email}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 11, marginBottom: 2 }}>PHONE</div>
                  <div style={{ fontWeight: 500 }}>{assoc.contact_phone || '—'}</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 16, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                <div style={{ fontSize: 13 }}>
                  <span style={{ fontWeight: 700, color: '#3b82f6' }}>{assoc.employer_count || 0}</span>
                  <span style={{ color: 'var(--text-secondary)', marginLeft: 4 }}>employer groups</span>
                </div>
                <div style={{ fontSize: 13 }}>
                  <span style={{ fontWeight: 700, color: '#7c3aed' }}>{assoc.total_employees || 0}</span>
                  <span style={{ color: 'var(--text-secondary)', marginLeft: 4 }}>employees</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {associations.length === 0 && (
        <div style={{ ...cardStyle, textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" style={{ marginBottom: 16, opacity: 0.5 }}>
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2M9 7a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
          </svg>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>No associations yet</div>
          <div style={{ fontSize: 14 }}>Click "Add Association" to create your first buying group or association.</div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div style={overlay} onClick={() => setShowModal(false)}>
          <div style={modal} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Add Association</h3>
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
                  Association Name *
                  <input type="text" required value={form.name} onChange={e => set('name', e.target.value)} style={inputStyle} placeholder="e.g. Arkansas Small Business Alliance" />
                </label>
                <label style={labelStyle}>
                  Type *
                  <select required value={form.association_type} onChange={e => set('association_type', e.target.value)} style={inputStyle}>
                    <option value="chamber">Chamber of Commerce</option>
                    <option value="trade">Trade Association</option>
                    <option value="professional">Professional Association</option>
                    <option value="industry">Industry Group</option>
                  </select>
                </label>
              </div>

              <div style={fieldGrid}>
                <label style={labelStyle}>
                  Contact Name *
                  <input type="text" required value={form.contact_name} onChange={e => set('contact_name', e.target.value)} style={inputStyle} placeholder="Primary contact" />
                </label>
                <label style={labelStyle}>
                  Contact Email *
                  <input type="email" required value={form.contact_email} onChange={e => set('contact_email', e.target.value)} style={inputStyle} placeholder="email@association.org" />
                </label>
              </div>

              <div style={fieldGrid}>
                <label style={labelStyle}>
                  Contact Phone
                  <input type="text" value={form.contact_phone} onChange={e => set('contact_phone', e.target.value)} style={inputStyle} placeholder="(555) 123-4567" />
                </label>
                <div />
              </div>

              <label style={{ ...labelStyle, marginBottom: 20 }}>
                Address
                <textarea value={form.address} onChange={e => set('address', e.target.value)} rows={2} style={{ ...inputStyle, resize: 'vertical' }} placeholder="Street, City, State ZIP" />
              </label>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" className="btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Creating...' : 'Create Association'}
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
  background: 'var(--card)', borderRadius: 'var(--radius-lg)',
  padding: '16px 20px', boxShadow: 'var(--card-shadow)', border: '1px solid var(--border)',
};
const overlay = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex',
  alignItems: 'center', justifyContent: 'center', zIndex: 1000,
};
const modal = {
  background: 'var(--card)', borderRadius: 'var(--radius-lg)', padding: '28px 32px',
  width: '100%', maxWidth: 560, boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
  border: '1px solid var(--border)', maxHeight: '90vh', overflowY: 'auto',
};
const fieldGrid = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 };
const labelStyle = { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' };
const inputStyle = {
  padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)',
  fontSize: 14, background: 'var(--input-bg)', color: 'var(--text)', outline: 'none',
  fontFamily: 'inherit',
};
