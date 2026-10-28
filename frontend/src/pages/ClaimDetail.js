import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/client';
import StatusBadge from '../components/StatusBadge';

export default function ClaimDetail() {
  const { id } = useParams();
  const [claim, setClaim] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showRequestInfo, setShowRequestInfo] = useState(false);
  const [showApprove, setShowApprove] = useState(false);
  const [requestReason, setRequestReason] = useState('Medical records needed');
  const [approveData, setApproveData] = useState({ allowed: '', plan_pays: '', member_owes: '', deductible: '' });
  const [deductibleAll, setDeductibleAll] = useState(true);

  const load = () => {
    api.get(`/claims/${id}/`).then(r => {
      setClaim(r.data);
      const b = Number(r.data.billed_amount);
      setApproveData({
        allowed: r.data.allowed_amount || b.toFixed(2),
        plan_pays: r.data.plan_pays || '',
        member_owes: r.data.member_owes || '',
        deductible: r.data.deductible_applied || '',
      });
    });
  };

  useEffect(load, [id]);

  const transition = async (status, extra = {}) => {
    setSaving(true);
    await api.post(`/claims/${id}/transition/`, { status, ...extra });
    load();
    setSaving(false);
  };

  const handleApprove = async () => {
    setSaving(true);
    await api.post(`/claims/${id}/transition/`, {
      status: 'approved',
      allowed_amount: approveData.allowed,
      paid_amount: approveData.plan_pays,
    });
    setShowApprove(false);
    load();
    setSaving(false);
  };

  const handleRequestInfo = async () => {
    setSaving(true);
    await api.post(`/claims/${id}/transition/`, {
      status: 'pending_info',
    });
    setShowRequestInfo(false);
    load();
    setSaving(false);
  };

  if (!claim) return <div style={{ padding: 40, color: 'var(--text-muted)' }}>Loading...</div>;

  const receivedMethodLabel = {
    electronic: 'Electronic (EDI)',
    paper: 'Paper',
    portal: 'Portal',
  }[claim.received_method] || claim.received_method;

  return (
    <div>
      <Link to="/staff/claims" style={{ color: 'var(--accent)', textDecoration: 'none', fontSize: 14 }}>
        ← Claims queue
      </Link>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 16, marginBottom: 8 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
            <h2 style={{ margin: 0, fontSize: 26, fontWeight: 700 }}>{claim.claim_number}</h2>
            <StatusBadge status={claim.status} />
          </div>
          <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
            <span style={{ textTransform: 'capitalize' }}>{claim.claim_type}</span> claim · {claim.provider_name} · ${Number(claim.billed_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })} billed
          </div>
          {claim.pending_reason && (
            <div style={{ fontSize: 13, color: '#1565c0', marginTop: 4 }}>
              Waiting on: {claim.pending_reason}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {claim.status === 'received' && (
            <button className="btn-primary" onClick={() => transition('in_review')} disabled={saving}>Start review</button>
          )}
          {claim.status === 'in_review' && (
            <>
              <button className="btn-primary" onClick={() => setShowApprove(true)} disabled={saving}>Approve</button>
              <button className="btn-outline" onClick={() => setShowRequestInfo(true)} disabled={saving}>Request info</button>
            </>
          )}
          {claim.status === 'pending_info' && (
            <>
              <button className="btn-primary" onClick={() => transition('in_review')} disabled={saving}>Start review</button>
              <button className="btn-outline" onClick={() => transition('denied', { denial_reason: 'Claim denied' })} disabled={saving}>Deny</button>
            </>
          )}
          {claim.status === 'approved' && (
            <button className="btn-success" onClick={() => transition('paid')} disabled={saving}>Mark paid</button>
          )}
        </div>
      </div>

      {/* Two-column layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginTop: 24 }}>
        {/* Claim info card */}
        <div style={cardStyle}>
          <h3 style={cardTitle}>Claim</h3>
          <div style={fieldGrid}>
            <Field label="Provider" value={`${claim.provider_name}${claim.npi ? `  ·  NPI ${claim.npi}` : ''}`} />
            <Field label="Service" value={claim.service_description} />
            <Field label="Procedures" value={claim.procedure_codes || '—'} mono />
            <Field label="Diagnoses" value={claim.diagnosis_codes || '—'} mono />
            <Field label="Date of service" value={claim.service_date} />
            <Field label="Received" value={`${claim.received_date} · ${receivedMethodLabel}`} />
          </div>
        </div>

        {/* Member info card */}
        <div style={cardStyle}>
          <h3 style={cardTitle}>Member</h3>
          <div style={fieldGrid}>
            <Field label="Employee" value={claim.employee_name} />
            <Field label="Member ID" value={claim.member_id || '—'} mono />
            <Field label="Patient" value={`${claim.patient_name} (${claim.patient_relationship?.toLowerCase() || 'employee'})`} />
            <Field label="Employer" value={claim.employer_name} />
          </div>
        </div>

        {/* Amounts card */}
        <div style={cardStyle}>
          <h3 style={cardTitle}>Amounts</h3>
          <div style={fieldGrid}>
            <Field label="Billed" value={`$${Number(claim.billed_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}`} />
            <Field label="Allowed" value={claim.allowed_amount ? `$${Number(claim.allowed_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : 'Not decided yet'} muted={!claim.allowed_amount} />
            <Field label="Plan pays" value={claim.plan_pays ? `$${Number(claim.plan_pays).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—'} />
            <Field label="Member owes" value={claim.member_owes ? `$${Number(claim.member_owes).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—'} />
            <Field label="Towards deductible" value={claim.deductible_applied ? `$${Number(claim.deductible_applied).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—'} />
            <Field label="Paid" value={claim.paid_amount ? `$${Number(claim.paid_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—'} />
          </div>
        </div>

        {/* Assigned to card */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={cardTitle}>Assigned to</h3>
            <button className="btn-outline btn-xs" onClick={() => {
              const name = prompt('Assign to:');
              if (name !== null) {
                api.post(`/claims/${id}/transition/`, { status: claim.status, assigned_to: name }).then(load);
              }
            }}>Reassign</button>
          </div>
          <div style={{ fontSize: 14, marginTop: 8 }}>{claim.assigned_to || 'Unassigned'}</div>
        </div>

        {/* Notes card */}
        <div style={cardStyle}>
          <h3 style={cardTitle}>Notes</h3>
          <div style={{ fontSize: 14, color: claim.notes ? 'var(--text)' : 'var(--text-muted)', marginTop: 8 }}>
            {claim.notes || 'No notes yet.'}
          </div>
          {claim.denial_reason && (
            <div style={{ marginTop: 12, padding: '10px 14px', background: '#fce4ec', borderRadius: 8, fontSize: 13, color: '#c62828' }}>
              <strong>Denial reason:</strong> {claim.denial_reason}
            </div>
          )}
        </div>

        {/* Change log card */}
        <div style={cardStyle}>
          <h3 style={cardTitle}>Change log</h3>
          <div style={{ marginTop: 8 }}>
            <LogEntry
              title="Claim updated"
              detail={`Status: ${claim.status.replace(/_/g, ' ')}`}
              time={new Date(claim.updated_at).toLocaleString()}
            />
            <LogEntry
              title="Claim received"
              detail={receivedMethodLabel}
              time={claim.received_date}
            />
          </div>
        </div>
      </div>

      {/* Request Info Modal */}
      {showRequestInfo && (
        <Modal onClose={() => setShowRequestInfo(false)}>
          <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700 }}>Request information: {claim.claim_number}</h3>
          <p style={{ margin: '0 0 20px', fontSize: 14, color: 'var(--text-secondary)' }}>
            Holds the claim until the member or provider sends what's missing. Add a note with the details.
          </p>
          <label style={labelStyle}>What's needed</label>
          <select value={requestReason} onChange={e => setRequestReason(e.target.value)} style={{ ...selectStyle, width: '100%', marginBottom: 20 }}>
            <option>Medical records needed</option>
            <option>Coordination of benefits</option>
            <option>Other coverage (coordination of benefits)</option>
            <option>Pre-authorization verification</option>
            <option>Itemized bill required</option>
          </select>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button className="btn-outline" onClick={() => setShowRequestInfo(false)}>Cancel</button>
            <button className="btn-primary" onClick={handleRequestInfo} disabled={saving}>Request information</button>
          </div>
        </Modal>
      )}

      {/* Approve Modal */}
      {showApprove && (
        <Modal onClose={() => setShowApprove(false)}>
          <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700 }}>Approve: {claim.claim_number}</h3>
          <p style={{ margin: '0 0 20px', fontSize: 14, color: 'var(--text-secondary)' }}>
            Allowed is what the plan recognizes for the service; it's split between what the plan pays and what the member owes.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={labelStyle}>Allowed ($)</label>
              <input
                type="number"
                step="0.01"
                value={approveData.allowed}
                onChange={e => {
                  const allowed = parseFloat(e.target.value) || 0;
                  const planPays = parseFloat(approveData.plan_pays) || 0;
                  const mo = (allowed - planPays).toFixed(2);
                  setApproveData(prev => ({ ...prev, allowed: e.target.value, member_owes: mo, ...(deductibleAll ? { deductible: mo } : {}) }));
                }}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Plan pays ($)</label>
              <input
                type="number"
                step="0.01"
                value={approveData.plan_pays}
                onChange={e => {
                  const planPays = parseFloat(e.target.value) || 0;
                  const allowed = parseFloat(approveData.allowed) || 0;
                  const mo = (allowed - planPays).toFixed(2);
                  setApproveData(prev => ({ ...prev, plan_pays: e.target.value, member_owes: mo, ...(deductibleAll ? { deductible: mo } : {}) }));
                }}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Member owes ($)</label>
              <input type="number" step="0.01" value={approveData.member_owes} readOnly style={{ ...inputStyle, background: 'var(--bg)' }} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <label style={{ ...labelStyle, marginBottom: 0 }}>Towards deductible ($)</label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, color: 'var(--accent)', cursor: 'pointer', userSelect: 'none' }}>
                  <input
                    type="checkbox"
                    checked={deductibleAll}
                    onChange={e => {
                      setDeductibleAll(e.target.checked);
                      if (e.target.checked) {
                        setApproveData(prev => ({ ...prev, deductible: prev.member_owes }));
                      }
                    }}
                    style={{ accentColor: 'var(--accent)', cursor: 'pointer' }}
                  />
                  All
                </label>
              </div>
              <input
                type="number"
                step="0.01"
                value={deductibleAll ? approveData.member_owes : approveData.deductible}
                onChange={e => setApproveData({ ...approveData, deductible: e.target.value })}
                readOnly={deductibleAll}
                style={{ ...inputStyle, background: deductibleAll ? 'var(--bg)' : undefined }}
              />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
            <button className="btn-outline" onClick={() => setShowApprove(false)}>Cancel</button>
            <button className="btn-primary" onClick={handleApprove} disabled={saving}>Approve</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Field({ label, value, mono, muted }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500, marginBottom: 2 }}>{label}</div>
      <div style={{
        fontSize: 14,
        fontFamily: mono ? 'monospace' : 'inherit',
        fontWeight: mono ? 600 : 400,
        color: muted ? 'var(--text-muted)' : 'var(--text)',
      }}>{value}</div>
    </div>
  );
}

function LogEntry({ title, detail, time }) {
  return (
    <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
      <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--accent)', marginTop: 4, flexShrink: 0 }} />
      <div>
        <div style={{ fontSize: 14, fontWeight: 600 }}>{title}</div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{detail}</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{time}</div>
      </div>
    </div>
  );
}

function Modal({ children, onClose }) {
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000,
    }} onClick={onClose}>
      <div style={{
        background: 'var(--card)', borderRadius: 12, padding: 28,
        maxWidth: 520, width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      }} onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

const cardStyle = {
  background: 'var(--card)',
  borderRadius: 'var(--radius-lg)',
  padding: 24,
  boxShadow: 'var(--card-shadow)',
  border: '1px solid var(--border)',
};

const cardTitle = { margin: '0 0 4px', fontSize: 16, fontWeight: 700 };

const fieldGrid = { marginTop: 16 };

const labelStyle = { display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 };

const inputStyle = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: 8,
  border: '1px solid var(--border)',
  fontSize: 14,
  color: 'var(--text)',
  outline: 'none',
  boxSizing: 'border-box',
};

const selectStyle = {
  padding: '10px 14px',
  borderRadius: 8,
  border: '1px solid var(--border)',
  fontSize: 14,
  background: 'var(--card)',
  color: 'var(--text)',
  cursor: 'pointer',
  outline: 'none',
};
