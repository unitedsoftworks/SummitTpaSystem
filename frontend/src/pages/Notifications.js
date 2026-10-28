import React, { useEffect, useState } from 'react';
import api from '../api/client';

const typeConfig = {
  info: { icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z', bg: '#dbeafe', color: '#1d4ed8' },
  warning: { icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z', bg: '#fef9c3', color: '#a16207' },
  urgent: { icon: 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z', bg: '#fee2e2', color: '#dc2626' },
  success: { icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', bg: '#d1fae5', color: '#059669' },
  reminder: { icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9', bg: '#ede9fe', color: '#7c3aed' },
};

const catLabels = {
  enrollment: 'Enrollment',
  claims: 'Claims',
  billing: 'Billing',
  compliance: 'Compliance',
  cobra: 'COBRA',
  eligibility: 'Eligibility',
  system: 'System',
};

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [readFilter, setReadFilter] = useState('');

  const load = () => {
    const params = new URLSearchParams();
    if (categoryFilter) params.set('category', categoryFilter);
    if (readFilter) params.set('is_read', readFilter);
    api.get(`/notifications/?${params}`).then(r => setNotifications(r.data));
  };

  useEffect(load, [categoryFilter, readFilter]);

  const markRead = (id) => {
    api.post(`/notifications/${id}/mark_read/`).then(load);
  };

  const markAllRead = () => {
    api.post('/notifications/mark_all_read/').then(load);
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;
  const urgentCount = notifications.filter(n => n.notification_type === 'urgent' && !n.is_read).length;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 600, marginBottom: 4 }}>System</div>
          <h2 style={{ margin: '0 0 6px', fontSize: 24, fontWeight: 700 }}>
            Notifications
            {unreadCount > 0 && (
              <span style={{
                marginLeft: 10, fontSize: 14, fontWeight: 700,
                background: '#ef4444', color: '#fff',
                padding: '2px 10px', borderRadius: 20, verticalAlign: 'middle',
              }}>
                {unreadCount}
              </span>
            )}
          </h2>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--text-secondary)', maxWidth: 600 }}>
            System alerts, reminders, and action items across all modules.
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            style={{
              padding: '10px 20px', borderRadius: 8, border: '1px solid var(--border)',
              background: 'var(--card)', color: 'var(--text)', fontSize: 14,
              fontWeight: 600, cursor: 'pointer',
            }}
          >
            Mark All Read
          </button>
        )}
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Total', value: notifications.length, color: '#3b82f6' },
          { label: 'Unread', value: unreadCount, color: '#f59e0b' },
          { label: 'Urgent', value: urgentCount, color: '#ef4444' },
          { label: 'Actionable', value: notifications.filter(n => n.is_actionable && !n.is_read).length, color: '#7c3aed' },
        ].map((s, i) => (
          <div key={i} style={cardStyle}>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500, marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <select value={readFilter} onChange={e => setReadFilter(e.target.value)} style={selectStyle}>
          <option value="">All</option>
          <option value="false">Unread</option>
          <option value="true">Read</option>
        </select>
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} style={selectStyle}>
          <option value="">All categories</option>
          {Object.entries(catLabels).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      {/* Notification list */}
      <div style={{ display: 'grid', gap: 8 }}>
        {notifications.map(n => {
          const tc = typeConfig[n.notification_type] || typeConfig.info;
          return (
            <div key={n.id} style={{
              ...cardStyle, padding: '16px 20px',
              display: 'flex', gap: 16, alignItems: 'flex-start',
              opacity: n.is_read ? 0.7 : 1,
              borderLeft: n.is_read ? undefined : `3px solid ${tc.color}`,
            }}>
              <div style={{
                width: 38, height: 38, borderRadius: 10,
                background: tc.bg, display: 'flex',
                alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2,
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={tc.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d={tc.icon} />
                </svg>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 15, fontWeight: n.is_read ? 500 : 700 }}>{n.title}</span>
                  <span style={{
                    padding: '1px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700,
                    background: tc.bg, color: tc.color, textTransform: 'uppercase',
                  }}>
                    {n.notification_type}
                  </span>
                  <span style={{
                    padding: '1px 8px', borderRadius: 10, fontSize: 10, fontWeight: 600,
                    background: 'var(--border)', color: 'var(--text-secondary)',
                  }}>
                    {catLabels[n.category] || n.category}
                  </span>
                </div>
                <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 8 }}>
                  {n.message}
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {new Date(n.created_at).toLocaleString()}
                  </span>
                  {n.is_actionable && n.action_label && (
                    <button
                      onClick={() => alert(`Navigate to: ${n.action_url}`)}
                      style={{
                        padding: '4px 12px', borderRadius: 6, border: 'none',
                        background: tc.color, color: '#fff', fontSize: 12,
                        fontWeight: 600, cursor: 'pointer',
                      }}
                    >
                      {n.action_label}
                    </button>
                  )}
                  {!n.is_read && (
                    <button
                      onClick={() => markRead(n.id)}
                      style={{
                        padding: '4px 12px', borderRadius: 6, fontSize: 12,
                        border: '1px solid var(--border)', background: 'transparent',
                        color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 500,
                      }}
                    >
                      Mark read
                    </button>
                  )}
                </div>
              </div>
              {!n.is_read && (
                <div style={{
                  width: 8, height: 8, borderRadius: 4,
                  background: tc.color, flexShrink: 0, marginTop: 8,
                }} />
              )}
            </div>
          );
        })}
      </div>
      {notifications.length === 0 && (
        <div style={{ ...cardStyle, padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
          No notifications found.
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
