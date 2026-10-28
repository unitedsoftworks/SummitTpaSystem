import React, { useEffect, useState } from 'react';
import api from '../api/client';

const typeIcons = {
  plan_document: { icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', color: '#3b82f6' },
  spd: { icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', color: '#7c3aed' },
  sbc: { icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4', color: '#059669' },
  enrollment_form: { icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z', color: '#ea580c' },
  cobra_notice: { icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z', color: '#dc2626' },
  compliance: { icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z', color: '#1d4ed8' },
  invoice: { icon: 'M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z', color: '#16a34a' },
  census: { icon: 'M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z', color: '#0891b2' },
  id_card: { icon: 'M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2', color: '#a855f7' },
  other: { icon: 'M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z', color: '#6b7280' },
};

const fileExtColors = {
  pdf: '#dc2626',
  xlsx: '#16a34a',
  docx: '#3b82f6',
};

export default function Documents() {
  const [docs, setDocs] = useState([]);
  const [typeFilter, setTypeFilter] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  useEffect(() => {
    const params = new URLSearchParams();
    if (typeFilter) params.set('document_type', typeFilter);
    if (search) params.set('search', search);
    api.get(`/documents/?${params}`).then(r => setDocs(r.data));
  }, [typeFilter, search]);

  const handleSearch = (e) => {
    e.preventDefault();
    setSearch(searchInput);
  };

  const typeCounts = {};
  docs.forEach(d => {
    typeCounts[d.document_type] = (typeCounts[d.document_type] || 0) + 1;
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 600, marginBottom: 4 }}>Administration</div>
          <h2 style={{ margin: '0 0 6px', fontSize: 24, fontWeight: 700 }}>Document Management</h2>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--text-secondary)', maxWidth: 600 }}>
            Manage plan documents, compliance filings, and employer records.
          </p>
        </div>
        <button
          onClick={() => alert('Upload document flow would go here')}
          style={{
            padding: '10px 20px', borderRadius: 8, border: 'none',
            background: 'var(--accent)', color: '#fff', fontSize: 14,
            fontWeight: 600, cursor: 'pointer',
          }}
        >
          Upload Document
        </button>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10, marginBottom: 24 }}>
        {[
          { label: 'Total', value: docs.length, color: '#3b82f6' },
          { label: 'Plan Docs', value: typeCounts.plan_document || 0, color: '#7c3aed' },
          { label: 'Compliance', value: typeCounts.compliance || 0, color: '#1d4ed8' },
          { label: 'Forms', value: (typeCounts.enrollment_form || 0) + (typeCounts.cobra_notice || 0), color: '#ea580c' },
          { label: 'Census', value: typeCounts.census || 0, color: '#0891b2' },
        ].map((s, i) => (
          <div key={i} style={cardStyle}>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 500, marginBottom: 2 }}>{s.label}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Search + filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <form onSubmit={handleSearch} style={{ flex: 1 }}>
          <input
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="Search documents..."
            style={{
              width: '100%', padding: '10px 14px', borderRadius: 8,
              border: '1px solid var(--border)', fontSize: 14,
              background: 'var(--card)', color: 'var(--text)', outline: 'none',
            }}
          />
        </form>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={selectStyle}>
          <option value="">All types</option>
          <option value="plan_document">Plan Document</option>
          <option value="spd">Summary Plan Description</option>
          <option value="sbc">Summary of Benefits</option>
          <option value="enrollment_form">Enrollment Form</option>
          <option value="cobra_notice">COBRA Notice</option>
          <option value="compliance">Compliance Filing</option>
          <option value="invoice">Invoice</option>
          <option value="census">Census File</option>
          <option value="id_card">ID Card Template</option>
          <option value="other">Other</option>
        </select>
      </div>

      {/* Document list */}
      <div style={{ display: 'grid', gap: 8 }}>
        {docs.map(doc => {
          const ti = typeIcons[doc.document_type] || typeIcons.other;
          const ext = doc.file_name.split('.').pop().toLowerCase();
          const extColor = fileExtColors[ext] || '#6b7280';
          return (
            <div key={doc.id} style={{
              ...cardStyle, padding: '14px 20px',
              display: 'flex', alignItems: 'center', gap: 16,
              cursor: 'pointer', transition: 'box-shadow 0.15s',
            }}>
              <div style={{
                width: 42, height: 42, borderRadius: 10,
                background: `${ti.color}15`, display: 'flex',
                alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={ti.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d={ti.icon} />
                </svg>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 2 }}>{doc.title}</div>
                <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--text-secondary)' }}>
                  <span>{doc.document_type_display}</span>
                  {doc.employer_name && <span>&middot; {doc.employer_name}</span>}
                  <span>&middot; {doc.uploaded_by}</span>
                  <span>&middot; {new Date(doc.created_at).toLocaleDateString()}</span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
                <span style={{
                  padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700,
                  background: `${extColor}15`, color: extColor, textTransform: 'uppercase',
                }}>
                  {ext}
                </span>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)', minWidth: 60, textAlign: 'right' }}>
                  {doc.file_size_display}
                </span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </div>
            </div>
          );
        })}
      </div>
      {docs.length === 0 && (
        <div style={{ ...cardStyle, padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
          No documents found. Upload a document to get started.
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
