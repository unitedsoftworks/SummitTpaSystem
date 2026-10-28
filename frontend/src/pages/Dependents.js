import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';

const relColors = {
  spouse: { bg: '#ede9fe', color: '#7c3aed' },
  child: { bg: '#dbeafe', color: '#1d4ed8' },
  domestic_partner: { bg: '#fce7f3', color: '#be185d' },
};

const emptyForm = {
  employee: '', first_name: '', last_name: '', date_of_birth: '',
  relationship: 'spouse', ssn_last_four: '', gender: '',
};

export default function Dependents() {
  const [dependents, setDependents] = useState([]);
  const [employers, setEmployers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [employerFilter, setEmployerFilter] = useState('');
  const [relFilter, setRelFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const load = () => {
    const params = new URLSearchParams();
    if (employerFilter) params.set('employer', employerFilter);
    api.get(`/dependents/?${params}`).then(r => setDependents(r.data));
  };

  useEffect(() => {
    api.get('/employers/').then(r => setEmployers(r.data));
    api.get('/employees/').then(r => setEmployees(r.data));
  }, []);

  useEffect(() => { load(); }, [employerFilter]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.post('/dependents/', form);
      setShowModal(false);
      setForm(emptyForm);
      load();
    } catch (err) {
      const data = err.response?.data;
      if (data) {
        const msgs = Object.entries(data).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`);
        setError(msgs.join(' | '));
      } else {
        setError('Failed to create dependent.');
      }
    } finally {
      setSaving(false);
    }
  };

  const filtered = relFilter ? dependents.filter(d => d.relationship === relFilter) : dependents;

  const relCounts = {};
  dependents.forEach(d => { relCounts[d.relationship] = (relCounts[d.relationship] || 0) + 1; });

  const age = (dob) => {
    const d = new Date(dob);
    const now = new Date();
    let a = now.getFullYear() - d.getFullYear();
    if (now.getMonth() < d.getMonth() || (now.getMonth() === d.getMonth() && now.getDate() < d.getDate())) a--;
    return a;
  };

  const agingOut = filtered.filter(d => d.relationship === 'child' && age(d.date_of_birth) >= 24);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 600, marginBottom: 4 }}>People</div>
          <h2 style={{ margin: '0 0 6px', fontSize: 24, fontWeight: 700 }}>Dependent Management</h2>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--text-secondary)', maxWidth: 600 }}>
            View and manage dependent records across all employee enrollments.
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14m-7-7h14"/></svg>
          Add Dependent
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Total Dependents', value: dependents.length, color: '#3b82f6' },
          { label: 'Spouses', value: relCounts.spouse || 0, color: '#7c3aed' },
          { label: 'Children', value: relCounts.child || 0, color: '#1d4ed8' },
          { label: 'Domestic Partners', value: relCounts.domestic_partner || 0, color: '#be185d' },
          { label: 'Aging Out (24+)', value: agingOut.length, color: agingOut.length > 0 ? '#dc2626' : '#6b7280' },
        ].map((s, i) => (
          <div key={i} style={cardStyle}>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 500, marginBottom: 2 }}>{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <select value={relFilter} onChange={e => setRelFilter(e.target.value)} style={selectStyle}>
          <option value="">All relationships</option>
          <option value="spouse">Spouse</option>
          <option value="child">Child</option>
          <option value="domestic_partner">Domestic Partner</option>
        </select>
        <select value={employerFilter} onChange={e => setEmployerFilter(e.target.value)} style={selectStyle}>
          <option value="">All employers</option>
          {employers.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
      </div>

      {/* Aging-out alert */}
      {agingOut.length > 0 && (
        <div style={{
          ...cardStyle, marginBottom: 16, padding: '14px 20px',
          borderLeft: '3px solid #dc2626', display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#dc2626' }}>
            {agingOut.length} dependent{agingOut.length !== 1 ? 's' : ''} aging out of coverage (age 24+)
          </span>
        </div>
      )}

      {/* Dependent table */}
      <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={thStyle}>Dependent</th>
              <th style={thStyle}>Relationship</th>
              <th style={thStyle}>DOB</th>
              <th style={thStyle}>Age</th>
              <th style={thStyle}>Employee</th>
              <th style={thStyle}>Gender</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(d => {
              const rc = relColors[d.relationship] || relColors.child;
              const a = age(d.date_of_birth);
              const isAgingOut = d.relationship === 'child' && a >= 24;
              return (
                <tr
                  key={d.id}
                  onClick={() => navigate(`/staff/employees/${d.employee}`)}
                  style={{ borderBottom: '1px solid var(--table-row-border)', cursor: 'pointer' }}
                >
                  <td style={tdStyle}>
                    <div style={{ fontWeight: 600 }}>{d.full_name}</div>
                    {d.ssn_last_four && (
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>SSN: ***-**-{d.ssn_last_four}</div>
                    )}
                  </td>
                  <td style={tdStyle}>
                    <span style={{
                      padding: '3px 10px', borderRadius: 10, fontSize: 12, fontWeight: 600,
                      background: rc.bg, color: rc.color,
                    }}>
                      {d.relationship_display}
                    </span>
                  </td>
                  <td style={tdStyle}>{d.date_of_birth}</td>
                  <td style={tdStyle}>
                    <span style={{
                      fontWeight: 600,
                      color: isAgingOut ? '#dc2626' : 'var(--text)',
                    }}>
                      {a}
                      {isAgingOut && (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 4, verticalAlign: 'middle' }}>
                          <path d="M12 9v2m0 4h.01" />
                        </svg>
                      )}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <span style={{ fontWeight: 500 }}>{d.employee_name}</span>
                  </td>
                  <td style={{ ...tdStyle, color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                    {d.gender || '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
            No dependents found matching filters.
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div style={overlay} onClick={() => setShowModal(false)}>
          <div style={modal} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Add Dependent</h3>
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
                Employee *
                <select required value={form.employee} onChange={e => set('employee', e.target.value)} style={inputStyle}>
                  <option value="">Select employee...</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.full_name} — {emp.employer_name}</option>
                  ))}
                </select>
              </label>

              <div style={fieldGrid}>
                <label style={labelStyle}>
                  First Name *
                  <input type="text" required value={form.first_name} onChange={e => set('first_name', e.target.value)} style={inputStyle} placeholder="First name" />
                </label>
                <label style={labelStyle}>
                  Last Name *
                  <input type="text" required value={form.last_name} onChange={e => set('last_name', e.target.value)} style={inputStyle} placeholder="Last name" />
                </label>
              </div>

              <div style={fieldGrid}>
                <label style={labelStyle}>
                  Date of Birth *
                  <input type="date" required value={form.date_of_birth} onChange={e => set('date_of_birth', e.target.value)} style={inputStyle} />
                </label>
                <label style={labelStyle}>
                  Relationship *
                  <select required value={form.relationship} onChange={e => set('relationship', e.target.value)} style={inputStyle}>
                    <option value="spouse">Spouse</option>
                    <option value="child">Child</option>
                    <option value="domestic_partner">Domestic Partner</option>
                  </select>
                </label>
              </div>

              <div style={fieldGrid}>
                <label style={labelStyle}>
                  SSN Last 4
                  <input type="text" maxLength={4} value={form.ssn_last_four} onChange={e => set('ssn_last_four', e.target.value)} style={inputStyle} placeholder="1234" />
                </label>
                <label style={labelStyle}>
                  Gender
                  <select value={form.gender} onChange={e => set('gender', e.target.value)} style={inputStyle}>
                    <option value="">—</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                <button type="button" className="btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Creating...' : 'Create Dependent'}
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
  borderBottom: '2px solid var(--border)', background: 'var(--table-header-bg)',
};
const tdStyle = { padding: '12px 16px', fontSize: 14 };
const fieldGrid = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 };
const labelStyle = { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' };
const inputStyle = {
  padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)',
  fontSize: 14, background: 'var(--input-bg)', color: 'var(--text)', outline: 'none',
  fontFamily: 'inherit',
};
