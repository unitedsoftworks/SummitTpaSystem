import React, { useState } from 'react';

const reportCategories = [
  {
    name: 'Enrollment',
    icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
    color: '#3b82f6',
    reports: [
      { name: 'Enrollment Summary', description: 'Active enrollments by employer, plan type, and tier with member counts.', frequency: 'Monthly' },
      { name: 'Enrollment Change Log', description: 'All enrollment adds, terms, and changes within a date range.', frequency: 'Weekly' },
      { name: 'Open Enrollment Status', description: 'Progress tracking for annual open enrollment by employer.', frequency: 'Annual' },
      { name: 'Eligibility Verification', description: 'Current eligibility status for all members across carriers.', frequency: 'On demand' },
      { name: 'COBRA Tracking', description: 'Active COBRA participants, election deadlines, and payment status.', frequency: 'Monthly' },
    ],
  },
  {
    name: 'Financial',
    icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    color: '#16a34a',
    reports: [
      { name: 'Premium Billing Summary', description: 'Monthly premium amounts by employer with employer/employee split.', frequency: 'Monthly' },
      { name: 'Payment Reconciliation', description: 'Employer payments received vs. premiums billed with variances.', frequency: 'Monthly' },
      { name: 'Carrier Invoice Reconciliation', description: 'Carrier billed amounts vs. expected amounts with discrepancy detail.', frequency: 'Monthly' },
      { name: 'Deduction Schedule', description: 'Employee payroll deductions by employer for the current period.', frequency: 'Per pay period' },
      { name: 'Accounts Receivable Aging', description: 'Outstanding employer balances aged by 30/60/90+ days.', frequency: 'Monthly' },
      { name: 'Commission Report', description: 'Broker commissions earned by employer and plan.', frequency: 'Quarterly' },
    ],
  },
  {
    name: 'Claims',
    icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
    color: '#7c3aed',
    reports: [
      { name: 'Claims Activity', description: 'All claims received, processed, and paid within a date range.', frequency: 'Monthly' },
      { name: 'Claims by Provider', description: 'Claim volume and amounts grouped by provider with NPI.', frequency: 'Quarterly' },
      { name: 'Denied Claims', description: 'All denied claims with denial reasons and appeal status.', frequency: 'Monthly' },
      { name: 'Large Claims', description: 'Claims exceeding threshold amount for stop-loss reporting.', frequency: 'Monthly' },
      { name: 'Claims Lag Report', description: 'Time between service date and claim receipt/processing.', frequency: 'Monthly' },
    ],
  },
  {
    name: 'Census & Demographics',
    icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
    color: '#ea580c',
    reports: [
      { name: 'Employee Census', description: 'Complete employee roster with demographics, hire dates, and status.', frequency: 'On demand' },
      { name: 'Dependent Census', description: 'All dependents with relationship, age, and coverage details.', frequency: 'On demand' },
      { name: 'New Hire Report', description: 'Employees hired within a date range with enrollment status.', frequency: 'Monthly' },
      { name: 'Termination Report', description: 'Employees terminated within a date range with COBRA eligibility.', frequency: 'Monthly' },
    ],
  },
  {
    name: 'Compliance',
    icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
    color: '#dc2626',
    reports: [
      { name: 'ACA Compliance (1094/1095)', description: 'Affordable Care Act reporting data for applicable large employers.', frequency: 'Annual' },
      { name: 'HIPAA Audit Trail', description: 'Access log for protected health information.', frequency: 'On demand' },
      { name: 'Life Event Audit', description: 'Qualifying life events with documentation status and processing times.', frequency: 'Quarterly' },
      { name: '5500 Data Extract', description: 'Plan participation and financial data for Form 5500 filing.', frequency: 'Annual' },
    ],
  },
  {
    name: 'Reimbursements',
    icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z',
    color: '#0891b2',
    reports: [
      { name: 'Reimbursement Activity', description: 'HRA/FSA/HSA requests submitted, approved, and paid.', frequency: 'Monthly' },
      { name: 'Account Balances', description: 'Current HRA/FSA/HSA balances by employee.', frequency: 'On demand' },
      { name: 'Denied Reimbursements', description: 'Denied requests with reasons and ineligible expense categories.', frequency: 'Quarterly' },
    ],
  },
];

