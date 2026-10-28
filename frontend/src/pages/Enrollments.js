import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import Table from '../components/Table';
import StatusBadge from '../components/StatusBadge';

export default function Enrollments() {
  const [enrollments, setEnrollments] = useState([]);
  const [filter, setFilter] = useState('');
  const navigate = useNavigate();

  const load = () => {
    const params = filter ? { status: filter } : {};
    api.get('/enrollments/', { params }).then(r => setEnrollments(r.data));
  };

  useEffect(load, [filter]);

  const handleAction = (id, action) => {
    api.post(`/enrollments/${id}/${action}/`).then(() => load());
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Enrollments</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          {['', 'pending', 'active', 'carrier_confirmed', 'terminated'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '6px 14px',
                borderRadius: 6,
                border: '1px solid var(--border)',
                background: filter === f ? 'var(--accent)' : 'var(--card)',
                color: filter === f ? '#fff' : 'var(--text)',
                cursor: 'pointer',
                fontSize: 13,
              }}
            >
              {f === '' ? 'All' : f.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </button>
          ))}
        </div>
      </div>
      <Table
        columns={[
          { key: 'employee_name', label: 'Employee' },
          { key: 'plan_name', label: 'Plan' },
          { key: 'carrier_name', label: 'Carrier' },
          { key: 'effective_date', label: 'Effective' },
          { key: 'employee_deduction', label: 'Deduction', render: v => `$${Number(v).toLocaleString()}` },
          { key: 'member_count', label: 'Members' },
          { key: 'status', label: 'Status', render: v => <StatusBadge status={v} /> },
          { key: 'id', label: 'Actions', render: (v, row) => (
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                onClick={e => { e.stopPropagation(); navigate(`/staff/enrollments/${v}`); }}
                className="btn-outline btn-xs"
              >
                Edit
              </button>
              {row.status === 'pending' && (
                <>
                  <button
                    onClick={e => { e.stopPropagation(); handleAction(v, 'activate'); }}
                    style={btnStyle('#1e7e34')}
                  >
                    Activate
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); handleAction(v, 'confirm'); }}
                    style={btnStyle('#1565c0')}
                  >
                    Confirm
                  </button>
                </>
              )}
              {row.status === 'active' && (
                <button
                  onClick={e => { e.stopPropagation(); handleAction(v, 'confirm'); }}
                  style={btnStyle('#1565c0')}
                >
                  Carrier Confirm
                </button>
              )}
              {(row.status === 'active' || row.status === 'carrier_confirmed') && (
                <button
                  onClick={e => { e.stopPropagation(); handleAction(v, 'terminate'); }}
                  style={btnStyle('#c62828')}
                >
                  Terminate
                </button>
              )}
            </div>
          )},
        ]}
        data={enrollments}
      />
    </div>
  );
}

const btnStyle = color => ({
  padding: '4px 10px',
  borderRadius: 4,
  border: 'none',
  background: color,
  color: '#fff',
  cursor: 'pointer',
  fontSize: 12,
  fontWeight: 600,
});
