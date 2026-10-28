import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import Table from '../components/Table';
import StatusBadge from '../components/StatusBadge';

const emptyForm = {
  employer: '', first_name: '', last_name: '', email: '', date_of_birth: '',
  hire_date: '', ssn_last_four: '', gender: '', status: 'active',
  employment_class: 'full_time', job_title: '', department: '',
};

export default function Employees() {
  const [employees, setEmployees] = useState([]);
  const [employers, setEmployers] = useState([]);
  const [filter, setFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const load = () => {
    const params = filter ? { status: filter } : {};
    api.get('/employees/', { params }).then(r => setEmployees(r.data));
  };

  useEffect(() => {
    api.get('/employers/').then(r => setEmployers(r.data));
  }, []);

  useEffect(() => { load(); }, [filter]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.post('/employees/', form);
      setShowModal(false);
      setForm(emptyForm);
      load();
    } catch (err) {
      const data = err.response?.data;
      if (data) {
        const msgs = Object.entries(data).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`);
        setError(msgs.join(' | '));
      } else {
        setError('Failed to create employee.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 600, marginBottom: 4 }}>People</div>
          <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Employees</h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            {['', 'active', 'terminated', 'on_leave'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 6,
                  border: '1px solid var(--border)',
                  background: filter === f ? 'var(--accent)' : 'var(--card)',
                  color: filter === f ? '#fff' : 'var(--text)',
                  cursor: 'pointer',
                  fontSize: 13,
                }}
              >
                {f === '' ? 'All' : f.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </button>
            ))}
          </div>
          <button className="btn-primary" onClick={() => setShowModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14m-7-7h14"/></svg>
            Add Employee
          </button>
        </div>
      </div>

      <Table
        columns={[
          { key: 'full_name', label: 'Name' },
          { key: 'employer_name', label: 'Employer' },
          { key: 'email', label: 'Email' },
          { key: 'hire_date', label: 'Hire Date' },
          { key: 'status', label: 'Status', render: v => <StatusBadge status={v} /> },
        ]}
        data={employees}
        onRowClick={row => navigate(`/staff/employees/${row.id}`)}
      />

      {employees.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" style={{ marginBottom: 16, opacity: 0.5 }}>
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2m22-4l-5 5 5 5M9 7a4 4 0 110-8 4 4 0 010 8z"/>
          </svg>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>No employees yet</div>
          <div style={{ fontSize: 14, marginBottom: 16 }}>Click "Add Employee" to create your first employee record.</div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div style={overlay} onClick={() => setShowModal(false)}>
          <div style={modal} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Add Employee</h3>
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
                Employer *
                <select required value={form.employer} onChange={e => set('employer', e.target.value)} style={inputStyle}>
                  <option value="">Select employer...</option>
                  {employers.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
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
                  Email *
                  <input type="email" required value={form.email} onChange={e => set('email', e.target.value)} style={inputStyle} placeholder="employee@company.com" />
                </label>
                <label style={labelStyle}>
                  SSN Last 4
                  <input type="text" maxLength={4} value={form.ssn_last_four} onChange={e => set('ssn_last_four', e.target.value.replace(/\D/g, ''))} style={inputStyle} placeholder="1234" />
                </label>
              </div>

              <div style={fieldGrid}>
                <label style={labelStyle}>
                  Date of Birth *
                  <input type="date" required value={form.date_of_birth} onChange={e => set('date_of_birth', e.target.value)} style={inputStyle} />
                </label>
                <label style={labelStyle}>
                  Hire Date *
                  <input type="date" required value={form.hire_date} onChange={e => set('hire_date', e.target.value)} style={inputStyle} />
                </label>
              </div>

              <div style={fieldGrid}>
                <label style={labelStyle}>
                  Gender
                  <select value={form.gender} onChange={e => set('gender', e.target.value)} style={inputStyle}>
                    <option value="">—</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </label>
                <label style={labelStyle}>
                  Employment Class
                  <select value={form.employment_class} onChange={e => set('employment_class', e.target.value)} style={inputStyle}>
                    <option value="full_time">Full-time</option>
                    <option value="part_time">Part-time</option>
                    <option value="seasonal">Seasonal</option>
                    <option value="temporary">Temporary</option>
                  </select>
                </label>
              </div>

              <div style={fieldGrid}>
                <label style={labelStyle}>
                  Job Title
                  <input type="text" value={form.job_title} onChange={e => set('job_title', e.target.value)} style={inputStyle} placeholder="e.g. Accountant" />
                </label>
                <label style={labelStyle}>
                  Department
                  <input type="text" value={form.department} onChange={e => set('department', e.target.value)} style={inputStyle} placeholder="e.g. Finance" />
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
                <button type="button" className="btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Creating...' : 'Create Employee'}
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
