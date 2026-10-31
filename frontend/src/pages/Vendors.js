import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';

const typeColors = {
  carrier: { bg: '#dbeafe', color: '#1d4ed8' },
  broker: { bg: '#ede9fe', color: '#6d28d9' },
  tpa: { bg: '#ffedd5', color: '#c2410c' },
  other: { bg: '#dcfce7', color: '#15803d' },
};

const emptyForm = {
  name: '', vendor_type: 'carrier', contact_name: '', contact_email: '', contact_phone: '',
  agency: '', license_number: '', license_state: '',
};

export default function Vendors() {
  const [vendors, setVendors] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const navigate = useNavigate();

  const load = () => api.get('/vendors/').then(r => setVendors(r.data));
  useEffect(() => { load(); }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.post('/vendors/', form);
      setShowModal(false);
      setForm(emptyForm);
      load();
    } catch (err) {
      const data = err.response?.data;
      if (data) {
        const msgs = Object.entries(data).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`);
        setError(msgs.join(' | '));
      } else {
        setError('Failed to create vendor.');
      }
    } finally {
      setSaving(false);
    }
  };

  const byType = {};
  vendors.forEach(v => {
    byType[v.vendor_type] = (byType[v.vendor_type] || 0) + 1;
  });

  const filtered = filter === 'all' ? vendors : vendors.filter(v => v.vendor_type === filter);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 600, marginBottom: 4 }}>Administration</div>
          <h2 style={{ margin: '0 0 6px', fontSize: 24, fontWeight: 700 }}>Vendors</h2>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--text-secondary)' }}>
            {vendors.length} vendors across {Object.keys(byType).length} types
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14m-7-7h14"/></svg>
          Add Vendor
        </button>
      </div>

      {/* Type summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 }}>
        {['carrier', 'broker', 'tpa', 'other'].map(type => {
          const tc = typeColors[type];
          const count = byType[type] || 0;
          const labels = { carrier: 'Carriers', broker: 'Brokers', tpa: 'TPA Admin', other: 'Other' };
          return (
            <div
              key={type}
              onClick={() => setFilter(filter === type ? 'all' : type)}
              style={{
                ...cardStyle, cursor: 'pointer',
                border: filter === type ? `2px solid ${tc.color}` : '1px solid var(--border)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 8, background: tc.bg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={tc.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                  </svg>
                </div>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: tc.color }}>{count}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{labels[type]}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filter !== 'all' && (
        <div style={{ marginBottom: 16, fontSize: 13 }}>
          <button onClick={() => setFilter('all')} style={{ background: 'none', color: 'var(--accent)', fontWeight: 600, cursor: 'pointer', border: 'none', padding: 0 }}>
            Clear filter
          </button>
          <span style={{ color: 'var(--text-muted)', marginLeft: 8 }}>Showing {filtered.length} {filter} vendors</span>
        </div>
      )}

      {/* Vendor cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
        {filtered.map(vendor => {
          const tc = typeColors[vendor.vendor_type] || typeColors.carrier;
          return (
            <div
              key={vendor.id}
              onClick={() => navigate(`/staff/vendors/${vendor.id}`)}
              style={{
                ...cardStyle, cursor: 'pointer',
                borderLeft: `3px solid ${tc.color}`,
                transition: 'transform 0.1s, box-shadow 0.1s',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{vendor.name}</div>
                  <span style={{
                    padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600,
                    background: tc.bg, color: tc.color,
                  }}>
                    {vendor.vendor_type_display || vendor.vendor_type}
                  </span>
                  {vendor.agency && (
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)', marginLeft: 8 }}>
                      {vendor.agency}
                    </span>
                  )}
                </div>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, fontSize: 13 }}>
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 11, marginBottom: 2 }}>CONTACT</div>
                  <div style={{ fontWeight: 500 }}>{vendor.contact_name || '—'}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 11, marginBottom: 2 }}>EMAIL</div>
                  <div style={{ fontWeight: 500, fontSize: 12 }}>{vendor.contact_email || '—'}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 11, marginBottom: 2 }}>PHONE</div>
                  <div style={{ fontWeight: 500 }}>{vendor.contact_phone || '—'}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>No vendors found</div>
          <div style={{ fontSize: 14, marginBottom: 16 }}>
            {filter !== 'all' ? 'No vendors of this type.' : 'Click "Add Vendor" to register your first vendor.'}
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div style={overlay} onClick={() => setShowModal(false)}>
          <div style={modal} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Add Vendor</h3>
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
              <label style={{ ...labelStyle, marginBottom: 16 }}>
                Vendor Name *
                <input type="text" required value={form.name} onChange={e => set('name', e.target.value)} style={inputStyle} placeholder="e.g. Blue Cross Blue Shield" />
              </label>

              <label style={{ ...labelStyle, marginBottom: 16 }}>
                Vendor Type *
                <select value={form.vendor_type} onChange={e => set('vendor_type', e.target.value)} style={inputStyle}>
                  <option value="carrier">Insurance Carrier</option>
                  <option value="broker">Broker</option>
                  <option value="tpa">TPA Admin</option>
                  <option value="other">Other</option>
                </select>
              </label>

              <div style={fieldGrid}>
                <label style={labelStyle}>
                  Contact Name
                  <input type="text" value={form.contact_name} onChange={e => set('contact_name', e.target.value)} style={inputStyle} placeholder="Rep name" />
                </label>
                <label style={labelStyle}>
                  Contact Email
                  <input type="email" value={form.contact_email} onChange={e => set('contact_email', e.target.value)} style={inputStyle} placeholder="email@example.com" />
                </label>
              </div>

              <label style={{ ...labelStyle, marginBottom: 16 }}>
                Contact Phone
                <input type="text" value={form.contact_phone} onChange={e => set('contact_phone', e.target.value)} style={inputStyle} placeholder="(555) 123-4567" />
              </label>

              {form.vendor_type === 'broker' && (
                <>
                  <label style={{ ...labelStyle, marginBottom: 16 }}>
                    Agency
                    <input type="text" value={form.agency} onChange={e => set('agency', e.target.value)} style={inputStyle} placeholder="Agency name" />
                  </label>
                  <div style={fieldGrid}>
                    <label style={labelStyle}>
                      License Number
                      <input type="text" value={form.license_number} onChange={e => set('license_number', e.target.value)} style={inputStyle} placeholder="AR-INS-12345" />
                    </label>
                    <label style={labelStyle}>
                      License State
                      <input type="text" value={form.license_state} onChange={e => set('license_state', e.target.value)} style={inputStyle} maxLength={2} placeholder="AR" />
                    </label>
                  </div>
                </>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                <button type="button" className="btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Creating...' : 'Create Vendor'}
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
  width: '100%', maxWidth: 480, boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
  border: '1px solid var(--border)', maxHeight: '90vh', overflowY: 'auto',
};
const cardStyle = {
  background: 'var(--card)',
  borderRadius: 'var(--radius-lg)',
  padding: '16px 20px',
  boxShadow: 'var(--card-shadow)',
  border: '1px solid var(--border)',
};
const fieldGrid = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 };
const labelStyle = { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' };
const inputStyle = {
  padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)',
  fontSize: 14, background: 'var(--input-bg)', color: 'var(--text)', outline: 'none',
  fontFamily: 'inherit',
};
