import React, { useEffect, useState } from 'react';
import api from '../api/client';

const statusColors = {
  draft: { bg: '#f3f4f6', color: '#374151', label: 'Draft' },
  upcoming: { bg: '#dbeafe', color: '#1d4ed8', label: 'Upcoming' },
  open: { bg: '#d1fae5', color: '#059669', label: 'Open' },
  closed: { bg: '#fef9c3', color: '#a16207', label: 'Closed' },
  completed: { bg: '#ede9fe', color: '#6d28d9', label: 'Completed' },
};

export default function OpenEnrollment() {
  const [periods, setPeriods] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [employers, setEmployers] = useState([]);
  const [employerFilter, setEmployerFilter] = useState('');

  useEffect(() => {
    api.get('/employers/').then(r => setEmployers(r.data));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    if (employerFilter) params.set('employer', employerFilter);
    api.get(`/open-enrollment/?${params}`).then(r => setPeriods(r.data));
  }, [statusFilter, employerFilter]);

  const stats = {
    total: periods.length,
    open: periods.filter(p => p.status === 'open').length,
    upcoming: periods.filter(p => p.status === 'upcoming').length,
    completed: periods.filter(p => p.status === 'completed').length,
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 600, marginBottom: 4 }}>Enrollment</div>
          <h2 style={{ margin: '0 0 6px', fontSize: 24, fontWeight: 700 }}>Open Enrollment Periods</h2>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--text-secondary)', maxWidth: 600 }}>
            Manage annual and special enrollment windows for all employer groups.
          </p>
        </div>
        <button
          onClick={() => alert('Create new enrollment period flow would go here')}
          style={{
            padding: '10px 20px', borderRadius: 8, border: 'none',
            background: 'var(--accent)', color: '#fff', fontSize: 14,
            fontWeight: 600, cursor: 'pointer',
          }}
        >
          + New Period
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Total periods', value: stats.total, color: '#3b82f6' },
          { label: 'Currently open', value: stats.open, color: '#059669' },
          { label: 'Upcoming', value: stats.upcoming, color: '#1d4ed8' },
          { label: 'Completed', value: stats.completed, color: '#7c3aed' },
        ].map((s, i) => (
          <div key={i} style={cardStyle}>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500, marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={selectStyle}>
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="upcoming">Upcoming</option>
          <option value="open">Open</option>
          <option value="closed">Closed</option>
          <option value="completed">Completed</option>
        </select>
        <select value={employerFilter} onChange={e => setEmployerFilter(e.target.value)} style={selectStyle}>
          <option value="">All employers</option>
          {employers.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
      </div>

      {/* Period cards */}
      <div style={{ display: 'grid', gap: 16 }}>
        {periods.map(p => {
          const sc = statusColors[p.status] || statusColors.draft;
          const daysLeft = p.status === 'open'
            ? Math.max(0, Math.ceil((new Date(p.enrollment_end) - new Date()) / (1000 * 60 * 60 * 24)))
            : null;
          return (
            <div key={p.id} style={{ ...cardStyle, padding: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                    <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>{p.name}</h3>
                    <span style={{
                      padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700,
                      background: sc.bg, color: sc.color,
                    }}>
                      {sc.label}
                    </span>
                  </div>
                  <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{p.employer_name}</div>
                </div>
                {daysLeft !== null && (
                  <div style={{
                    background: daysLeft <= 7 ? '#fee2e2' : '#dbeafe',
                    color: daysLeft <= 7 ? '#dc2626' : '#1d4ed8',
                    padding: '6px 14px', borderRadius: 8, fontSize: 13, fontWeight: 700,
                  }}>
                    {daysLeft} days left
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 16 }}>
                <div>
                  <div style={labelStyle}>PLAN YEAR</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{p.plan_year_start} — {p.plan_year_end}</div>
                </div>
                <div>
                  <div style={labelStyle}>ENROLLMENT WINDOW</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{p.enrollment_start} — {p.enrollment_end}</div>
                </div>
                <div>
                  <div style={labelStyle}>ELIGIBLE</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{p.eligible_employees} employees</div>
                </div>
                <div>
                  <div style={labelStyle}>COMPLETION</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: p.completion_pct === 100 ? '#059669' : 'var(--text)' }}>
                    {p.completion_pct}%
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>
                  <span>{p.enrolled_employees} enrolled, {p.waived_employees} waived</span>
                  <span>{p.eligible_employees - p.enrolled_employees - p.waived_employees} remaining</span>
                </div>
                <div style={{ height: 8, background: 'var(--border)', borderRadius: 4, overflow: 'hidden', display: 'flex' }}>
                  {p.enrolled_employees > 0 && (
                    <div style={{
                      width: `${(p.enrolled_employees / Math.max(p.eligible_employees, 1)) * 100}%`,
                      background: '#16a34a', height: '100%',
                    }} />
                  )}
                  {p.waived_employees > 0 && (
                    <div style={{
                      width: `${(p.waived_employees / Math.max(p.eligible_employees, 1)) * 100}%`,
                      background: '#f59e0b', height: '100%',
                    }} />
                  )}
                </div>
                <div style={{ display: 'flex', gap: 16, fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: '#16a34a', display: 'inline-block' }} /> Enrolled
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: '#f59e0b', display: 'inline-block' }} /> Waived
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--border)', display: 'inline-block' }} /> Remaining
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {periods.length === 0 && (
        <div style={{ ...cardStyle, padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
          No enrollment periods found matching filters.
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

const selectStyle = {
  padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)',
  fontSize: 14, background: 'var(--card)', color: 'var(--text)', cursor: 'pointer', outline: 'none',
};

const labelStyle = {
  fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 4, letterSpacing: '0.5px',
};
