import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import StatusBadge from '../components/StatusBadge';

const genClaimNum = () => 'CLM-' + String(Math.floor(100000 + Math.random() * 900000));
const today = () => new Date().toISOString().slice(0, 10);

const emptyForm = {
  claim_number: genClaimNum(),
  claim_type: 'medical',
  employee: '',
  provider_name: '',
  service_description: '',
  service_date: '',
  received_date: today(),
  billed_amount: '',
  status: 'received',
};

export default function Claims() {
  const [claims, setClaims] = useState([]);
  const [stats, setStats] = useState(null);
  const [filter, setFilter] = useState('open');
  const [employerFilter, setEmployerFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [assignedFilter, setAssignedFilter] = useState('');
  const [search, setSearch] = useState('');
  const [employers, setEmployers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const loadStats = () => api.get('/claims/stats/').then(r => setStats(r.data));

  const loadClaims = () => {
    const params = {};
    if (filter === 'open') params.open = 'true';
    else if (filter) params.status = filter;
    if (employerFilter) params.employer = employerFilter;
    if (typeFilter) params.claim_type = typeFilter;
    if (assignedFilter) params.assigned_to = assignedFilter;
    if (search) params.search = search;
    api.get('/claims/', { params }).then(r => setClaims(r.data));
  };

  useEffect(() => {
    api.get('/employers/').then(r => setEmployers(r.data));
    api.get('/employees/').then(r => setEmployees(r.data));
    loadStats();
  }, []);

  useEffect(() => { loadClaims(); }, [filter, employerFilter, typeFilter, assignedFilter, search]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const openModal = () => {
    setForm({ ...emptyForm, claim_number: genClaimNum(), received_date: today() });
    setError('');
    setShowModal(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.post('/claims/', form);
      setShowModal(false);
      loadClaims();
      loadStats();
    } catch (err) {
      const data = err.response?.data;
      if (data) {
        const msgs = Object.entries(data).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`);
        setError(msgs.join(' | '));
      } else {
        setError('Failed to create claim.');
      }
    } finally {
      setSaving(false);
    }
  };

  const employeesByEmployer = {};
  employees.forEach(emp => {
    const key = emp.employer_name || 'Unknown';
    if (!employeesByEmployer[key]) employeesByEmployer[key] = [];
    employeesByEmployer[key].push(emp);
  });

  const statCards = stats ? [
    { label: 'Open claims', value: stats.open, sub: `${stats.unassigned} unassigned`, icon: 'folder' },
    { label: 'New', value: stats.received, sub: 'Received, not started', icon: 'inbox' },
    { label: 'Pending info', value: stats.pending_info, sub: 'Waiting on member or provider', icon: 'clock' },
    { label: 'Approved, to pay', value: `$${Number(stats.approved_total).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, sub: `${stats.approved} claims`, icon: 'check' },
  ] : [];

  const tabs = [
    { key: 'open', label: 'Open', count: stats?.open },
    { key: 'received', label: 'Received', count: stats?.received },
    { key: 'in_review', label: 'In Review', count: stats?.in_review },
    { key: 'pending_info', label: 'Pending Info', count: stats?.pending_info },
    { key: 'approved', label: 'Approved', count: stats?.approved },
    { key: 'denied', label: 'Denied', count: stats?.denied },
    { key: 'paid', label: 'Paid', count: stats?.paid },
    { key: '', label: 'All', count: stats?.total },
  ];

  const assignees = [...new Set(claims.map(c => c.assigned_to).filter(Boolean))].sort();

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 600, marginBottom: 4 }}>Claims</div>
          <h2 style={{ margin: '0 0 6px', fontSize: 24, fontWeight: 700 }}>Claims queue</h2>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--text-secondary)', maxWidth: 600 }}>
            Claims submitted for every employer's members. Open claims are listed oldest first, the order to work them in.
          </p>
        </div>
        <button className="btn-primary" style={{ whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6 }} onClick={openModal}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14m-7-7h14"/></svg>
          Enter claim
        </button>
      </div>

      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
          {statCards.map((card, i) => (
            <div key={i} style={{
              background: 'var(--card)',
              borderRadius: 'var(--radius-lg)',
              padding: '20px 24px',
              boxShadow: 'var(--card-shadow)',
              border: '1px solid var(--border)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--text-secondary)', fontSize: 16,
                }}>
                  {card.icon === 'folder' && '📂'}
                  {card.icon === 'inbox' && '📥'}
                  {card.icon === 'clock' && '⏳'}
                  {card.icon === 'check' && '✓'}
                </div>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>{card.label}</span>
              </div>
              <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 4 }}>{card.value}</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{card.sub}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{
        background: 'var(--card)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--card-shadow)',
        border: '1px solid var(--border)',
      }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)', padding: '0 20px' }}>
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              style={{
                padding: '12px 16px',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 600,
                color: filter === tab.key ? 'var(--accent)' : 'var(--text-secondary)',
                borderBottom: filter === tab.key ? '2px solid var(--accent)' : '2px solid transparent',
                marginBottom: -1,
              }}
            >
              {tab.label}{tab.count != null ? ` (${tab.count})` : ''}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 12, padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <select
            value={employerFilter}
            onChange={e => setEmployerFilter(e.target.value)}
            style={selectStyle}
          >
            <option value="">All employers</option>
            {employers.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={selectStyle}>
            <option value="">All types</option>
            <option value="medical">Medical</option>
            <option value="dental">Dental</option>
            <option value="vision">Vision</option>
          </select>
          <select value={assignedFilter} onChange={e => setAssignedFilter(e.target.value)} style={selectStyle}>
            <option value="">Anyone</option>
            {assignees.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <input
            placeholder="Search member, claim #, or provider"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              flex: 1,
              padding: '8px 14px',
              borderRadius: 6,
              border: '1px solid var(--border)',
              fontSize: 13,
              background: 'var(--bg)',
              color: 'var(--text)',
              outline: 'none',
            }}
          />
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%' }}>
            <thead>
              <tr>
                <th style={thStyle}>CLAIM</th>
                <th style={thStyle}>MEMBER / PATIENT</th>
                <th style={thStyle}>PROVIDER / SERVICE</th>
                <th style={thStyle}>SERVICE DATE</th>
                <th style={thStyle}>RECEIVED</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>BILLED</th>
                <th style={thStyle}>STATUS</th>
                <th style={thStyle}>ASSIGNED</th>
              </tr>
            </thead>
            <tbody>
              {claims.map(claim => (
                <tr
                  key={claim.id}
                  onClick={() => navigate(`/staff/claims/${claim.id}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{claim.claim_number}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{claim.claim_type}</div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{claim.employee_name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      {claim.patient_name !== claim.employee_name
                        ? `${claim.patient_name} (${claim.patient_relationship?.toLowerCase()}) · ${claim.employer_name}`
                        : `Employee · ${claim.employer_name}`
                      }
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontWeight: 500, fontSize: 13 }}>{claim.provider_name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{claim.service_description}</div>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 13 }}>{claim.service_date}</td>
                  <td style={{ padding: '12px 16px', fontSize: 13 }}>{claim.received_date}</td>
                  <td style={{ padding: '12px 16px', fontSize: 13, textAlign: 'right', fontWeight: 600 }}>
                    ${Number(claim.billed_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <StatusBadge status={claim.status} />
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 13 }}>{claim.assigned_to || '—'}</td>
                </tr>
              ))}
              {claims.length === 0 && (
                <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>No claims found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Enter Claim Modal */}
      {showModal && (
        <div style={overlay} onClick={() => setShowModal(false)}>
          <div style={modal} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Enter Claim</h3>
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
                  Claim Number *
                  <input type="text" required value={form.claim_number} onChange={e => set('claim_number', e.target.value)} style={inputStyle} />
                </label>
                <label style={labelStyle}>
                  Claim Type *
                  <select required value={form.claim_type} onChange={e => set('claim_type', e.target.value)} style={inputStyle}>
                    <option value="medical">Medical</option>
                    <option value="dental">Dental</option>
                    <option value="vision">Vision</option>
                  </select>
                </label>
              </div>

              <label style={{ ...labelStyle, marginBottom: 16 }}>
                Employee *
                <select required value={form.employee} onChange={e => set('employee', e.target.value)} style={inputStyle}>
                  <option value="">Select employee...</option>
                  {Object.entries(employeesByEmployer).map(([employer, emps]) => (
                    <optgroup key={employer} label={employer}>
                      {emps.map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.full_name}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </label>

              <div style={fieldGrid}>
                <label style={labelStyle}>
                  Provider Name *
                  <input type="text" required value={form.provider_name} onChange={e => set('provider_name', e.target.value)} style={inputStyle} placeholder="e.g. Regional Medical Center" />
                </label>
                <label style={labelStyle}>
                  Service Description
                  <input type="text" value={form.service_description} onChange={e => set('service_description', e.target.value)} style={inputStyle} placeholder="e.g. Office visit" />
                </label>
              </div>

              <div style={fieldGrid}>
                <label style={labelStyle}>
                  Service Date *
                  <input type="date" required value={form.service_date} onChange={e => set('service_date', e.target.value)} style={inputStyle} />
                </label>
                <label style={labelStyle}>
                  Received Date *
                  <input type="date" required value={form.received_date} onChange={e => set('received_date', e.target.value)} style={inputStyle} />
                </label>
              </div>

              <div style={fieldGrid}>
                <label style={labelStyle}>
                  Billed Amount *
                  <input type="number" step="0.01" min="0" required value={form.billed_amount} onChange={e => set('billed_amount', e.target.value)} style={inputStyle} placeholder="0.00" />
                </label>
                <div />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
                <button type="button" className="btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Submitting...' : 'Submit Claim'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const thStyle = {
  padding: '10px 16px',
  fontSize: 11,
  fontWeight: 700,
  color: 'var(--text-secondary)',
  textAlign: 'left',
  borderBottom: '1px solid var(--border)',
};

const selectStyle = {
  padding: '8px 14px',
  borderRadius: 6,
  border: '1px solid var(--border)',
  fontSize: 13,
  background: 'var(--card)',
  color: 'var(--text)',
  cursor: 'pointer',
  outline: 'none',
  minWidth: 140,
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
