import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../api/client';
import StatusBadge from '../components/StatusBadge';

export default function EnrollmentEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [enrollment, setEnrollment] = useState(null);
  const [dependents, setDependents] = useState([]);
  const [saving, setSaving] = useState(false);

  const load = () => {
    api.get(`/enrollments/${id}/`).then(r => {
      setEnrollment(r.data);
      api.get(`/dependents/?employee=${r.data.employee}`).then(dr => setDependents(dr.data));
    });
  };

  useEffect(load, [id]);

  const addSubscriber = async () => {
    setSaving(true);
    await api.post(`/enrollments/${id}/add_member/`, { is_subscriber: true });
    load();
    setSaving(false);
  };

  const addDependent = async (dependentId) => {
    setSaving(true);
    await api.post(`/enrollments/${id}/add_member/`, { dependent_id: dependentId });
    load();
    setSaving(false);
  };

  const removeMember = async (memberId) => {
    setSaving(true);
    await api.post(`/enrollments/${id}/remove_member/`, { member_id: memberId });
    load();
    setSaving(false);
  };

  const handleAction = async (action) => {
    setSaving(true);
    await api.post(`/enrollments/${id}/${action}/`);
    load();
    setSaving(false);
  };

  if (!enrollment) return <div style={{ padding: 40, color: 'var(--text-muted)' }}>Loading...</div>;

  const members = enrollment.members || [];
  const hasSubscriber = members.some(m => m.is_subscriber);
  const enrolledDepIds = members.filter(m => m.dependent).map(m => m.dependent);
  const availableDependents = dependents.filter(d => !enrolledDepIds.includes(d.id));

  const planColors = {
    medical: '#3b82f6',
    dental: '#7c3aed',
    vision: '#ea580c',
    life: '#16a34a',
  };

  return (
    <div>
      <Link to="/staff/enrollments" style={{ color: 'var(--accent)', textDecoration: 'none', fontSize: 14 }}>
        ← Back to Enrollments
      </Link>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 16, marginBottom: 28 }}>
        <div>
          <h2 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 700 }}>Edit Enrollment</h2>
          <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
            Manage policy members and enrollment status
          </div>
        </div>
        <StatusBadge status={enrollment.status} />
      </div>

      {/* Policy Summary */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 24,
        marginBottom: 28,
      }}>
        <div style={{
          background: 'var(--card)',
          borderRadius: 'var(--radius-lg)',
          padding: 24,
          boxShadow: 'var(--card-shadow)',
          borderLeft: `4px solid ${planColors[enrollment.plan_type] || 'var(--accent)'}`,
        }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700 }}>Plan Details</h3>
          <div style={{ fontSize: 14, lineHeight: 2 }}>
            <div><span style={{ color: 'var(--text-secondary)' }}>Plan:</span> {enrollment.plan_name}</div>
            <div><span style={{ color: 'var(--text-secondary)' }}>Type:</span> <span style={{ textTransform: 'capitalize' }}>{enrollment.plan_type}</span></div>
            <div><span style={{ color: 'var(--text-secondary)' }}>Carrier:</span> {enrollment.carrier_name}</div>
            <div><span style={{ color: 'var(--text-secondary)' }}>Tier:</span> {enrollment.tier_display}</div>
            <div><span style={{ color: 'var(--text-secondary)' }}>Effective:</span> {enrollment.effective_date}</div>
            {enrollment.carrier_confirmation_number && (
              <div><span style={{ color: 'var(--text-secondary)' }}>Confirmation:</span> {enrollment.carrier_confirmation_number}</div>
            )}
          </div>
        </div>

        <div style={{
          background: 'var(--card)',
          borderRadius: 'var(--radius-lg)',
          padding: 24,
          boxShadow: 'var(--card-shadow)',
        }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700 }}>Subscriber</h3>
          <div style={{ fontSize: 14, lineHeight: 2 }}>
            <div><span style={{ color: 'var(--text-secondary)' }}>Employee:</span> {enrollment.employee_name}</div>
            <div><span style={{ color: 'var(--text-secondary)' }}>Employer:</span> {enrollment.employer_name}</div>
          </div>
          <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div style={{ background: 'var(--bg)', borderRadius: 'var(--radius)', padding: '10px 14px', textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 4 }}>PREMIUM</div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>${Number(enrollment.monthly_premium).toLocaleString()}</div>
            </div>
            <div style={{ background: 'var(--bg)', borderRadius: 'var(--radius)', padding: '10px 14px', textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 4 }}>EE DEDUCTION</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--red)' }}>${Number(enrollment.employee_deduction).toLocaleString()}</div>
            </div>
            <div style={{ background: 'var(--bg)', borderRadius: 'var(--radius)', padding: '10px 14px', textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 4 }}>MEMBERS</div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>{members.length}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div style={{
        background: 'var(--card)',
        borderRadius: 'var(--radius-lg)',
        padding: '16px 24px',
        boxShadow: 'var(--card-shadow)',
        marginBottom: 28,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginRight: 8 }}>ACTIONS:</span>
        {enrollment.status === 'pending' && (
          <>
            <button className="btn-success btn-sm" onClick={() => handleAction('activate')} disabled={saving}>Activate</button>
            <button className="btn-primary btn-sm" onClick={() => handleAction('confirm')} disabled={saving}>Carrier Confirm</button>
          </>
        )}
        {enrollment.status === 'active' && (
          <button className="btn-primary btn-sm" onClick={() => handleAction('confirm')} disabled={saving}>Carrier Confirm</button>
        )}
        {(enrollment.status === 'active' || enrollment.status === 'carrier_confirmed') && (
          <button className="btn-danger btn-sm" onClick={() => handleAction('terminate')} disabled={saving}>Terminate</button>
        )}
      </div>

      {/* Members */}
      <div style={{
        background: 'var(--card)',
        borderRadius: 'var(--radius-lg)',
        padding: 24,
        boxShadow: 'var(--card-shadow)',
        marginBottom: 28,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Policy Members</h3>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{members.length} member{members.length !== 1 ? 's' : ''}</span>
        </div>

        {members.length === 0 ? (
          <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
            No members added yet. Add the subscriber and any dependents below.
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>NAME</th>
                <th>RELATIONSHIP</th>
                <th>EFFECTIVE DATE</th>
                <th style={{ width: 100 }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {members.map(member => (
                <tr key={member.id}>
                  <td style={{ fontWeight: 600 }}>
                    {member.person_name}
                    {member.is_subscriber && (
                      <span style={{
                        marginLeft: 8,
                        padding: '2px 6px',
                        borderRadius: 4,
                        background: '#dbeafe',
                        color: '#1d4ed8',
                        fontSize: 10,
                        fontWeight: 700,
                      }}>SUBSCRIBER</span>
                    )}
                  </td>
                  <td>{member.relationship}</td>
                  <td>{member.effective_date || enrollment.effective_date}</td>
                  <td>
                    <button
                      className="btn-outline btn-xs"
                      onClick={() => removeMember(member.id)}
                      disabled={saving}
                      style={{ color: 'var(--red)', borderColor: 'var(--red)' }}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: 'var(--text-secondary)' }}>ADD MEMBERS</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {!hasSubscriber && (
              <button
                className="btn-primary btn-sm"
                onClick={addSubscriber}
                disabled={saving}
              >
                + Add Subscriber ({enrollment.employee_name})
              </button>
            )}
            {availableDependents.map(dep => (
              <button
                key={dep.id}
                className="btn-outline btn-sm"
                onClick={() => addDependent(dep.id)}
                disabled={saving}
              >
                + {dep.full_name} ({dep.relationship_display})
              </button>
            ))}
            {hasSubscriber && availableDependents.length === 0 && (
              <span style={{ fontSize: 13, color: 'var(--text-muted)', padding: '4px 0' }}>
                All available dependents are enrolled.
                {dependents.length === 0 && ' This employee has no dependents on file.'}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
