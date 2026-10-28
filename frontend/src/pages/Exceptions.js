import React, { useEffect, useState } from 'react';
import api from '../api/client';

const priorityConfig = {
  critical: { bg: '#fee2e2', color: '#dc2626', dot: '#dc2626' },
  high: { bg: '#fff7ed', color: '#ea580c', dot: '#ea580c' },
  medium: { bg: '#fef9c3', color: '#a16207', dot: '#a16207' },
  low: { bg: '#f1f5f9', color: '#64748b', dot: '#64748b' },
};

const statusConfig = {
  open: { bg: '#fee2e2', color: '#dc2626' },
  in_progress: { bg: '#dbeafe', color: '#1d4ed8' },
  resolved: { bg: '#d1fae5', color: '#059669' },
  dismissed: { bg: '#f1f5f9', color: '#64748b' },
};

const categoryIcons = {
  aging_out: '⏰',
  invoice_discrepancy: '⚠',
  missing_info: '❓',
  enrollment_gap: '⛔',
  payment_overdue: '💳',
  cobra_deadline: '📅',
  eligibility_error: '❌',
  term_pending: '👋',
  rate_change: '📈',
  compliance: '📋',
  claim_issue: '🏥',
  other: '📌',
};

export default function Exceptions() {
  const [exceptions, setExceptions] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [expanded, setExpanded] = useState(null);
  const [updating, setUpdating] = useState(null);
  const [newNote, setNewNote] = useState({ content: '', note_type: 'note' });
  const [selectedFile, setSelectedFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [aiResolving, setAiResolving] = useState(null);

  const load = () => {
    const params = new URLSearchParams();
    if (categoryFilter) params.set('category', categoryFilter);
    if (priorityFilter) params.set('priority', priorityFilter);
    if (statusFilter) params.set('status', statusFilter);
    api.get(`/exceptions/?${params}`).then(r => setExceptions(r.data));
  };

  useEffect(load, [categoryFilter, priorityFilter, statusFilter]);

  const updateStatus = (id, newStatus) => {
    setUpdating(id);
    const payload = { status: newStatus };
    if (newStatus === 'resolved') {
      payload.resolved_at = new Date().toISOString();
    }
    api.patch(`/exceptions/${id}/`, payload).then(() => {
      load();
      setUpdating(null);
    });
  };

  const addNote = (exceptionId) => {
    if (!newNote.content.trim()) return;
    setSubmitting(true);
    const formData = new FormData();
    formData.append('exception', exceptionId);
    formData.append('note_type', newNote.note_type);
    formData.append('content', newNote.content);
    if (selectedFile) {
      formData.append('attachment', selectedFile);
    }
    api.post('/exception-notes/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(() => {
      setNewNote({ content: '', note_type: 'note' });
      setSelectedFile(null);
      setSubmitting(false);
      load();
    });
  };

  const aiResolve = (excId) => {
    setAiResolving(excId);
    api.post(`/exceptions/${excId}/ai-resolve/`).then(r => {
      setAiResolving(null);
      load();
    }).catch(err => {
      setAiResolving(null);
      alert(err.response?.data?.error || 'AI resolution failed. Check ANTHROPIC_API_KEY.');
    });
  };

  const openCount = exceptions.filter(e => e.status === 'open').length;
  const inProgressCount = exceptions.filter(e => e.status === 'in_progress').length;
  const criticalCount = exceptions.filter(e => e.priority === 'critical' && e.status !== 'resolved' && e.status !== 'dismissed').length;
  const resolvedCount = exceptions.filter(e => e.status === 'resolved').length;

  const isOverdue = (exc) => {
    if (!exc.due_date || exc.status === 'resolved' || exc.status === 'dismissed') return false;
    return new Date(exc.due_date) < new Date();
  };

  const daysUntilDue = (exc) => {
    if (!exc.due_date) return null;
    const diff = Math.ceil((new Date(exc.due_date) - new Date()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  return (
    <div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 600, marginBottom: 4 }}>Operations</div>
        <h2 style={{ margin: '0 0 6px', fontSize: 24, fontWeight: 700 }}>Exceptions</h2>
        <p style={{ margin: 0, fontSize: 14, color: 'var(--text-secondary)', maxWidth: 600 }}>
          System-detected alerts and action items requiring staff attention.
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Open', value: openCount, color: '#dc2626' },
          { label: 'In Progress', value: inProgressCount, color: '#1d4ed8' },
          { label: 'Critical', value: criticalCount, color: criticalCount > 0 ? '#dc2626' : '#6b7280' },
          { label: 'Resolved', value: resolvedCount, color: '#059669' },
        ].map((s, i) => (
          <div key={i} style={cardStyle}>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500, marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} style={selectStyle}>
          <option value="">All categories</option>
          <option value="aging_out">Dependent Aging Out</option>
          <option value="invoice_discrepancy">Invoice Discrepancy</option>
          <option value="missing_info">Missing Information</option>
          <option value="enrollment_gap">Enrollment Gap</option>
          <option value="payment_overdue">Payment Overdue</option>
          <option value="cobra_deadline">COBRA Deadline</option>
          <option value="eligibility_error">Eligibility File Error</option>
          <option value="term_pending">Termination Pending</option>
          <option value="rate_change">Rate Change Notice</option>
          <option value="compliance">Compliance Alert</option>
          <option value="claim_issue">Claim Issue</option>
          <option value="other">Other</option>
        </select>
        <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)} style={selectStyle}>
          <option value="">All priorities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={selectStyle}>
          <option value="">All statuses</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
          <option value="dismissed">Dismissed</option>
        </select>
      </div>

      {/* Exception list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {exceptions.map(exc => {
          const pc = priorityConfig[exc.priority] || priorityConfig.medium;
          const sc = statusConfig[exc.status] || statusConfig.open;
          const isExp = expanded === exc.id;
          const overdue = isOverdue(exc);
          const daysLeft = daysUntilDue(exc);
          const icon = categoryIcons[exc.category] || '📌';

          return (
            <div key={exc.id} style={{
              ...cardStyle, padding: 0, overflow: 'hidden',
              borderLeft: `4px solid ${pc.dot}`,
            }}>
              <div
                onClick={() => setExpanded(isExp ? null : exc.id)}
                style={{
                  padding: '16px 20px', cursor: 'pointer',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                  borderBottom: isExp ? '1px solid var(--border)' : 'none',
                }}
              >
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flex: 1 }}>
                  <span style={{ fontSize: 20, lineHeight: '24px' }}>{icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, fontSize: 15 }}>{exc.title}</span>
                      <span style={{
                        padding: '2px 8px', borderRadius: 8, fontSize: 10, fontWeight: 700,
                        background: pc.bg, color: pc.color, textTransform: 'uppercase',
                      }}>
                        {exc.priority}
                      </span>
                      <span style={{
                        padding: '2px 8px', borderRadius: 8, fontSize: 10, fontWeight: 700,
                        background: sc.bg, color: sc.color, textTransform: 'uppercase',
                      }}>
                        {exc.status_display}
                      </span>
                      {exc.note_count > 0 && (
                        <span style={{
                          padding: '2px 8px', borderRadius: 8, fontSize: 10, fontWeight: 700,
                          background: '#e0e7ff', color: '#4338ca',
                        }}>
                          {exc.note_count} note{exc.note_count !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                      {exc.category_display}
                      {exc.employer_name && <span> &middot; {exc.employer_name}</span>}
                      {exc.employee_name && <span> &middot; {exc.employee_name}</span>}
                      {exc.carrier_name && <span> &middot; {exc.carrier_name}</span>}
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 16 }}>
                  {exc.due_date && (
                    <div style={{
                      fontSize: 12, fontWeight: 600,
                      color: overdue ? '#dc2626' : (daysLeft !== null && daysLeft <= 3) ? '#ea580c' : 'var(--text-secondary)',
                    }}>
                      {overdue ? `Overdue (${exc.due_date})` :
                        daysLeft === 0 ? 'Due today' :
                        daysLeft === 1 ? 'Due tomorrow' :
                        `Due ${exc.due_date}`}
                    </div>
                  )}
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                    {new Date(exc.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>

              {isExp && (
                <div style={{ padding: '16px 20px', paddingLeft: 52 }}>
                  <div style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.6, marginBottom: 16 }}>
                    {exc.description}
                  </div>

                  {exc.resolution_notes && (
                    <div style={{
                      padding: '10px 14px', borderRadius: 8, marginBottom: 16,
                      background: 'var(--table-header-bg)', fontSize: 13,
                    }}>
                      <strong>Resolution:</strong> {exc.resolution_notes}
                    </div>
                  )}

                  {exc.status !== 'resolved' && exc.status !== 'dismissed' && (
                    <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                      <button
                        onClick={() => aiResolve(exc.id)}
                        disabled={aiResolving === exc.id}
                        style={{
                          ...btnStyle, background: 'linear-gradient(135deg, #7c3aed, #2563eb)',
                          color: '#fff', display: 'flex', alignItems: 'center', gap: 6,
                        }}
                      >
                        {aiResolving === exc.id ? (
                          <>
                            <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite',
                              width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)',
                              borderTopColor: '#fff', borderRadius: '50%' }} />
                            AI Thinking...
                          </>
                        ) : '✨ AI Resolve'}
                      </button>
                      {exc.status === 'open' && (
                        <button
                          onClick={() => updateStatus(exc.id, 'in_progress')}
                          disabled={updating === exc.id}
                          style={{ ...btnStyle, background: '#1d4ed8', color: '#fff' }}
                        >
                          Start Working
                        </button>
                      )}
                      <button
                        onClick={() => updateStatus(exc.id, 'resolved')}
                        disabled={updating === exc.id}
                        style={{ ...btnStyle, background: '#059669', color: '#fff' }}
                      >
                        Resolve
                      </button>
                      <button
                        onClick={() => updateStatus(exc.id, 'dismissed')}
                        disabled={updating === exc.id}
                        style={{ ...btnStyle, background: 'var(--card)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
                      >
                        Dismiss
                      </button>
                    </div>
                  )}

                  {/* Notes thread */}
                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: 'var(--text-secondary)' }}>
                      Notes & Activity
                    </div>

                    {(exc.notes || []).map(note => {
                      const isAi = note.author === 'AI Assistant';
                      return (
                      <div key={note.id} style={{
                        padding: '10px 14px', borderRadius: 8, marginBottom: 8,
                        background: isAi ? 'linear-gradient(135deg, rgba(124,58,237,0.05), rgba(37,99,235,0.05))' : 'var(--table-header-bg)',
                        fontSize: 13,
                        borderLeft: isAi ? '3px solid #7c3aed' : '3px solid var(--accent)',
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <span style={{ fontWeight: 600 }}>{note.author}</span>
                            <span style={{
                              padding: '1px 6px', borderRadius: 4, fontSize: 10, fontWeight: 600,
                              background: noteTypeColors[note.note_type]?.bg || '#f1f5f9',
                              color: noteTypeColors[note.note_type]?.color || '#64748b',
                            }}>
                              {note.note_type_display}
                            </span>
                          </div>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            {new Date(note.created_at).toLocaleString()}
                          </span>
                        </div>
                        <div style={{ lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{note.content}</div>
                        {note.attachment_name && (
                          <div style={{ marginTop: 6, fontSize: 12 }}>
                            {note.attachment_url ? (
                              <a href={note.attachment_url} target="_blank" rel="noopener noreferrer"
                                style={{ color: 'var(--accent)', textDecoration: 'none' }}>
                                📎 {note.attachment_name}
                              </a>
                            ) : (
                              <span style={{ color: 'var(--text-muted)' }}>📎 {note.attachment_name}</span>
                            )}
                          </div>
                        )}
                      </div>
                      );
                    })}

                    {/* Add note form */}
                    <div style={{
                      padding: '12px 14px', borderRadius: 8, marginTop: 8,
                      border: '1px solid var(--border)', background: 'var(--card)',
                    }}>
                      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                        <select
                          value={newNote.note_type}
                          onChange={e => setNewNote(n => ({ ...n, note_type: e.target.value }))}
                          style={{ ...selectStyle, padding: '6px 10px', fontSize: 12 }}
                        >
                          <option value="note">Note</option>
                          <option value="memo">Memo</option>
                          <option value="proof">Proof / Evidence</option>
                          <option value="update">Status Update</option>
                          <option value="correspondence">Correspondence</option>
                        </select>
                      </div>
                      <textarea
                        placeholder="Add a note, memo, or proof..."
                        value={newNote.content}
                        onChange={e => setNewNote(n => ({ ...n, content: e.target.value }))}
                        style={{
                          width: '100%', minHeight: 60, padding: '8px 10px', borderRadius: 6,
                          border: '1px solid var(--border)', fontSize: 13, resize: 'vertical',
                          background: 'var(--bg)', color: 'var(--text)', fontFamily: 'inherit',
                          boxSizing: 'border-box',
                        }}
                      />
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <label style={{
                            padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                            border: '1px solid var(--border)', cursor: 'pointer',
                            color: 'var(--text-secondary)', background: 'var(--card)',
                          }}>
                            📎 Attach File
                            <input
                              type="file"
                              style={{ display: 'none' }}
                              onChange={e => setSelectedFile(e.target.files[0] || null)}
                            />
                          </label>
                          {selectedFile && (
                            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                              {selectedFile.name}
                              <span
                                onClick={() => setSelectedFile(null)}
                                style={{ marginLeft: 6, cursor: 'pointer', color: '#dc2626' }}
                              >
                                ✕
                              </span>
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => addNote(exc.id)}
                          disabled={submitting || !newNote.content.trim()}
                          style={{
                            ...btnStyle, background: 'var(--accent)', color: '#fff',
                            opacity: (!newNote.content.trim() || submitting) ? 0.5 : 1,
                          }}
                        >
                          {submitting ? 'Saving...' : 'Add Note'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {exceptions.length === 0 && (
          <div style={{ ...cardStyle, padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
            No exceptions found. All clear!
          </div>
        )}
      </div>
    </div>
  );
}

const cardStyle = {
  background: 'var(--card)', borderRadius: 'var(--radius-lg)',
  padding: '16px 20px', boxShadow: 'var(--card-shadow)', border: '1px solid var(--border)',
};
const selectStyle = {
  padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)',
  fontSize: 14, background: 'var(--card)', color: 'var(--text)', cursor: 'pointer', outline: 'none',
};
const btnStyle = {
  padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
  border: 'none', cursor: 'pointer',
};
const noteTypeColors = {
  note: { bg: '#f1f5f9', color: '#64748b' },
  memo: { bg: '#dbeafe', color: '#1d4ed8' },
  proof: { bg: '#d1fae5', color: '#059669' },
  update: { bg: '#fef9c3', color: '#a16207' },
  correspondence: { bg: '#ede9fe', color: '#7c3aed' },
};
