import React, { useEffect, useState } from 'react';
import api from '../api/client';
import StatCard from '../components/StatCard';
import Table from '../components/Table';
import StatusBadge from '../components/StatusBadge';

export default function EmployerPortal({ section }) {
  const [employers, setEmployers] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [data, setData] = useState(null);
  const [plans, setPlans] = useState([]);

  useEffect(() => {
    api.get('/employers/').then(r => {
      setEmployers(r.data);
      if (r.data.length > 0) setSelectedId(String(r.data[0].id));
    });
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    setData(null);
    api.get(`/employer-portal/${selectedId}/`).then(r => setData(r.data));
    api.get(`/plans/?employer=${selectedId}`).then(r => setPlans(r.data));
  }, [selectedId]);

  if (!data) return (
    <div style={{ padding: 40, color: 'var(--text-muted)' }}>Loading...</div>
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700 }}>
            {!section ? 'Employer Dashboard' : section === 'employees' ? 'Employees' : section === 'enrollments' ? 'Enrollments' : section === 'invoices' ? 'Invoices & Payments' : 'Deduction Schedule'}
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, margin: 0 }}>
            {data.employer.name}
          </p>
        </div>
        <div style={{
          background: 'var(--card)',
          borderRadius: 'var(--radius)',
          padding: '8px 16px',
          border: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>EMPLOYER:</label>
          <select
            value={selectedId}
            onChange={e => setSelectedId(e.target.value)}
            style={{ minWidth: 220, border: 'none', fontSize: 14, fontWeight: 600, background: 'transparent' }}
          >
            {employers.map(emp => (
              <option key={emp.id} value={emp.id}>{emp.name}</option>
            ))}
          </select>
        </div>
      </div>

      {(!section) ? (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
            <StatCard label="Active Employees" value={data.summary.total_employees} color="#16a34a" />
            <StatCard label="Active Enrollments" value={data.summary.active_enrollments} color="#3b82f6" />
            <StatCard label="Monthly Premium" value={`$${Number(data.summary.total_monthly_premiums).toLocaleString()}`} color="#7c3aed" />
            <StatCard label="Outstanding Invoices" value={data.summary.outstanding_invoices} color="#ea580c" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
            <div style={{ background: 'var(--card)', borderRadius: 'var(--radius-lg)', padding: 24, boxShadow: 'var(--card-shadow)' }}>
              <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700 }}>Company Information</h3>
              <div style={{ fontSize: 14, lineHeight: 2 }}>
                <div><span style={{ color: 'var(--text-secondary)' }}>EIN:</span> {data.employer.ein}</div>
                <div><span style={{ color: 'var(--text-secondary)' }}>Contact:</span> {data.employer.contact_name}</div>
                <div><span style={{ color: 'var(--text-secondary)' }}>Email:</span> {data.employer.contact_email}</div>
                <div><span style={{ color: 'var(--text-secondary)' }}>Phone:</span> {data.employer.contact_phone}</div>
                {data.employer.association_name && (
                  <div><span style={{ color: 'var(--text-secondary)' }}>Association:</span> {data.employer.association_name}</div>
                )}
                {data.employer.broker_name && (
                  <div><span style={{ color: 'var(--text-secondary)' }}>Broker:</span> {data.employer.broker_name}</div>
                )}
              </div>
            </div>
            <div style={{ background: 'var(--card)', borderRadius: 'var(--radius-lg)', padding: 24, boxShadow: 'var(--card-shadow)' }}>
              <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700 }}>Benefit Plans</h3>
              {plans.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>No plans found</div>
              ) : plans.map(p => (
                <div key={p.id} style={{
                  padding: '10px 0',
                  borderBottom: '1px solid var(--border)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: 14,
                }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{p.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{p.carrier_name} &middot; {p.plan_type}</div>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: 13 }}>
                    <div style={{ fontWeight: 600 }}>${Number(p.monthly_premium).toLocaleString()}/mo</div>
                    <div style={{ color: 'var(--green)', fontSize: 12 }}>ER: ${Number(p.employer_contribution).toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
            <StatCard label="Employer Contribution" value={`$${Number(data.summary.employer_contribution).toLocaleString()}/mo`} color="#16a34a" sub="Your share of monthly premiums" />
            <StatCard label="Employee Deductions" value={`$${Number(data.summary.total_monthly_deductions).toLocaleString()}/mo`} color="#dc2626" sub="Withheld from employee payroll" />
          </div>

          <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 700 }}>Employees</h3>
          <Table
            columns={[
              { key: 'full_name', label: 'Name' },
              { key: 'email', label: 'Email' },
              { key: 'hire_date', label: 'Hire Date' },
              { key: 'status', label: 'Status', render: v => <StatusBadge status={v} /> },
            ]}
            data={data.employees.slice(0, 10)}
          />
        </>
      ) : section === 'employees' ? (
        <Table
          columns={[
            { key: 'full_name', label: 'Name' },
            { key: 'email', label: 'Email' },
            { key: 'date_of_birth', label: 'DOB' },
            { key: 'hire_date', label: 'Hire Date' },
            { key: 'status', label: 'Status', render: v => <StatusBadge status={v} /> },
          ]}
          data={data.employees}
        />
      ) : section === 'enrollments' ? (
        <Table
          columns={[
            { key: 'employee_name', label: 'Employee' },
            { key: 'plan_name', label: 'Plan' },
            { key: 'carrier_name', label: 'Carrier' },
            { key: 'effective_date', label: 'Effective' },
            { key: 'employee_deduction', label: 'EE Deduction', render: v => `$${Number(v).toLocaleString()}` },
            { key: 'status', label: 'Status', render: v => <StatusBadge status={v} /> },
          ]}
          data={data.enrollments}
        />
      ) : section === 'invoices' ? (
        <Table
          columns={[
            { key: 'invoice_number', label: 'Invoice #' },
            { key: 'carrier_name', label: 'Carrier' },
            { key: 'billing_period_start', label: 'Period' },
            { key: 'billed_amount', label: 'Billed', render: v => `$${Number(v).toLocaleString()}` },
            { key: 'expected_amount', label: 'Expected', render: v => `$${Number(v).toLocaleString()}` },
            { key: 'status', label: 'Status', render: v => <StatusBadge status={v} /> },
            { key: 'due_date', label: 'Due Date' },
          ]}
          data={data.invoices}
        />
      ) : section === 'deductions' ? (
        <Table
          columns={[
            { key: 'employee_name', label: 'Employee' },
            { key: 'plan_name', label: 'Plan' },
            { key: 'period_start', label: 'Period Start' },
            { key: 'period_end', label: 'Period End' },
            { key: 'amount', label: 'Amount', render: v => `$${Number(v).toLocaleString()}` },
            { key: 'status', label: 'Status', render: v => <StatusBadge status={v} /> },
          ]}
          data={data.deductions}
        />
      ) : null}
    </div>
  );
}