export default function Reports() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  const filteredCategories = reportCategories
    .map(cat => ({
      ...cat,
      reports: cat.reports.filter(r =>
        (!searchTerm || r.name.toLowerCase().includes(searchTerm.toLowerCase()) || r.description.toLowerCase().includes(searchTerm.toLowerCase())) &&
        (!selectedCategory || selectedCategory === cat.name)
      ),
    }))
    .filter(cat => cat.reports.length > 0);

  const totalReports = reportCategories.reduce((s, c) => s + c.reports.length, 0);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 600, marginBottom: 4 }}>Reports</div>
          <h2 style={{ margin: '0 0 6px', fontSize: 24, fontWeight: 700 }}>Report Catalog</h2>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--text-secondary)', maxWidth: 600 }}>
            {totalReports} reports available across {reportCategories.length} categories. Select a report to generate.
          </p>
        </div>
      </div>

      {/* Search and filter */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        <input
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          placeholder="Search reports..."
          style={{
            flex: 1, padding: '10px 14px', borderRadius: 8,
            border: '1px solid var(--border)', fontSize: 14,
            background: 'var(--card)', color: 'var(--text)', outline: 'none',
          }}
        />
        <select
          value={selectedCategory}
          onChange={e => setSelectedCategory(e.target.value)}
          style={{
            padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)',
            fontSize: 14, background: 'var(--card)', color: 'var(--text)', cursor: 'pointer', outline: 'none',
          }}
        >
          <option value="">All categories</option>
          {reportCategories.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
        </select>
      </div>

      {/* Category cards */}
      {!searchTerm && !selectedCategory && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32 }}>
          {reportCategories.map(cat => (
            <div
              key={cat.name}
              onClick={() => setSelectedCategory(cat.name)}
              style={{
                ...cardStyle, cursor: 'pointer',
                borderLeft: `3px solid ${cat.color}`,
                transition: 'transform 0.1s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 8,
                  background: `${cat.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={cat.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d={cat.icon} />
                  </svg>
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{cat.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{cat.reports.length} reports</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Report list */}
      {filteredCategories.map(cat => (
        <div key={cat.name} style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={cat.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d={cat.icon} />
            </svg>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{cat.name}</h3>
            {selectedCategory && (
              <button
                onClick={() => setSelectedCategory('')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', fontSize: 13, fontWeight: 600 }}
              >
                Show all
              </button>
            )}
          </div>
          <div style={{ display: 'grid', gap: 8 }}>
            {cat.reports.map(report => (
              <div key={report.name} style={{
                ...cardStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                cursor: 'pointer',
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                    <span style={{ fontWeight: 700, fontSize: 14 }}>{report.name}</span>
                    <span style={{
                      fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)',
                      background: 'var(--bg)', padding: '2px 8px', borderRadius: 4,
                    }}>
                      {report.frequency}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{report.description}</div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0, marginLeft: 16 }}>
                  <button className="btn-outline btn-sm" onClick={e => { e.stopPropagation(); alert(`Generating ${report.name}...`); }}>
                    Generate
                  </button>
                  <button className="btn-outline btn-xs" style={{ padding: '4px 8px' }} onClick={e => { e.stopPropagation(); alert(`Scheduling ${report.name}...`); }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {filteredCategories.length === 0 && (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
          No reports match your search.
        </div>
      )}
    </div>
  );
}

const cardStyle = {
  background: 'var(--card)',
  borderRadius: 'var(--radius-lg)',
  padding: '16px 20px',
  boxShadow: 'var(--card-shadow)',
  border: '1px solid var(--border)',
};
