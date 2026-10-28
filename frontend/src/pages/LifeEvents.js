import React, { useEffect, useState } from 'react';
import api from '../api/client';
import StatusBadge from '../components/StatusBadge';

export default function LifeEvents() {
  const [events, setEvents] = useState([]);
  const [filter, setFilter] = useState('');
  const [showApprove, setShowApprove] = useState(null);

  const load = () => {
    const params = {};
    if (filter) params.status = filter;
    api.get('/life-events/', { params }).then(r => setEvents(r.data));
  };

  useEffect(load, [filter]);

  const updateEvent = async (id, data) => {
    await api.patch(`/life-events/${id}/`, data);
    setShowApprove(null);
    load();
  };

  const pendingCount = events.filter(e => e.status === 'pending').length;

  const tabs = [
    { key: '', label: 'All', count: events.length },
    { key: 'pending', label: 'Pending', count: pendingCount },
    { key: 'approved', label: 'Approved' },
    { key: 'completed', label: 'Completed' },
    { key: 'denied', label: 'Denied' },
  ];

  const eventTypeIcons = {
    marriage: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z',
    divorce: 'M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636',
    birth: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
    death: 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    loss_coverage: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
    gain_coverage: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
    address_change: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z',
    job_change: 'M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
    other: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  };

  const statusColors = {
    pending: '#f59e0b',
    approved: '#3b82f6',
    completed: '#16a34a',
    denied: '#ef4444',
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 600, marginBottom: 4 }}>Member Service</div>
          <h2 style={{ margin: '0 0 6px', fontSize: 24, fontWeight: 700 }}>Life Events</h2>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--text-secondary)', maxWidth: 600 }}>
            Qualifying life events that trigger special enrollment periods. {pendingCount} pending review.
          </p>
        </div>
        <button className="btn-primary" style={{ whiteSpace: 'nowrap' }}>+ Report event</button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
        {[
          { label: 'Pending review', value: pendingCount, color: '#f59e0b' },
          { label: 'Approved', value: events.filter(e => e.status === 'approved').length, color: '#3b82f6' },
          { label: 'Completed', value: events.filter(e => e.status === 'completed').length, color: '#16a34a' },
          { label: 'Missing docs', value: events.filter(e => !e.documentation_received && e.status === 'pending').length, color: '#ef4444' },
        ].map((s, i) => (
          <div key={i} style={cardStyle}>
            <div style={{ fontSize: 28, fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)', marginBottom: 20 }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setFilter(t.key)} style={{
            padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer',
            fontSize: 13, fontWeight: 600,
            color: filter === t.key ? 'var(--text)' : 'var(--text-secondary)',
            borderBottom: filter === t.key ? '2px solid var(--accent)' : '2px solid transparent',
            marginBottom: -1,
          }}>
            {t.label}{t.count !== undefined ? ` (${t.count})` : ''}
          </button>
        ))}
      </div>

      {/* Events list */}
      <div style={{ display: 'grid', gap: 12 }}>
        {events.map(evt => (
          <div key={evt.id} style={{ ...cardStyle, display: 'flex', gap: 16, alignItems: 'flex-start' }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: `${statusColors[evt.status]}15`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={statusColors[evt.status]} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d={eventTypeIcons[evt.event_type] || eventTypeIcons.other} />
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontWeight: 700, fontSize: 15 }}>{evt.event_type_display}</span>
                  <StatusBadge status={evt.status} />
                  {!evt.documentation_received && evt.status === 'pending' && (
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#ef4444', background: '#fef2f2', padding: '2px 8px', borderRadius: 4 }}>
                      DOCS NEEDED
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {evt.status === 'pending' && (
                    <>
                      <button className="btn-primary btn-xs" onClick={() => updateEvent(evt.id, { status: 'approved', effective_date: evt.event_date })}>Approve</button>
                      <button className="btn-outline btn-xs" onClick={() => updateEvent(evt.id, { status: 'denied' })}>Deny</button>
                    </>
                  )}
                  {evt.status === 'approved' && (
                    <button className="btn-primary btn-xs" onClick={() => updateEvent(evt.id, { status: 'completed' })}>Mark complete</button>
                  )}
                </div>
              </div>
              <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 4 }}>
                <strong>{evt.employee_name}</strong> · {evt.employer_name}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>{evt.description}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', gap: 16 }}>
                <span>Event date: {evt.event_date}</span>
                {evt.effective_date && <span>Effective: {evt.effective_date}</span>}
                {evt.reviewed_by && <span>Reviewed by: {evt.reviewed_by}</span>}
              </div>
            </div>
          </div>
        ))}
        {events.length === 0 && (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>No life events found.</div>
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
