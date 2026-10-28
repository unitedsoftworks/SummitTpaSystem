import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../api/client';
import StatusBadge from '../components/StatusBadge';

export default function EmployeeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState(null);
  const [enrollments, setEnrollments] = useState([]);
  const [dependents, setDependents] = useState([]);
  const [policyTab, setPolicyTab] = useState('active');
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [showAddDep, setShowAddDep] = useState(false);
  const [depForm, setDepForm] = useState({ first_name: '', last_name: '', date_of_birth: '', relationship: 'spouse', ssn_last_four: '', gender: '' });
  const [saving, setSaving] = useState(false);
  const [showEditEmp, setShowEditEmp] = useState(false);
  const [empForm, setEmpForm] = useState({});
  const [editingDep, setEditingDep] = useState(null);
  const [editDepForm, setEditDepForm] = useState({});
  const [showEditStatus, setShowEditStatus] = useState(false);
  const [statusForm, setStatusForm] = useState({});

  const load = () => {
    api.get(`/employees/${id}/`).then(r => setEmployee(r.data));
    api.get(`/enrollments/?employee=${id}`).then(r => setEnrollments(r.data));
    api.get(`/dependents/?employee=${id}`).then(r => setDependents(r.data));
  };

  useEffect(load, [id]);

  const addDependent = async () => {
    if (!depForm.first_name || !depForm.last_name || !depForm.date_of_birth) return;
    setSaving(true);
    try {
      await api.post('/dependents/', { ...depForm, employee: id });
      setShowAddDep(false);
      setDepForm({ first_name: '', last_name: '', date_of_birth: '', relationship: 'spouse', ssn_last_four: '', gender: '' });
      load();
    } catch (err) {
      alert('Failed to add dependent');
    }
    setSaving(false);
  };

  const openEditEmployee = () => {
    setEmpForm({
      first_name: employee.first_name,
      last_name: employee.last_name,
      date_of_birth: employee.date_of_birth,
      ssn_last_four: employee.ssn_last_four || '',
      email: employee.email || '',
      gender: employee.gender || '',
    });
    setShowEditEmp(true);
  };

  const saveEmployee = async () => {
    setSaving(true);
    try {
      await api.patch(`/employees/${id}/`, empForm);
      setShowEditEmp(false);
      load();
    } catch (err) {
      alert('Failed to update employee');
    }
    setSaving(false);
  };

  const openEditDependent = (dep) => {
    setEditDepForm({
      first_name: dep.first_name,
      last_name: dep.last_name,
      date_of_birth: dep.date_of_birth,
      relationship: dep.relationship,
      ssn_last_four: dep.ssn_last_four || '',
      gender: dep.gender || '',
    });
    setEditingDep(dep);
  };

  const saveDependent = async () => {
    setSaving(true);
    try {
      await api.patch(`/dependents/${editingDep.id}/`, editDepForm);
      setEditingDep(null);
      load();
    } catch (err) {
      alert('Failed to update dependent');
    }
    setSaving(false);
  };

  const openEditStatus = () => {
    setStatusForm({
      hire_date: employee.hire_date,
      status: employee.status,
      termination_date: employee.termination_date || '',
      employment_class: employee.employment_class || 'full_time',
      job_title: employee.job_title || '',
      department: employee.department || '',
      work_location: employee.work_location || '',
      annual_salary: employee.annual_salary || '',
      hours_per_week: employee.hours_per_week || '',
      waive_medical: employee.waive_medical || false,
    });
    setShowEditStatus(true);
  };

  const saveStatus = async () => {
    setSaving(true);
    try {
      await api.patch(`/employees/${id}/`, statusForm);
      setShowEditStatus(false);
      load();
    } catch (err) {
      alert('Failed to update employment status');
    }
    setSaving(false);
  };

  const endEmployment = async () => {
    const date = window.prompt('Termination date (YYYY-MM-DD):', new Date().toISOString().slice(0, 10));
    if (!date) return;
    try {
      await api.patch(`/employees/${id}/`, { status: 'terminated', termination_date: date });
      load();
    } catch (err) {
      alert('Failed to end employment');
    }
  };

  const deleteDependent = async (depId) => {
    if (!window.confirm('Remove this dependent?')) return;
    try {
      await api.delete(`/dependents/${depId}/`);
      load();
    } catch (err) {
      alert('Failed to remove dependent');
    }
  };

  const addNote = () => {
    if (!newNote.trim()) return;
    setNotes([...notes, { text: newNote, time: new Date().toLocaleString(), by: 'Staff User' }]);
    setNewNote('');
  };

  if (!employee) return <div style={{ padding: 40, color: 'var(--text-muted)' }}>Loading...</div>;

  const activeEnrollments = enrollments.filter(e => ['active', 'carrier_confirmed', 'pending'].includes(e.status));
  const inactiveEnrollments = enrollments.filter(e => e.status === 'terminated');

  const displayedPolicies = policyTab === 'active' ? activeEnrollments : inactiveEnrollments;

  const planTypeColors = { medical: '#3b82f6', dental: '#7c3aed', vision: '#ea580c', life: '#16a34a' };

  return (
    <div>
      {/* Back link */}
      <Link to={`/staff/employers/${employee.employer}`} style={{ color: 'var(--accent)', textDecoration: 'none', fontSize: 14 }}>
        ← {employee.employer_name}
      </Link>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <h2 style={{ margin: 0, fontSize: 26, fontWeight: 700 }}>
            {employee.last_name}, {employee.first_name}
          </h2>
          <StatusBadge status={employee.status} />
        </div>
        <button
          className="btn-primary"
          onClick={() => navigate(`/employer`)}
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          View as employer
        </button>
      </div>

      {/* Top two-column: Employee info + Employment status */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
        {/* Employee info */}
        <div style={cardStyle}>
          <h3 style={cardHeading}>Employee info</h3>
          <div style={fieldGrid}>
            <Field label="Full name" value={employee.full_name} />
            <Field label="Member ID" value={`${employee.ssn_last_four}KC${employee.id}AJ${employee.employer_name?.substring(0, 3).toUpperCase() || ''}`} mono />
            <Field label="Date of birth" value={employee.date_of_birth} />
            <Field label="SSN (last 4)" value={`***-**-${employee.ssn_last_four}`} />
            <Field label="Email" value={employee.email} link />
            {employee.gender && <Field label="Gender" value={employee.gender.charAt(0).toUpperCase() + employee.gender.slice(1)} />}
          </div>
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)', display: 'flex', gap: 20 }}>
            <ActionLink icon="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" label="Edit" onClick={openEditEmployee} />
            <ActionLink icon="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" label="Edit dependents" onClick={() => document.getElementById('dependents-section')?.scrollIntoView({ behavior: 'smooth' })} />
          </div>
        </div>

        {/* Employment status */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={cardHeading}>Employment status</h3>
            <StatusBadge status={employee.status} />
          </div>
          <div style={fieldGrid}>
            <Field label="Hire date" value={employee.hire_date} />
            {employee.termination_date && <Field label="Termination date" value={employee.termination_date} />}
            <Field label="Employment class" value={employee.employment_class ? { full_time: 'Full-time', part_time: 'Part-time', seasonal: 'Seasonal', temporary: 'Temporary' }[employee.employment_class] || employee.employment_class : '—'} />
            {employee.job_title && <Field label="Job title" value={employee.job_title} />}
            {employee.department && <Field label="Department" value={employee.department} />}
            {employee.work_location && <Field label="Work location" value={employee.work_location} />}
            {employee.annual_salary && <Field label="Annual salary" value={`$${Number(employee.annual_salary).toLocaleString()}`} />}
            {employee.hours_per_week && <Field label="Hours / week" value={employee.hours_per_week} />}
            <Field label="Waived medical" value={employee.waive_medical ? 'Yes' : (activeEnrollments.some(e => e.plan_type === 'medical') ? 'No' : 'Yes')} />
          </div>
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)', display: 'flex', gap: 20 }}>
            <ActionLink icon="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" label="End employment" danger onClick={endEmployment} />
            <ActionLink icon="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" label="Edit details" onClick={openEditStatus} />
          </div>
        </div>
      </div>

      {/* Policies */}
      <div style={{ ...cardStyle, marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={cardHeading}>Policies</h3>
          <button className="btn-outline btn-sm" onClick={() => navigate(`/staff/employees/${id}/new-coverage`)}>+ Add new coverage</button>
        </div>
        <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)', marginBottom: 16 }}>
          <TabButton active={policyTab === 'active'} onClick={() => setPolicyTab('active')}>
            Active policies ({activeEnrollments.length})
          </TabButton>
          <TabButton active={policyTab === 'inactive'} onClick={() => setPolicyTab('inactive')}>
            Inactive policies ({inactiveEnrollments.length})
          </TabButton>
        </div>
        {displayedPolicies.length > 0 ? (
          <table style={{ width: '100%' }}>
            <thead>
              <tr>
                <th style={thStyle}>TYPE</th>
                <th style={thStyle}>PLAN</th>
                <th style={thStyle}>TIER</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>MONTHLY RATE</th>
                <th style={thStyle}>START</th>
                <th style={thStyle}>END</th>
                <th style={thStyle}></th>
              </tr>
            </thead>
            <tbody>
              {displayedPolicies.map(enrollment => (
                <tr
                  key={enrollment.id}
                  onClick={() => navigate(`/staff/enrollments/${enrollment.id}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <td style={{ padding: '12px 16px', fontWeight: 600 }}>
                    <span style={{ color: planTypeColors[enrollment.plan_type] || 'var(--text)', textTransform: 'capitalize' }}>
                      {enrollment.plan_type}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 14 }}>{enrollment.plan_name}</td>
                  <td style={{ padding: '12px 16px', fontSize: 14 }}>{enrollment.tier_display}</td>
                  <td style={{ padding: '12px 16px', fontSize: 14, textAlign: 'right', fontWeight: 600 }}>
                    ${Number(enrollment.monthly_premium).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 14 }}>{enrollment.effective_date}</td>
                  <td style={{ padding: '12px 16px', fontSize: 14 }}>{enrollment.termination_date || '—'}</td>
                  <td style={{ padding: '12px 16px' }}>
                    {enrollment.status !== 'terminated' && (
                      <span
                        style={{ color: 'var(--red)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                        onClick={e => { e.stopPropagation(); }}
                      >
                        End coverage
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
            No {policyTab} policies.
          </div>
        )}
      </div>

      {/* Dependents */}
      <div id="dependents-section" style={{ ...cardStyle, marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={cardHeading}>Dependents ({dependents.length})</h3>
          <button className="btn-outline btn-sm" onClick={() => setShowAddDep(true)}>+ Add dependent</button>
        </div>
        {dependents.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
            {dependents.map(dep => (
              <div key={dep.id} style={{
                background: 'var(--bg)',
                borderRadius: 'var(--radius)',
                padding: '16px 18px',
                border: '1px solid var(--border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
              }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{dep.full_name}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                    {dep.relationship_display} · DOB {dep.date_of_birth}
                  </div>
                  <button
                    onClick={() => openEditDependent(dep)}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                      color: 'var(--accent)', fontSize: 12, fontWeight: 600, marginTop: 6,
                    }}
                  >Edit</button>
                </div>
                <button
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer', padding: 4,
                    color: 'var(--text-muted)', flexShrink: 0,
                  }}
                  title="Remove dependent"
                  onClick={() => deleteDependent(dep.id)}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                  </svg>
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
            No dependents on file.
          </div>
        )}
      </div>

      {/* Employment record + Past employers */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24, marginBottom: 24 }}>
        <div style={cardStyle}>
          <h3 style={cardHeading}>Employment record</h3>
          <table style={{ width: '100%', marginTop: 12 }}>
            <thead>
              <tr>
                <th style={thStyle}>STATUS</th>
                <th style={thStyle}>UPDATED</th>
                <th style={thStyle}>BY USER</th>
                <th style={thStyle}>DETAILS</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ padding: '10px 16px' }}><StatusBadge status={employee.status} /></td>
                <td style={{ padding: '10px 16px', fontSize: 13 }}>{employee.hire_date}</td>
                <td style={{ padding: '10px 16px', fontSize: 13 }}>System import</td>
                <td style={{ padding: '10px 16px', fontSize: 13 }}>Hired on {employee.hire_date}</td>
              </tr>
              {employee.termination_date && (
                <tr>
                  <td style={{ padding: '10px 16px' }}><StatusBadge status="terminated" /></td>
                  <td style={{ padding: '10px 16px', fontSize: 13 }}>{employee.termination_date}</td>
                  <td style={{ padding: '10px 16px', fontSize: 13 }}>System import</td>
                  <td style={{ padding: '10px 16px', fontSize: 13 }}>Employment ended</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div style={cardStyle}>
          <h3 style={cardHeading}>Past employers</h3>
          <div style={{ padding: '16px 0', color: 'var(--text-muted)', fontSize: 14 }}>
            No past employers on file.
          </div>
        </div>
      </div>

      {/* Notes */}
      <div style={{ ...cardStyle, marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={cardHeading}>Employee notes ({notes.length})</h3>
        </div>
        {notes.length > 0 ? (
          <div style={{ marginBottom: 16 }}>
            {notes.map((note, i) => (
              <div key={i} style={{
                padding: '12px 16px',
                background: 'var(--bg)',
                borderRadius: 'var(--radius)',
                marginBottom: 8,
                border: '1px solid var(--border)',
              }}>
                <div style={{ fontSize: 14 }}>{note.text}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
                  {note.time} · {note.by}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding: '8px 0 16px', color: 'var(--text-muted)', fontSize: 14 }}>
            No notes yet.
          </div>
        )}
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={newNote}
            onChange={e => setNewNote(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addNote()}
            placeholder="Add a note..."
            style={{
              flex: 1, padding: '10px 14px', borderRadius: 8,
              border: '1px solid var(--border)', fontSize: 14,
              background: 'var(--bg)', color: 'var(--text)', outline: 'none',
            }}
          />
          <button className="btn-primary btn-sm" onClick={addNote}>+ Add note</button>
        </div>
      </div>

      {/* Change log */}
      <div style={cardStyle}>
        <h3 style={cardHeading}>Change log</h3>
        <div style={{ marginTop: 12 }}>
          <LogEntry
            title="Added from census"
            detail={`${activeEnrollments.length} coverages, ${dependents.length} dependents`}
            time={`${employee.hire_date} · System import`}
          />
        </div>
      </div>

      {/* Add Dependent Modal */}
      {showAddDep && (
        <Modal onClose={() => setShowAddDep(false)}>
          <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700 }}>Add dependent</h3>
          <p style={{ margin: '0 0 20px', fontSize: 14, color: 'var(--text-secondary)' }}>
            Add a new dependent for {employee.full_name}.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={labelStyle}>First name *</label>
              <input
                value={depForm.first_name}
                onChange={e => setDepForm({ ...depForm, first_name: e.target.value })}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Last name *</label>
              <input
                value={depForm.last_name}
                onChange={e => setDepForm({ ...depForm, last_name: e.target.value })}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Date of birth *</label>
              <input
                type="date"
                value={depForm.date_of_birth}
                onChange={e => setDepForm({ ...depForm, date_of_birth: e.target.value })}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Relationship *</label>
              <select
                value={depForm.relationship}
                onChange={e => setDepForm({ ...depForm, relationship: e.target.value })}
                style={{ ...inputStyle, cursor: 'pointer' }}
              >
                <option value="spouse">Spouse</option>
                <option value="child">Child</option>
                <option value="domestic_partner">Domestic Partner</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>SSN (last 4)</label>
              <input
                maxLength={4}
                value={depForm.ssn_last_four}
                onChange={e => setDepForm({ ...depForm, ssn_last_four: e.target.value.replace(/\D/g, '') })}
                placeholder="Optional"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Gender</label>
              <select
                value={depForm.gender}
                onChange={e => setDepForm({ ...depForm, gender: e.target.value })}
                style={{ ...inputStyle, cursor: 'pointer' }}
              >
                <option value="">—</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
            <button className="btn-outline" onClick={() => setShowAddDep(false)}>Cancel</button>
            <button className="btn-primary" onClick={addDependent} disabled={saving || !depForm.first_name || !depForm.last_name || !depForm.date_of_birth}>
              {saving ? 'Adding...' : 'Add dependent'}
            </button>
          </div>
        </Modal>
      )}

      {/* Edit Employee Modal */}
      {showEditEmp && (
        <Modal onClose={() => setShowEditEmp(false)}>
          <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700 }}>Edit employee</h3>
          <p style={{ margin: '0 0 20px', fontSize: 14, color: 'var(--text-secondary)' }}>
            Update information for {employee.full_name}.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={labelStyle}>First name *</label>
              <input value={empForm.first_name} onChange={e => setEmpForm({ ...empForm, first_name: e.target.value })} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Last name *</label>
              <input value={empForm.last_name} onChange={e => setEmpForm({ ...empForm, last_name: e.target.value })} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Date of birth *</label>
              <input type="date" value={empForm.date_of_birth} onChange={e => setEmpForm({ ...empForm, date_of_birth: e.target.value })} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>SSN (last 4)</label>
              <input maxLength={4} value={empForm.ssn_last_four} onChange={e => setEmpForm({ ...empForm, ssn_last_four: e.target.value.replace(/\D/g, '') })} style={inputStyle} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Email</label>
              <input type="email" value={empForm.email} onChange={e => setEmpForm({ ...empForm, email: e.target.value })} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Gender</label>
              <select value={empForm.gender} onChange={e => setEmpForm({ ...empForm, gender: e.target.value })} style={{ ...inputStyle, cursor: 'pointer' }}>
                <option value="">—</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
            <button className="btn-outline" onClick={() => setShowEditEmp(false)}>Cancel</button>
            <button className="btn-primary" onClick={saveEmployee} disabled={saving || !empForm.first_name || !empForm.last_name}>
              {saving ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        </Modal>
      )}

      {/* Edit Dependent Modal */}
      {editingDep && (
        <Modal onClose={() => setEditingDep(null)}>
          <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700 }}>Edit dependent</h3>
          <p style={{ margin: '0 0 20px', fontSize: 14, color: 'var(--text-secondary)' }}>
            Update information for {editingDep.full_name}.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={labelStyle}>First name *</label>
              <input value={editDepForm.first_name} onChange={e => setEditDepForm({ ...editDepForm, first_name: e.target.value })} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Last name *</label>
              <input value={editDepForm.last_name} onChange={e => setEditDepForm({ ...editDepForm, last_name: e.target.value })} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Date of birth *</label>
              <input type="date" value={editDepForm.date_of_birth} onChange={e => setEditDepForm({ ...editDepForm, date_of_birth: e.target.value })} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Relationship *</label>
              <select value={editDepForm.relationship} onChange={e => setEditDepForm({ ...editDepForm, relationship: e.target.value })} style={{ ...inputStyle, cursor: 'pointer' }}>
                <option value="spouse">Spouse</option>
                <option value="child">Child</option>
                <option value="domestic_partner">Domestic Partner</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>SSN (last 4)</label>
              <input maxLength={4} value={editDepForm.ssn_last_four} onChange={e => setEditDepForm({ ...editDepForm, ssn_last_four: e.target.value.replace(/\D/g, '') })} placeholder="Optional" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Gender</label>
              <select value={editDepForm.gender} onChange={e => setEditDepForm({ ...editDepForm, gender: e.target.value })} style={{ ...inputStyle, cursor: 'pointer' }}>
                <option value="">—</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
            <button className="btn-outline" onClick={() => setEditingDep(null)}>Cancel</button>
            <button className="btn-primary" onClick={saveDependent} disabled={saving || !editDepForm.first_name || !editDepForm.last_name}>
              {saving ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        </Modal>
      )}

      {/* Edit Employment Status Modal */}
      {showEditStatus && (
        <Modal onClose={() => setShowEditStatus(false)}>
          <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700 }}>Edit employment details</h3>
          <p style={{ margin: '0 0 20px', fontSize: 14, color: 'var(--text-secondary)' }}>
            Update employment status for {employee.full_name}.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={labelStyle}>Status</label>
              <select value={statusForm.status} onChange={e => setStatusForm({ ...statusForm, status: e.target.value })} style={{ ...inputStyle, cursor: 'pointer' }}>
                <option value="active">Active</option>
                <option value="terminated">Terminated</option>
                <option value="cobra">COBRA</option>
                <option value="on_leave">On Leave</option>
                <option value="retired">Retired</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Employment class</label>
              <select value={statusForm.employment_class} onChange={e => setStatusForm({ ...statusForm, employment_class: e.target.value })} style={{ ...inputStyle, cursor: 'pointer' }}>
                <option value="full_time">Full-time</option>
                <option value="part_time">Part-time</option>
                <option value="seasonal">Seasonal</option>
                <option value="temporary">Temporary</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Hire date</label>
              <input type="date" value={statusForm.hire_date} onChange={e => setStatusForm({ ...statusForm, hire_date: e.target.value })} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Termination date</label>
              <input type="date" value={statusForm.termination_date} onChange={e => setStatusForm({ ...statusForm, termination_date: e.target.value })} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Job title</label>
              <input value={statusForm.job_title} onChange={e => setStatusForm({ ...statusForm, job_title: e.target.value })} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Department</label>
              <input value={statusForm.department} onChange={e => setStatusForm({ ...statusForm, department: e.target.value })} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Work location</label>
              <input value={statusForm.work_location} onChange={e => setStatusForm({ ...statusForm, work_location: e.target.value })} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Annual salary ($)</label>
              <input type="number" value={statusForm.annual_salary} onChange={e => setStatusForm({ ...statusForm, annual_salary: e.target.value })} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Hours / week</label>
              <input type="number" value={statusForm.hours_per_week} onChange={e => setStatusForm({ ...statusForm, hours_per_week: e.target.value })} style={inputStyle} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 24 }}>
              <input type="checkbox" id="waive_medical" checked={statusForm.waive_medical} onChange={e => setStatusForm({ ...statusForm, waive_medical: e.target.checked })} />
              <label htmlFor="waive_medical" style={{ fontSize: 14, cursor: 'pointer' }}>Waive medical coverage</label>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
            <button className="btn-outline" onClick={() => setShowEditStatus(false)}>Cancel</button>
            <button className="btn-primary" onClick={saveStatus} disabled={saving}>
              {saving ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        </Modal>
      )}
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

function Field({ label, value, mono, link }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500, marginBottom: 2 }}>{label}</div>
      <div style={{
        fontSize: 14,
        fontFamily: mono ? 'monospace' : 'inherit',
        fontWeight: mono ? 600 : 400,
        color: link ? 'var(--accent)' : 'var(--text)',
      }}>{value}</div>
    </div>
  );
}

function ActionLink({ icon, label, danger, onClick }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 6,
      background: 'none', border: 'none', cursor: 'pointer',
      color: danger ? 'var(--red)' : 'var(--accent)',
      fontSize: 13, fontWeight: 600, padding: 0,
    }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d={icon} />
      </svg>
      {label}
    </button>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer',
        fontSize: 13, fontWeight: 600,
        color: active ? 'var(--text)' : 'var(--text-secondary)',
        borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
        marginBottom: -1,
      }}
    >
      {children}
    </button>
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

const cardStyle = {
  background: 'var(--card)',
  borderRadius: 'var(--radius-lg)',
  padding: 24,
  boxShadow: 'var(--card-shadow)',
  border: '1px solid var(--border)',
};

const cardHeading = { margin: 0, fontSize: 16, fontWeight: 700 };

const fieldGrid = { marginTop: 16 };

const thStyle = {
  padding: '8px 16px', fontSize: 11, fontWeight: 700,
  color: 'var(--text-secondary)', textAlign: 'left',
  borderBottom: '1px solid var(--border)',
};

const labelStyle = { display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 };

const inputStyle = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: 8,
  border: '1px solid var(--border)',
  fontSize: 14,
  color: 'var(--text)',
  background: 'var(--card)',
  outline: 'none',
  boxSizing: 'border-box',
};
