import React, { useEffect, useState } from 'react';
import api from '../api/client';

const filingTypes = [
  { key: '5500', label: 'Form 5500', desc: 'Annual return/report for employee benefit plan', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  { key: 'sbc', label: 'SBC Distribution', desc: 'Summary of Benefits & Coverage to participants', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
  { key: 'cobra', label: 'COBRA Notices', desc: 'General & qualifying event notices', icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z' },
  { key: 'hipaa', label: 'HIPAA Privacy', desc: 'Privacy practices notice distribution', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
  { key: 'aca', label: 'ACA Reporting', desc: 'Forms 1094-C and 1095-C filings', icon: 'M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z' },
  { key: 'spd', label: 'SPD Updates', desc: 'Summary Plan Description maintenance', icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z' },
];

export default function Compliance() {
  const [employers, setEmployers] = useState([]);
  const [documents, setDocuments] = useState([]);

  useEffect(() => {
    api.get('/employers/').then(r => setEmployers(r.data));
    api.get('/documents/?document_type=compliance').then(r => setDocuments(r.data));
  }, []);

  const deadlines = employers.flatMap(emp => [
    { employer: emp.name, employer_id: emp.id, type: '5500', label: 'Form 5500', due: '2027-07-31', status: 'upcoming', priority: 'normal' },
    { employer: emp.name, employer_id: emp.id, type: 'aca', label: 'ACA 1095-C', due: '2027-03-02', status: 'completed', priority: 'normal' },
    { employer: emp.name, employer_id: emp.id, type: 'sbc', label: 'SBC Distribution', due: '2027-01-01', status: emp.id <= 2 ? 'completed' : 'overdue', priority: emp.id <= 2 ? 'normal' : 'high' },
    { employer: emp.name, employer_id: emp.id, type: 'cobra', label: 'COBRA General Notice', due: '2026-12-31', status: 'completed', priority: 'normal' },
  ]);

  const overdue = deadlines.filter(d => d.status === 'overdue').length;
  const upcoming = deadlines.filter(d => d.status === 'upcoming').length;
  const completed = deadlines.filter(d => d.status === 'completed').length;

  const statusBadge = (status) => {
    const c = {
      completed: { bg: '#d1fae5', color: '#059669' },
      upcoming: { bg: '#dbeafe', color: '#1d4ed8' },
      overdue: { bg: '#fee2e2', color: '#dc2626' },
      in_progress: { bg: '#fef9c3', color: '#a16207' },
    }[status] || { bg: '#f3f4f6', color: '#6b7280' };
    return (
      <span style={{
        padding: '3px 10px', borderRadius: 10, fontSize: 11, fontWeight: 700,
        background: c.bg, color: c.color, textTransform: 'capitalize',
      }}>
        {status.replace('_', ' ')}
      </span>
    );
  };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 600, marginBottom: 4 }}>Administration</div>
        <h2 style={{ margin: '0 0 6px', fontSize: 24, fontWeight: 700 }}>Compliance Dashboard</h2>
        <p style={{ margin: 0, fontSize: 14, color: 'var(--text-secondary)', maxWidth: 600 }}>
          Track regulatory filings, deadlines, and compliance status across all employer groups.
        </p>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 28 }}>
        {[
          { label: 'Total Filings', value: deadlines.length, color: '#3b82f6' },
          { label: 'Overdue', value: overdue, color: '#dc2626' },
          { label: 'Upcoming', value: upcoming, color: '#f59e0b' },
          { label: 'Completed', value: completed, color: '#059669' },
        ].map((s, i) => (
          <div key={i} style={cardStyle}>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500, marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filing types overview */}
      <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Filing Requirements</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 32 }}>
        {filingTypes.map(ft => (
          <div key={ft.key} style={{ ...cardStyle, display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: '#3b82f610', display: 'flex',
              alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d={ft.icon} />
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>{ft.label}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.4 }}>{ft.desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Deadline tracker */}
      <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Deadline Tracker</h3>
      <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={thStyle}>Employer</th>
              <th style={thStyle}>Filing</th>
              <th style={thStyle}>Due Date</th>
              <th style={thStyle}>Days</th>
              <th style={thStyle}>Status</th>
            </tr>
          </thead>
          <tbody>
            {deadlines
              .sort((a, b) => {
                const order = { overdue: 0, upcoming: 1, in_progress: 2, completed: 3 };
                return (order[a.status] ?? 4) - (order[b.status] ?? 4);
              })
              .map((d, i) => {
                const days = Math.ceil((new Date(d.due) - new Date()) / (1000 * 60 * 60 * 24));
                return (
                  <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={tdStyle}>{d.employer}</td>
                    <td style={tdStyle}>
                      <span style={{ fontWeight: 600 }}>{d.label}</span>
                    </td>
                    <td style={tdStyle}>{d.due}</td>
                    <td style={tdStyle}>
                      <span style={{
                        fontWeight: 600,
                        color: d.status === 'overdue' ? '#dc2626' : d.status === 'completed' ? 'var(--text-muted)' : days <= 30 ? '#f59e0b' : 'var(--text-secondary)',
                      }}>
                        {d.status === 'completed' ? '—' : days < 0 ? `${Math.abs(days)}d overdue` : `${days}d`}
                      </span>
                    </td>
                    <td style={tdStyle}>{statusBadge(d.status)}</td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {/* Compliance documents */}
      {documents.length > 0 && (
        <>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginTop: 32, marginBottom: 12 }}>Compliance Documents</h3>
          <div style={{ display: 'grid', gap: 8 }}>
            {documents.map(doc => (
              <div key={doc.id} style={{ ...cardStyle, padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1d4ed8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span style={{ flex: 1, fontSize: 14, fontWeight: 500 }}>{doc.title}</span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{doc.file_size_display}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

const cardStyle = {
  background: 'var(--card)', borderRadius: 'var(--radius-lg)',
  padding: '16px 20px', boxShadow: 'var(--card-shadow)', border: '1px solid var(--border)',
};
const thStyle = {
  padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700,
  color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px',
  borderBottom: '2px solid var(--border)', background: '#f8fafc',
};
const tdStyle = { padding: '12px 16px', fontSize: 14 };
