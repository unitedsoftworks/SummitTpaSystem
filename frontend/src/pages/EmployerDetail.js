import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../api/client';
import StatCard from '../components/StatCard';
import Table from '../components/Table';
import StatusBadge from '../components/StatusBadge';

const emptyEmployee = {
  first_name: '', last_name: '', email: '', date_of_birth: '', hire_date: '',
  ssn_last_four: '', gender: '', status: 'active', employment_class: 'full_time',
  job_title: '', department: '',
};

export default function EmployerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [employer, setEmployer] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [plans, setPlans] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyEmployee);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadEmployer = () => api.get(`/employers/${id}/`).then(r => setEmployer(r.data));
  const loadEmployees = () => api.get(`/employees/?employer=${id}`).then(r => setEmployees(r.data));

  useEffect(() => {
    loadEmployer();
    loadEmployees();
    api.get(`/plans/?employer=${id}`).then(r => setPlans(r.data));
    api.get(`/invoices/?employer=${id}`).then(r => setInvoices(r.data));
  }, [id]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.post('/employees/', { ...form, employer: id });
      setShowModal(false);
      setForm(emptyEmployee);
      loadEmployees();
      loadEmployer();
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

  if (!employer) return <div style={{ padding: 40, color: 'var(--text-muted)' }}>Loading...</div>;

  const activeEmployees = employees.filter(e => e.status === 'active').length;

  return (
    <div>
      <Link to="/staff/employers" style={{ color: 'var(--accent)', textDecoration: 'none', fontSize: 14 }}>
        ← Back to Employers
      </Link>
      <h2 style={{ margin: '12px 0 24px', fontSize: 22, fontWeight: 700 }}>{employer.name}</h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
        <StatCard label="Active Employees" value={activeEmployees} color="#16a34a" />
        <StatCard label="Total Employees" value={employees.length} color="#3b82f6" />
        <StatCard label="Benefit Plans" value={plans.length} color="#7c3aed" />
        <StatCard label="Invoices" value={invoices.length} color="#ea580c" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
        <div style={cardStyle}>
          <h3 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 600 }}>Company Info</h3>
          <div style={{ fontSize: 14, lineHeight: 1.8 }}>
            <div><strong>EIN:</strong> {employer.ein}</div>
            <div><strong>Contact:</strong> {employer.contact_name}</div>
            <div><strong>Email:</strong> {employer.contact_email}</div>
            <div><strong>Phone:</strong> {employer.contact_phone}</div>
            <div style={{ whiteSpace: 'pre-line' }}><strong>Address:</strong> {employer.address}</div>
          </div>
        </div>
        <div style={cardStyle}>
          <h3 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 600 }}>Benefit Plans</h3>
          {plans.length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>No plans configured yet.</div>}
          {plans.map(p => (
            <div key={p.id} style={{
              padding: '8px 0',
              borderBottom: '1px solid var(--border)',
              fontSize: 14,
              display: 'flex',
              justifyContent: 'space-between',
            }}>
              <span>{p.name}</span>
              <span style={{ color: 'var(--text-secondary)' }}>${Number(p.monthly_premium).toLocaleString()}/mo</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Employees</h3>
        <button className="btn-primary btn-sm" onClick={() => setShowModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14m-7-7h14"/></svg>
          Add Employee
        </button>
      </div>
      <Table
        columns={[
          { key: 'full_name', label: 'Name' },
          { key: 'email', label: 'Email' },
          { key: 'job_title', label: 'Title' },
          { key: 'hire_date', label: 'Hire Date' },
          { key: 'status', label: 'Status', render: v => <StatusBadge status={v} /> },
        ]}
        data={employees}
        onRowClick={row => navigate(`/staff/employees/${row.id}`)}
      />
      {employees.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)', fontSize: 14 }}>
          No employees yet. Click "Add Employee" to add the first one.
        </div>
      )}

      {invoices.length > 0 && (
        <>
          <h3 style={{ margin: '24px 0 12px', fontSize: 16, fontWeight: 600 }}>Invoices</h3>
          <Table
            columns={[
              { key: 'invoice_number', label: 'Invoice #' },
              { key: 'carrier_name', label: 'Carrier' },
              { key: 'billed_amount', label: 'Billed', render: v => `$${Number(v).toLocaleString()}` },
              { key: 'expected_amount', label: 'Expected', render: v => `$${Number(v).toLocaleString()}` },
              { key: 'status', label: 'Status', render: v => <StatusBadge status={v} /> },
              { key: 'due_date', label: 'Due Date' },
            ]}
            data={invoices}
          />
        </>
      )}

      {/* Add Employee Modal */}
      {showModal && (
        <div style={overlay} onClick={() => setShowModal(false)}>
          <div style={modal} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Add Employee</h3>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>to {employer.name}</div>
              </div>
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

const cardStyle = {
  background: 'var(--card)', borderRadius: 'var(--radius-lg)',
  padding: 20, boxShadow: 'var(--card-shadow)', border: '1px solid var(--border)',
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
