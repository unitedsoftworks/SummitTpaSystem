import React, { useEffect, useState } from 'react';
import api from '../api/client';
import StatusBadge from '../components/StatusBadge';

const eventColors = {
  termination: { bg: '#fee2e2', color: '#dc2626' },
  hours_reduction: { bg: '#fef9c3', color: '#a16207' },
  divorce: { bg: '#ede9fe', color: '#6d28d9' },
  death: { bg: '#f3f4f6', color: '#374151' },
  medicare: { bg: '#dbeafe', color: '#1d4ed8' },
  dependent_age: { bg: '#d1fae5', color: '#059669' },
};

const paymentColors = {
  na: { bg: 'var(--border)', color: 'var(--text-secondary)' },
  current: { bg: '#d1fae5', color: '#059669' },
  late: { bg: '#fef9c3', color: '#a16207' },
  lapsed: { bg: '#fee2e2', color: '#dc2626' },
};

export default function CobraAdmin() {
  const [events, setEvents] = useState([]);
  const [electionFilter, setElectionFilter] = useState('');
  const [eventFilter, setEventFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');

  useEffect(() => {
    const params = new URLSearchParams();
    if (electionFilter) params.set('election_status', electionFilter);
    if (eventFilter) params.set('qualifying_event', eventFilter);
    if (paymentFilter) params.set('payment_status', paymentFilter);
    api.get(`/cobra-events/?${params}`).then(r => setEvents(r.data));
  }, [electionFilter, eventFilter, paymentFilter]);

  const stats = {
    total: events.length,
    pending: events.filter(e => e.election_status === 'pending').length,
    elected: events.filter(e => e.election_status === 'elected').length,
    current: events.filter(e => e.payment_status === 'current').length,
    late: events.filter(e => e.payment_status === 'late').length,
    totalPremium: events.filter(e => e.election_status === 'elected')
      .reduce((s, e) => s + Number(e.total_monthly_cost || 0), 0),
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 600, marginBottom: 4 }}>Compliance</div>
          <h2 style={{ margin: '0 0 6px', fontSize: 24, fontWeight: 700 }}>COBRA Administration</h2>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--text-secondary)', maxWidth: 600 }}>
            Track qualifying events, election periods, and continuation coverage payments.
          </p>
        </div>
        <button
          className="btn-primary"
          onClick={() => alert('New COBRA qualifying event flow would go here')}
          style={{
            padding: '10px 20px', borderRadius: 8, border: 'none',
            background: 'var(--accent)', color: '#fff', fontSize: 14,
            fontWeight: 600, cursor: 'pointer',
          }}
        >
          + New Qualifying Event
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Total events', value: stats.total, color: '#3b82f6' },
          { label: 'Pending election', value: stats.pending, color: '#f59e0b' },
          { label: 'Elected', value: stats.elected, color: '#16a34a' },
          { label: 'Payments current', value: stats.current, color: '#059669' },
          { label: 'Payments late', value: stats.late, color: '#ef4444' },
          { label: 'Monthly revenue', value: `$${stats.totalPremium.toLocaleString()}`, color: '#7c3aed' },
        ].map((s, i) => (
          <div key={i} style={cardStyle}>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500, marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <select value={electionFilter} onChange={e => setElectionFilter(e.target.value)} style={selectStyle}>
          <option value="">All election statuses</option>
          <option value="pending">Pending</option>
          <option value="elected">Elected</option>
          <option value="declined">Declined</option>
          <option value="expired">Expired</option>
        </select>
        <select value={eventFilter} onChange={e => setEventFilter(e.target.value)} style={selectStyle}>
          <option value="">All event types</option>
          <option value="termination">Termination</option>
          <option value="hours_reduction">Reduction in Hours</option>
          <option value="divorce">Divorce / Separation</option>
          <option value="death">Death of Employee</option>
          <option value="medicare">Medicare Entitlement</option>
          <option value="dependent_age">Dependent Aging Out</option>
        </select>
        <select value={paymentFilter} onChange={e => setPaymentFilter(e.target.value)} style={selectStyle}>
          <option value="">All payment statuses</option>
          <option value="current">Current</option>
          <option value="late">Late</option>
          <option value="lapsed">Lapsed</option>
          <option value="na">N/A</option>
        </select>
      </div>

      {/* Events table */}
      <div style={cardStyle}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={thStyle}>EVENT DATE</th>
              <th style={thStyle}>QUALIFYING EVENT</th>
              <th style={thStyle}>EMPLOYEE</th>
              <th style={thStyle}>EMPLOYER</th>
              <th style={thStyle}>ELECTION</th>
              <th style={thStyle}>DEADLINE</th>
              <th style={thStyle}>COVERAGE</th>
              <th style={thStyle}>PREMIUM</th>
              <th style={thStyle}>PAYMENT</th>
            </tr>
          </thead>
          <tbody>
            {events.map(evt => {
              const ec = eventColors[evt.qualifying_event] || eventColors.termination;
              const pc = paymentColors[evt.payment_status] || paymentColors.na;
              const isOverdue = evt.election_status === 'pending' && new Date(evt.election_deadline) < new Date();
              return (
                <tr key={evt.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ ...tdStyle, whiteSpace: 'nowrap', fontSize: 13, color: 'var(--text-secondary)' }}>
                    {evt.event_date}
                  </td>
                  <td style={tdStyle}>
                    <span style={{
                      padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700,
                      background: ec.bg, color: ec.color, whiteSpace: 'nowrap',
                    }}>
                      {evt.qualifying_event_display}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{evt.employee_name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      {evt.qualified_beneficiaries} beneficiar{evt.qualified_beneficiaries === 1 ? 'y' : 'ies'}
                    </div>
                  </td>
                  <td style={{ ...tdStyle, fontSize: 13 }}>{evt.employer_name}</td>
                  <td style={tdStyle}>
                    <StatusBadge status={evt.election_status} />
                  </td>
                  <td style={tdStyle}>
                    <div style={{ fontSize: 13, color: isOverdue ? '#ef4444' : 'var(--text-secondary)', fontWeight: isOverdue ? 700 : 400 }}>
                      {evt.election_deadline}
                      {isOverdue && <div style={{ fontSize: 11, color: '#ef4444' }}>OVERDUE</div>}
                    </div>
                  </td>
                  <td style={{ ...tdStyle, fontSize: 13 }}>
                    {evt.coverage_start ? (
                      <div>
                        <div>{evt.coverage_start}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>to {evt.coverage_end}</div>
                      </div>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>—</span>
                    )}
                  </td>
                  <td style={{ ...tdStyle, fontWeight: 600, fontSize: 14 }}>
                    ${Number(evt.total_monthly_cost).toLocaleString()}
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 400 }}>
                      ${Number(evt.monthly_premium).toLocaleString()} + {Number(evt.admin_fee_pct)}% admin
                    </div>
                  </td>
                  <td style={tdStyle}>
                    <span style={{
                      padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700,
                      background: pc.bg, color: pc.color,
                    }}>
                      {evt.payment_status === 'na' ? 'N/A' : evt.payment_status.charAt(0).toUpperCase() + evt.payment_status.slice(1)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {events.length === 0 && (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
            No COBRA events found matching filters.
          </div>
        )}
      </div>
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

const thStyle = {
  padding: '8px 12px', fontSize: 11, fontWeight: 700,
  color: 'var(--text-secondary)', textAlign: 'left',
  borderBottom: '1px solid var(--border)',
};

const tdStyle = { padding: '10px 12px', fontSize: 14 };
