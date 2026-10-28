import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import Table from '../components/Table';

const columns = [
  { key: 'name', label: 'Company Name' },
  { key: 'ein', label: 'EIN' },
  { key: 'contact_name', label: 'Contact' },
  { key: 'contact_email', label: 'Email' },
  { key: 'employee_count', label: 'Employees' },
  { key: 'active', label: 'Status', render: v => (
    <span style={{
      padding: '3px 10px',
      borderRadius: 12,
      fontSize: 12,
      fontWeight: 600,
      background: v ? '#e6f4ea' : '#fce4ec',
      color: v ? '#1e7e34' : '#c62828',
    }}>
      {v ? 'Active' : 'Inactive'}
    </span>
  )},
];

const emptyForm = {
  name: '', ein: '', contact_name: '', contact_email: '', contact_phone: '',
  address: '', billing_cycle_day: 1, active: true,
};

export default function Employers() {
  const [employers, setEmployers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const load = () => api.get('/employers/').then(r => setEmployers(r.data));
  useEffect(() => { load(); }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.post('/employers/', form);
      setShowModal(false);
      setForm(emptyForm);
      load();
    } catch (err) {
      const data = err.response?.data;
      if (data) {
        const msgs = Object.entries(data).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`);
        setError(msgs.join(' | '));
      } else {
        setError('Failed to create employer.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 600, marginBottom: 4 }}>People</div>
          <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Employers</h2>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14m-7-7h14"/></svg>
          Add Employer
        </button>
      </div>

      <Table
        columns={columns}
        data={employers}
        onRowClick={row => navigate(`/staff/employers/${row.id}`)}
      />

      {employers.length === 0 && (
        <div style={{
          textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)',
        }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" style={{ marginBottom: 16, opacity: 0.5 }}>
            <path d="M3 21h18M3 7v14m18-14v14M6 11h.01M6 15h.01M10 11h.01M10 15h.01M14 11h.01M14 15h.01M18 11h.01M18 15h.01M6 7V3h12v4"/>
          </svg>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>No employers yet</div>
          <div style={{ fontSize: 14, marginBottom: 16 }}>Click "Add Employer" to create your first employer group.</div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div style={overlay} onClick={() => setShowModal(false)}>
          <div style={modal} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Add Employer</h3>
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
                  Company Name *
                  <input type="text" required value={form.name} onChange={e => set('name', e.target.value)} style={inputStyle} placeholder="e.g. Acme Manufacturing" />
                </label>
                <label style={labelStyle}>
                  EIN *
                  <input type="text" required value={form.ein} onChange={e => set('ein', e.target.value)} style={inputStyle} placeholder="XX-XXXXXXX" />
                </label>
              </div>

              <div style={fieldGrid}>
                <label style={labelStyle}>
                  Contact Name *
                  <input type="text" required value={form.contact_name} onChange={e => set('contact_name', e.target.value)} style={inputStyle} placeholder="Primary contact" />
                </label>
                <label style={labelStyle}>
                  Contact Email *
                  <input type="email" required value={form.contact_email} onChange={e => set('contact_email', e.target.value)} style={inputStyle} placeholder="email@company.com" />
                </label>
              </div>

              <div style={fieldGrid}>
                <label style={labelStyle}>
                  Contact Phone
                  <input type="text" value={form.contact_phone} onChange={e => set('contact_phone', e.target.value)} style={inputStyle} placeholder="(555) 123-4567" />
                </label>
                <label style={labelStyle}>
                  Billing Cycle Day
                  <input type="number" min="1" max="28" value={form.billing_cycle_day} onChange={e => set('billing_cycle_day', parseInt(e.target.value) || 1)} style={inputStyle} />
                </label>
              </div>

              <label style={{ ...labelStyle, marginBottom: 20 }}>
                Address
                <textarea value={form.address} onChange={e => set('address', e.target.value)} rows={2} style={{ ...inputStyle, resize: 'vertical' }} placeholder="Street, City, State ZIP" />
              </label>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" className="btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Creating...' : 'Create Employer'}
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
