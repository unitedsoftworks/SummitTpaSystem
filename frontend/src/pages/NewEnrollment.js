import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/client';

const fmt = (v) => `$${Number(v).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

const STEPS = [
  { key: 'info', label: 'Personal Info' },
  { key: 'dependents', label: 'Dependents' },
  { key: 'shop', label: 'Select Plans' },
  { key: 'confirm', label: 'Confirm' },
];

const planTypeColors = { medical: '#3b82f6', dental: '#7c3aed', vision: '#ea580c', life: '#16a34a' };
const planTypeIcons = {
  medical: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z',
  dental: 'M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  vision: 'M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z',
  life: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
};
const tierLabels = { employee_only: 'Employee Only', employee_spouse: 'Employee + Spouse', employee_children: 'Employee + Children', family: 'Family' };

function deriveTier(dependentsOnPlan, allDependents) {
  if (dependentsOnPlan.length === 0) return 'employee_only';
  const hasSpouse = dependentsOnPlan.some(depId => {
    const d = allDependents.find(x => x.id === depId);
    return d && (d.relationship === 'spouse' || d.relationship === 'domestic_partner');
  });
  const hasChild = dependentsOnPlan.some(depId => {
    const d = allDependents.find(x => x.id === depId);
    return d && d.relationship === 'child';
  });
  if (hasSpouse && hasChild) return 'family';
  if (hasSpouse) return 'employee_spouse';
  if (hasChild) return 'employee_children';
  return 'employee_only';
}

export default function NewEnrollment() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [employee, setEmployee] = useState(null);
  const [dependents, setDependents] = useState([]);
  const [products, setProducts] = useState([]);
  const [existingEnrollments, setExistingEnrollments] = useState([]);
  // selectedProducts: { [productId]: { enabled: true, dependents: [depId, ...] } }
  const [cart, setCart] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [editingInfo, setEditingInfo] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [addingDependent, setAddingDependent] = useState(false);
  const [newDep, setNewDep] = useState({ first_name: '', last_name: '', date_of_birth: '', relationship: 'spouse' });

  useEffect(() => {
    Promise.all([
      api.get(`/employees/${id}/`),
      api.get(`/dependents/?employee=${id}`),
      api.get(`/enrollments/?employee=${id}&status=active`),
    ]).then(([empRes, depRes, enrRes]) => {
      const emp = empRes.data;
      setEmployee(emp);
      setDependents(depRes.data.results || depRes.data);
      setExistingEnrollments(enrRes.data.results || enrRes.data);
      api.get(`/products/?employer=${emp.employer}`).then(r => {
        setProducts((r.data.results || r.data).filter(p => p.active));
      });
    });
  }, [id]);

  const goNext = () => setStep(s => Math.min(s + 1, STEPS.length - 1));
  const goBack = () => setStep(s => Math.max(s - 1, 0));

  const toggleProduct = (productId) => {
    setCart(prev => {
      const next = { ...prev };
      if (next[productId]) {
        delete next[productId];
      } else {
        next[productId] = { enabled: true, dependents: [] };
      }
      return next;
    });
  };

  const toggleDepOnProduct = (productId, depId) => {
    setCart(prev => {
      const entry = prev[productId];
      if (!entry) return prev;
      const deps = entry.dependents.includes(depId)
        ? entry.dependents.filter(d => d !== depId)
        : [...entry.dependents, depId];
      return { ...prev, [productId]: { ...entry, dependents: deps } };
    });
  };

  const resolvedSelections = useMemo(() => {
    const result = {};
    for (const [productId, entry] of Object.entries(cart)) {
      if (!entry.enabled) continue;
      const product = products.find(p => p.id === Number(productId));
      if (!product) continue;
      const neededTier = deriveTier(entry.dependents, dependents);
      let tier = product.tiers.find(t => t.tier === neededTier);
      if (!tier) {
        const fallbackOrder = ['family', 'employee_children', 'employee_spouse', 'employee_only'];
        const idx = fallbackOrder.indexOf(neededTier);
        for (let i = idx - 1; i >= 0; i--) {
          tier = product.tiers.find(t => t.tier === fallbackOrder[i]);
          if (tier) break;
        }
        if (!tier) tier = product.tiers[0];
      }
      result[productId] = { ...entry, tier, product, neededTier };
    }
    return result;
  }, [cart, products, dependents]);

  const selectedEntries = Object.values(resolvedSelections);

  const totalMonthly = selectedEntries.reduce((s, e) => s + Number(e.tier?.monthly_premium || 0), 0);
  const totalEmployeeDeduction = selectedEntries.reduce((s, e) => s + Number(e.tier?.employee_deduction || 0), 0);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      for (const entry of selectedEntries) {
        const enrollment = await api.post('/enrollments/', {
          employee: Number(id),
          plan: entry.tier.id,
          status: 'pending',
          effective_date: new Date().toISOString().split('T')[0],
        });
        await api.post(`/enrollments/${enrollment.data.id}/add_member/`, { is_subscriber: true });
        for (const depId of entry.dependents) {
          await api.post(`/enrollments/${enrollment.data.id}/add_member/`, { dependent_id: depId });
        }
      }
      setSubmitted(true);
    } catch (e) {
      alert('Error submitting enrollment: ' + (e.response?.data?.error || e.message));
    } finally {
      setSubmitting(false);
    }
  };

  const saveEmployeeEdit = async () => {
    try {
      const res = await api.patch(`/employees/${id}/`, editForm);
      setEmployee(res.data);
      setEditingInfo(false);
    } catch (e) {
      alert('Error saving: ' + (e.response?.data?.error || e.message));
    }
  };

  const saveNewDependent = async () => {
    try {
      const res = await api.post('/dependents/', { ...newDep, employee: Number(id) });
      setDependents(prev => [...prev, res.data]);
      setAddingDependent(false);
      setNewDep({ first_name: '', last_name: '', date_of_birth: '', relationship: 'spouse' });
    } catch (e) {
      alert('Error adding dependent: ' + (e.response?.data?.error || e.message));
    }
  };

  if (!employee) return <div style={{ padding: 40, color: 'var(--text-muted)' }}>Loading...</div>;

  if (submitted) {
    return (
      <div style={{ maxWidth: 600, margin: '60px auto', textAlign: 'center' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#047857" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
        </div>
        <h2 style={{ margin: '0 0 8px', fontSize: 24 }}>Enrollment Submitted</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>
          {selectedEntries.length} plan{selectedEntries.length !== 1 ? 's' : ''} submitted for {employee.full_name}. Status: Pending.
        </p>
        <button className="btn-primary" onClick={() => navigate(`/staff/employees/${id}`)}>Back to Employee</button>
      </div>
    );
  }

  const alreadyEnrolledProductIds = existingEnrollments.map(e => {
    const prod = products.find(p => p.tiers.some(t => t.id === e.plan));
    return prod?.id;
  }).filter(Boolean);

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <button className="btn-outline btn-sm" onClick={() => navigate(`/staff/employees/${id}`)} style={{ marginBottom: 12 }}>
          &larr; Back to {employee.full_name}
        </button>
        <h2 style={{ margin: '0 0 4px', fontSize: 22 }}>New Coverage Enrollment</h2>
        <p style={{ margin: 0, fontSize: 14, color: 'var(--text-secondary)' }}>
          {employee.full_name} &middot; {employee.employer_name}
        </p>
      </div>

      {/* Stepper */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 28, background: 'var(--card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', overflow: 'hidden' }}>
        {STEPS.map((s, i) => (
          <div
            key={s.key}
            onClick={() => { if (i < step) setStep(i); }}
            style={{
              flex: 1, padding: '14px 16px', textAlign: 'center', cursor: i < step ? 'pointer' : 'default',
              background: i === step ? 'var(--accent)' : i < step ? '#F0FDFA' : 'transparent',
              borderRight: i < STEPS.length - 1 ? '1px solid var(--border)' : 'none',
              transition: 'background 0.15s',
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: i === step ? '#fff' : i < step ? 'var(--accent)' : 'var(--text-muted)', marginBottom: 2 }}>
              STEP {i + 1}
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: i === step ? '#fff' : i < step ? 'var(--text)' : 'var(--text-muted)' }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* Step content */}
      <div style={cardStyle}>
        {step === 0 && <StepInfo employee={employee} editing={editingInfo} setEditing={setEditingInfo} editForm={editForm} setEditForm={setEditForm} onSave={saveEmployeeEdit} />}
        {step === 1 && <StepDependents dependents={dependents} adding={addingDependent} setAdding={setAddingDependent} newDep={newDep} setNewDep={setNewDep} onSave={saveNewDependent} />}
        {step === 2 && <StepShop products={products} cart={cart} resolvedSelections={resolvedSelections} dependents={dependents} employee={employee} onToggleProduct={toggleProduct} onToggleDep={toggleDepOnProduct} alreadyEnrolled={alreadyEnrolledProductIds} totalMonthly={totalMonthly} totalEmployeeDeduction={totalEmployeeDeduction} />}
        {step === 3 && <StepConfirm resolvedSelections={resolvedSelections} dependents={dependents} employee={employee} totalMonthly={totalMonthly} totalEmployeeDeduction={totalEmployeeDeduction} />}
      </div>

      {/* Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
        <button className="btn-outline" onClick={goBack} disabled={step === 0} style={{ opacity: step === 0 ? 0.4 : 1 }}>
          &larr; Back
        </button>
        <div style={{ display: 'flex', gap: 10 }}>
          {step < STEPS.length - 1 && (
            <button className="btn-primary" onClick={goNext} disabled={step === 2 && selectedEntries.length === 0}>
              Continue &rarr;
            </button>
          )}
          {step === STEPS.length - 1 && (
            <button className="btn-success" onClick={handleSubmit} disabled={submitting || selectedEntries.length === 0}>
              {submitting ? 'Submitting...' : 'Submit Enrollment'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function StepInfo({ employee, editing, setEditing, editForm, setEditForm, onSave }) {
  const startEdit = () => {
    setEditForm({
      first_name: employee.first_name, last_name: employee.last_name, email: employee.email,
      phone: employee.phone || '', date_of_birth: employee.date_of_birth || '', ssn_last4: employee.ssn_last4 || '',
      address_line1: employee.address_line1 || '', address_line2: employee.address_line2 || '',
      city: employee.city || '', state: employee.state || '', zip_code: employee.zip_code || '',
    });
    setEditing(true);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h3 style={{ margin: '0 0 4px', fontSize: 18 }}>Verify Personal Information</h3>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>Confirm the employee's info is correct before shopping.</p>
        </div>
        {!editing && <button className="btn-outline btn-sm" onClick={startEdit}>Edit</button>}
      </div>
      {editing ? (
        <div>
          <div style={fieldGrid}>
            {[['first_name', 'First Name'], ['last_name', 'Last Name'], ['email', 'Email'], ['phone', 'Phone'], ['date_of_birth', 'Date of Birth'], ['ssn_last4', 'SSN Last 4']].map(([k, l]) => (
              <div key={k}>
                <label style={labelStyle}>{l}</label>
                <input type={k === 'date_of_birth' ? 'date' : 'text'} value={editForm[k] || ''} onChange={e => setEditForm(f => ({ ...f, [k]: e.target.value }))} style={inputStyle} />
              </div>
            ))}
          </div>
          <div style={{ ...fieldGrid, marginTop: 12 }}>
            {[['address_line1', 'Address'], ['address_line2', 'Address Line 2'], ['city', 'City'], ['state', 'State'], ['zip_code', 'ZIP']].map(([k, l]) => (
              <div key={k}>
                <label style={labelStyle}>{l}</label>
                <input type="text" value={editForm[k] || ''} onChange={e => setEditForm(f => ({ ...f, [k]: e.target.value }))} style={inputStyle} />
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <button className="btn-primary btn-sm" onClick={onSave}>Save</button>
            <button className="btn-outline btn-sm" onClick={() => setEditing(false)}>Cancel</button>
          </div>
        </div>
      ) : (
        <div style={fieldGrid}>
          <Field label="Full Name" value={employee.full_name} />
          <Field label="Email" value={employee.email} />
          <Field label="Phone" value={employee.phone || '—'} />
          <Field label="Date of Birth" value={employee.date_of_birth || '—'} />
          <Field label="SSN Last 4" value={employee.ssn_last4 ? `***-**-${employee.ssn_last4}` : '—'} />
          <Field label="Hire Date" value={employee.hire_date || '—'} />
          <Field label="Address" value={[employee.address_line1, employee.address_line2, employee.city, employee.state, employee.zip_code].filter(Boolean).join(', ') || '—'} />
          <Field label="Employer" value={employee.employer_name} />
        </div>
      )}
    </div>
  );
}

function StepDependents({ dependents, adding, setAdding, newDep, setNewDep, onSave }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h3 style={{ margin: '0 0 4px', fontSize: 18 }}>Review Dependents</h3>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>Add or review dependents before selecting coverage.</p>
        </div>
        {!adding && <button className="btn-outline btn-sm" onClick={() => setAdding(true)}>+ Add Dependent</button>}
      </div>
      {dependents.length === 0 && !adding && (
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No dependents on file. You can add dependents or continue with employee-only plans.</p>
      )}
      {dependents.length > 0 && (
        <table style={{ width: '100%' }}>
          <thead>
            <tr>
              <th style={thStyle}>NAME</th>
              <th style={thStyle}>RELATIONSHIP</th>
              <th style={thStyle}>DATE OF BIRTH</th>
            </tr>
          </thead>
          <tbody>
            {dependents.map(d => (
              <tr key={d.id}>
                <td style={tdStyle}>{d.first_name} {d.last_name}</td>
                <td style={tdStyle}>{d.relationship_display || d.relationship}</td>
                <td style={tdStyle}>{d.date_of_birth || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {adding && (
        <div style={{ marginTop: 16, padding: 16, background: '#F8FAFB', borderRadius: 8, border: '1px solid var(--border)' }}>
          <h4 style={{ margin: '0 0 12px', fontSize: 15 }}>New Dependent</h4>
          <div style={fieldGrid}>
            <div>
              <label style={labelStyle}>First Name</label>
              <input type="text" value={newDep.first_name} onChange={e => setNewDep(d => ({ ...d, first_name: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Last Name</label>
              <input type="text" value={newDep.last_name} onChange={e => setNewDep(d => ({ ...d, last_name: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Date of Birth</label>
              <input type="date" value={newDep.date_of_birth} onChange={e => setNewDep(d => ({ ...d, date_of_birth: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Relationship</label>
              <select value={newDep.relationship} onChange={e => setNewDep(d => ({ ...d, relationship: e.target.value }))} style={inputStyle}>
                <option value="spouse">Spouse</option>
                <option value="child">Child</option>
                <option value="domestic_partner">Domestic Partner</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
            <button className="btn-primary btn-sm" onClick={onSave} disabled={!newDep.first_name || !newDep.last_name}>Save</button>
            <button className="btn-outline btn-sm" onClick={() => setAdding(false)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

function StepShop({ products, cart, resolvedSelections, dependents, employee, onToggleProduct, onToggleDep, alreadyEnrolled, totalMonthly, totalEmployeeDeduction }) {
  const grouped = {};
  products.forEach(p => {
    if (!grouped[p.plan_type]) grouped[p.plan_type] = [];
    grouped[p.plan_type].push(p);
  });
  const hasSelections = Object.keys(resolvedSelections).length > 0;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h3 style={{ margin: '0 0 4px', fontSize: 18 }}>Select Plans &amp; Members</h3>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>Choose products, then add dependents — pricing updates automatically based on who's covered.</p>
        </div>
      </div>

      {/* Running total */}
      {hasSelections && (
        <div style={{ padding: '12px 16px', borderRadius: 10, background: '#F0FDFA', border: '1px solid #99F6E4', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 24 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 2 }}>TOTAL PREMIUM</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--accent)' }}>{fmt(totalMonthly)}<span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)' }}>/mo</span></div>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 2 }}>EMPLOYEE COST</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>{fmt(totalEmployeeDeduction)}<span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)' }}>/mo</span></div>
            </div>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            {Object.keys(resolvedSelections).length} plan{Object.keys(resolvedSelections).length !== 1 ? 's' : ''} selected
          </div>
        </div>
      )}

      {Object.keys(grouped).length === 0 && (
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No benefit products available for this employer.</p>
      )}
      {Object.entries(grouped).map(([type, prods]) => {
        const color = planTypeColors[type] || '#64748B';
        return (
          <div key={type} style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d={planTypeIcons[type] || 'M12 6v6m0 0v6m0-6h6m-6 0H6'} />
                </svg>
              </div>
              <h4 style={{ margin: 0, fontSize: 15, textTransform: 'capitalize', color }}>{type}</h4>
            </div>
            {prods.map(product => {
              const enrolled = alreadyEnrolled.includes(product.id);
              const isSelected = !!cart[product.id];
              const resolved = resolvedSelections[product.id];
              return (
                <ProductCard
                  key={product.id}
                  product={product}
                  enrolled={enrolled}
                  isSelected={isSelected}
                  resolved={resolved}
                  dependents={dependents}
                  employee={employee}
                  color={color}
                  onToggle={() => onToggleProduct(product.id)}
                  onToggleDep={(depId) => onToggleDep(product.id, depId)}
                  cart={cart}
                />
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

function ProductCard({ product, enrolled, isSelected, resolved, dependents, employee, color, onToggle, onToggleDep, cart }) {
  const entry = cart[product.id];
  const selectedDeps = entry?.dependents || [];

  return (
    <div style={{
      marginBottom: 12, borderRadius: 12, border: `${isSelected ? '2px' : '1px'} solid ${isSelected ? color : 'var(--border)'}`,
      background: isSelected ? `${color}06` : 'transparent', opacity: enrolled ? 0.5 : 1, overflow: 'hidden',
    }}>
      {/* Header — toggle product on/off */}
      <div
        onClick={enrolled ? undefined : onToggle}
        style={{
          padding: '14px 18px', cursor: enrolled ? 'default' : 'pointer',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 22, height: 22, borderRadius: 6, border: `2px solid ${isSelected ? color : 'var(--border)'}`,
            background: isSelected ? color : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.15s',
          }}>
            {isSelected && (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            )}
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>{product.name}</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{product.carrier_name}</div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          {enrolled && <span style={{ fontSize: 11, fontWeight: 600, color: '#047857', background: '#ECFDF5', padding: '3px 10px', borderRadius: 12 }}>Already Enrolled</span>}
          {isSelected && resolved?.tier && (
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color }}>{fmt(resolved.tier.monthly_premium)}<span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)' }}>/mo</span></div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{tierLabels[resolved.tier.tier] || resolved.tier.tier}</div>
            </div>
          )}
          {!isSelected && !enrolled && (
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              from {fmt(Math.min(...product.tiers.map(t => Number(t.monthly_premium))))}/mo
            </div>
          )}
        </div>
      </div>

      {/* Expanded: member assignment */}
      {isSelected && !enrolled && (
        <div style={{ padding: '0 18px 16px', borderTop: `1px solid ${color}20` }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginTop: 12, marginBottom: 8 }}>COVERED MEMBERS</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 6, background: '#F0FDFA', fontSize: 14 }}>
              <input type="checkbox" checked={true} disabled style={{ accentColor: color }} />
              <span style={{ fontWeight: 600 }}>{employee.full_name}</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', background: `${color}15`, padding: '1px 6px', borderRadius: 4 }}>Subscriber</span>
            </label>
            {dependents.map(dep => {
              const checked = selectedDeps.includes(dep.id);
              return (
                <label key={dep.id} style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 6,
                  background: checked ? '#F0FDFA' : 'transparent', border: `1px solid ${checked ? `${color}40` : 'var(--border)'}`,
                  fontSize: 14, cursor: 'pointer', transition: 'all 0.15s',
                }}>
                  <input type="checkbox" checked={checked} onChange={() => onToggleDep(dep.id)} style={{ accentColor: color }} />
                  <span>{dep.first_name} {dep.last_name}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>({dep.relationship_display || dep.relationship})</span>
                </label>
              );
            })}
            {dependents.length === 0 && (
              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '4px 0 0 12px' }}>No dependents — employee only.</p>
            )}
          </div>

          {/* Tier breakdown */}
          {resolved?.tier && (
            <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 8, background: `${color}08`, border: `1px solid ${color}20`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                <strong style={{ color: 'var(--text)' }}>{tierLabels[resolved.tier.tier] || resolved.tier.tier}</strong>
                {resolved.neededTier !== resolved.tier.tier && (
                  <span style={{ marginLeft: 8, fontSize: 11, color: '#D97706', background: '#FFFBEB', padding: '1px 6px', borderRadius: 4 }}>
                    Closest available tier
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', gap: 16, fontSize: 12 }}>
                <span>EE: <strong>{fmt(resolved.tier.employee_deduction)}</strong></span>
                <span>ER: <strong>{fmt(resolved.tier.employer_contribution)}</strong></span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StepConfirm({ resolvedSelections, dependents, employee, totalMonthly, totalEmployeeDeduction }) {
  const entries = Object.values(resolvedSelections);
  if (entries.length === 0) {
    return (
      <div>
        <h3 style={{ margin: '0 0 4px', fontSize: 18 }}>Confirm Enrollment</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 12 }}>No plans selected. Go back to select plans.</p>
      </div>
    );
  }

  return (
    <div>
      <h3 style={{ margin: '0 0 4px', fontSize: 18 }}>Confirm Enrollment</h3>
      <p style={{ margin: '0 0 20px', fontSize: 13, color: 'var(--text-secondary)' }}>Review everything before submitting.</p>

      <div style={{ padding: 16, borderRadius: 10, background: '#F0FDFA', border: '1px solid #99F6E4', marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 2 }}>Total Monthly Premium</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--accent)' }}>{fmt(totalMonthly)}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 2 }}>Employee Deduction</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)' }}>{fmt(totalEmployeeDeduction)}</div>
          </div>
        </div>
      </div>

      {entries.map(entry => {
        const color = planTypeColors[entry.product.plan_type] || '#64748B';
        const assignedDeps = dependents.filter(d => entry.dependents.includes(d.id));
        return (
          <div key={entry.product.id} style={{ marginBottom: 12, padding: 16, borderRadius: 10, border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
                <span style={{ fontSize: 15, fontWeight: 700 }}>{entry.product.name}</span>
              </div>
              <span style={{ fontSize: 14, fontWeight: 700, color }}>{fmt(entry.tier.monthly_premium)}/mo</span>
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>
              {entry.product.carrier_name} &middot; {tierLabels[entry.tier.tier] || entry.tier.tier}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              Members: <strong>{employee.full_name}</strong> (subscriber){assignedDeps.map(d => <span key={d.id}>, {d.first_name} {d.last_name}</span>)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 14 }}>{value}</div>
    </div>
  );
}

const cardStyle = {
  background: 'var(--card)',
  borderRadius: 'var(--radius-lg)',
  padding: '24px 28px',
  boxShadow: 'var(--card-shadow)',
  border: '1px solid var(--border)',
};

const fieldGrid = { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px 24px' };
const labelStyle = { display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 };
const inputStyle = { width: '100%', padding: '8px 12px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', fontSize: 14, background: 'var(--input-bg)', color: 'var(--text)' };
const thStyle = { padding: '8px 12px', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textAlign: 'left', borderBottom: '2px solid var(--border)' };
const tdStyle = { padding: '10px 12px', fontSize: 14, borderBottom: '1px solid var(--border)' };
