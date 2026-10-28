import React, { useEffect, useState } from 'react';
import api from '../api/client';
import StatusBadge from '../components/StatusBadge';

export default function Messages() {
  const [messages, setMessages] = useState([]);
  const [filter, setFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [selected, setSelected] = useState(null);
  const [replyText, setReplyText] = useState('');

  const load = () => {
    const params = {};
    if (filter) params.status = filter;
    if (categoryFilter) params.category = categoryFilter;
    api.get('/messages/', { params }).then(r => setMessages(r.data));
  };

  useEffect(load, [filter, categoryFilter]);

  const updateStatus = async (id, status) => {
    await api.patch(`/messages/${id}/`, { status });
    load();
    if (selected?.id === id) setSelected({ ...selected, status });
  };

  const unreadCount = messages.filter(m => m.status === 'unread').length;
  const openCount = messages.filter(m => ['unread', 'read'].includes(m.status)).length;

  const tabs = [
    { key: '', label: 'All', count: messages.length },
    { key: 'unread', label: 'Unread', count: unreadCount },
    { key: 'read', label: 'Read' },
    { key: 'replied', label: 'Replied' },
    { key: 'closed', label: 'Closed' },
  ];

  const categoryLabels = {
    benefits: 'Benefits Question', claims: 'Claims Inquiry', enrollment: 'Enrollment',
    billing: 'Billing', general: 'General', complaint: 'Complaint',
  };

  const channelIcons = {
    portal: 'M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9',
    email: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
    phone: 'M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z',
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 600, marginBottom: 4 }}>Member Service</div>
          <h2 style={{ margin: '0 0 6px', fontSize: 24, fontWeight: 700 }}>Messages</h2>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--text-secondary)', maxWidth: 600 }}>
            Member inquiries from portal, email, and phone. {openCount} open, {unreadCount} unread.
          </p>
        </div>
        <button className="btn-primary" style={{ whiteSpace: 'nowrap' }}>+ New message</button>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
        {[
          { label: 'Unread', value: unreadCount, color: '#ef4444' },
          { label: 'Open', value: openCount, color: '#3b82f6' },
          { label: 'Replied', value: messages.filter(m => m.status === 'replied').length, color: '#16a34a' },
          { label: 'Closed', value: messages.filter(m => m.status === 'closed').length, color: '#6b7280' },
        ].map((s, i) => (
          <div key={i} style={cardStyle}>
            <div style={{ fontSize: 28, fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
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
        <div style={{ flex: 1 }} />
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} style={selectStyle}>
          <option value="">All categories</option>
          {Object.entries(categoryLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {/* Two-column: list + detail */}
      <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 1fr' : '1fr', gap: 24 }}>
        <div>
          {messages.map(msg => (
            <div key={msg.id} onClick={() => { setSelected(msg); if (msg.status === 'unread') updateStatus(msg.id, 'read'); }} style={{
              ...cardStyle, marginBottom: 8, cursor: 'pointer',
              borderLeft: msg.status === 'unread' ? '3px solid #3b82f6' : '3px solid transparent',
              background: selected?.id === msg.id ? 'var(--bg)' : 'var(--card)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d={channelIcons[msg.channel] || channelIcons.portal} />
                  </svg>
                  <span style={{ fontWeight: 700, fontSize: 14 }}>{msg.subject}</span>
                </div>
                <StatusBadge status={msg.status} />
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>
                {msg.direction === 'inbound' ? `From: ${msg.sender_name}` : `To: ${msg.employee_name}`}
                {' · '}{msg.employer_name}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', gap: 12 }}>
                <span style={{ background: 'var(--bg)', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>
                  {categoryLabels[msg.category] || msg.category}
                </span>
                <span>{new Date(msg.created_at).toLocaleDateString()}</span>
                {msg.assigned_to && <span>→ {msg.assigned_to}</span>}
              </div>
            </div>
          ))}
          {messages.length === 0 && (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>No messages found.</div>
          )}
        </div>

        {selected && (
          <div style={{ ...cardStyle, position: 'sticky', top: 28, alignSelf: 'start' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <h3 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 700 }}>{selected.subject}</h3>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  {selected.direction === 'inbound' ? `From ${selected.sender_name}` : `To ${selected.employee_name}`}
                  {' · '}{new Date(selected.created_at).toLocaleString()}
                </div>
              </div>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 18 }}>×</button>
            </div>
            <div style={{ fontSize: 14, lineHeight: 1.7, marginBottom: 20, padding: '16px 20px', background: 'var(--bg)', borderRadius: 8 }}>
              {selected.body}
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <StatusBadge status={selected.status} />
              <span style={{ background: 'var(--bg)', padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600 }}>
                {categoryLabels[selected.category]}
              </span>
              {selected.assigned_to && (
                <span style={{ fontSize: 12, color: 'var(--text-secondary)', padding: '4px 10px' }}>
                  Assigned to {selected.assigned_to}
                </span>
              )}
            </div>
            {selected.status !== 'closed' && (
              <div>
                <textarea
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  placeholder="Type a reply..."
                  rows={3}
                  style={{ ...inputStyle, resize: 'vertical', marginBottom: 8 }}
                />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn-primary btn-sm" onClick={() => { updateStatus(selected.id, 'replied'); setReplyText(''); }}>
                    Reply & mark replied
                  </button>
                  <button className="btn-outline btn-sm" onClick={() => updateStatus(selected.id, 'closed')}>
                    Close
                  </button>
                </div>
              </div>
            )}
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
  padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border)',
  fontSize: 13, background: 'var(--card)', color: 'var(--text)', cursor: 'pointer', outline: 'none',
  marginBottom: -1,
};

const inputStyle = {
  width: '100%', padding: '10px 14px', borderRadius: 8,
  border: '1px solid var(--border)', fontSize: 14,
  color: 'var(--text)', background: 'var(--bg)', outline: 'none', boxSizing: 'border-box',
};
