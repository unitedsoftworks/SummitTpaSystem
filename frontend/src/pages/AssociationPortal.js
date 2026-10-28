import React, { useEffect, useState } from 'react';
import api from '../api/client';

export default function AssociationPortal() {
  const [associations, setAssociations] = useState([]);
  const [selected, setSelected] = useState(null);
  const [portalData, setPortalData] = useState(null);

  useEffect(() => {
    api.get('/associations/').then(r => {
      setAssociations(r.data);
      if (r.data.length > 0) setSelected(r.data[0].id);
    });
  }, []);

  useEffect(() => {
    if (selected) {
      api.get(`/association-portal/${selected}/`).then(r => setPortalData(r.data));
    }
  }, [selected]);

  if (!portalData) return <div style={{ padding: 40, color: 'var(--text-muted)' }}>Loading...</div>;

  const { association, employers, summary } = portalData;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 13, color: '#0891b2', fontWeight: 600, marginBottom: 4 }}>Association</div>
          <h2 style={{ margin: '0 0 6px', fontSize: 24, fontWeight: 700 }}>Association Dashboard</h2>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--text-secondary)', maxWidth: 600 }}>
            Overview of member employer groups, employees, and premium volume.
          </p>
        </div>
        {associations.length > 1 && (
          <select
            value={selected || ''}
            onChange={e => setSelected(Number(e.target.value))}
            style={selectStyle}
          >
            {associations.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        )}
      </div>

      {/* Association info */}
      <div style={{ ...cardStyle, marginBottom: 20, display: 'flex', gap: 40, alignItems: 'center' }}>
        <div style={{
          width: 56, height: 56, borderRadius: 14,
          background: '#0891b210', display: 'flex',
          alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#0891b2" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" />
          </svg>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{association.name}</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            {association.association_type === 'chamber' ? 'Chamber of Commerce' :
             association.association_type === 'trade' ? 'Trade Association' :
             association.association_type === 'professional' ? 'Professional Association' : 'Industry Group'}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
          <div>
            <div style={labelStyle}>CONTACT</div>
            <div style={{ fontSize: 14, fontWeight: 500 }}>{association.contact_name}</div>
          </div>
          <div>
            <div style={labelStyle}>EMAIL</div>
            <div style={{ fontSize: 14, fontWeight: 500 }}>{association.contact_email}</div>
          </div>
          <div>
            <div style={labelStyle}>PHONE</div>
            <div style={{ fontSize: 14, fontWeight: 500 }}>{association.contact_phone || '—'}</div>
          </div>
        </div>
      </div>

      {/* Summary stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 28 }}>
        <div style={cardStyle}>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500, marginBottom: 4 }}>Member Groups</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#0891b2' }}>{summary.total_employers}</div>
        </div>
        <div style={cardStyle}>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500, marginBottom: 4 }}>Total Employees</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#3b82f6' }}>{summary.total_employees}</div>
        </div>
        <div style={cardStyle}>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500, marginBottom: 4 }}>Monthly Premium</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#059669' }}>
            ${Number(summary.total_monthly_premium).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* Employer groups */}
      <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Member Employer Groups</h3>
      <div style={{ display: 'grid', gap: 12 }}>
        {employers.map(emp => (
          <div key={emp.id} style={{ ...cardStyle, padding: '18px 24px', display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: '#3b82f608', display: 'flex',
              alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              fontSize: 18, fontWeight: 700, color: '#3b82f6',
            }}>
              {emp.name.charAt(0)}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 2 }}>{emp.name}</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                Contact: {emp.contact_name} &middot; {emp.contact_email}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, auto)', gap: 28, textAlign: 'right' }}>
              <div>
                <div style={labelStyle}>EMPLOYEES</div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>{emp.active_employees}</div>
              </div>
              <div>
                <div style={labelStyle}>ENROLLMENTS</div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>{emp.active_enrollments}</div>
              </div>
              <div>
                <div style={labelStyle}>PREMIUM</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#059669' }}>
                  ${Number(emp.monthly_premium).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      {employers.length === 0 && (
        <div style={{ ...cardStyle, padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
          No member employer groups found.
        </div>
      )}
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
const labelStyle = {
  fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 4, letterSpacing: '0.5px',
};
