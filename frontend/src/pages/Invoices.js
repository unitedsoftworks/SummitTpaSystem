import React, { useEffect, useState } from 'react';
import api from '../api/client';
import Table from '../components/Table';
import StatusBadge from '../components/StatusBadge';

export default function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [filter, setFilter] = useState('');

  const load = () => {
    const params = filter ? { status: filter } : {};
    api.get('/invoices/', { params }).then(r => setInvoices(r.data));
  };

  useEffect(load, [filter]);

  const handleResolve = (id) => {
    const notes = prompt('Resolution notes:');
    if (notes !== null) {
      api.post(`/invoices/${id}/resolve/`, { notes }).then(() => load());
    }
  };

  const handleMarkPaid = (id) => {
    api.post(`/invoices/${id}/mark_paid/`).then(() => load());
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Carrier Invoices</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          {['', 'pending', 'matched', 'discrepancy', 'resolved', 'paid'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '6px 14px',
                borderRadius: 6,
                border: '1px solid #ddd',
                background: filter === f ? '#4f8cff' : '#fff',
                color: filter === f ? '#fff' : '#333',
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
          { key: 'invoice_number', label: 'Invoice #' },
          { key: 'carrier_name', label: 'Carrier' },
          { key: 'employer_name', label: 'Employer' },
          { key: 'billing_period_start', label: 'Period' },
          { key: 'billed_amount', label: 'Billed', render: v => `$${Number(v).toLocaleString()}` },
          { key: 'expected_amount', label: 'Expected', render: v => `$${Number(v).toLocaleString()}` },
          { key: 'discrepancy', label: 'Discrepancy', render: (v) => {
            const n = Number(v);
            if (n === 0) return <span style={{ color: '#1e7e34' }}>$0</span>;
            return <span style={{ color: '#c62828', fontWeight: 600 }}>${n.toLocaleString()}</span>;
          }},
          { key: 'status', label: 'Status', render: v => <StatusBadge status={v} /> },
          { key: 'id', label: 'Actions', render: (v, row) => (
            <div style={{ display: 'flex', gap: 6 }}>
              {row.status === 'discrepancy' && (
                <button
                  onClick={e => { e.stopPropagation(); handleResolve(v); }}
                  style={{
                    padding: '4px 10px', borderRadius: 4, border: 'none',
                    background: '#1565c0', color: '#fff', cursor: 'pointer',
                    fontSize: 12, fontWeight: 600,
                  }}
                >
                  Resolve
                </button>
              )}
              {(row.status === 'matched' || row.status === 'resolved') && (
                <button
                  onClick={e => { e.stopPropagation(); handleMarkPaid(v); }}
                  style={{
                    padding: '4px 10px', borderRadius: 4, border: 'none',
                    background: '#1e7e34', color: '#fff', cursor: 'pointer',
                    fontSize: 12, fontWeight: 600,
                  }}
                >
                  Mark Paid
                </button>
              )}
            </div>
          )},
        ]}
        data={invoices}
      />
    </div>
  );
}
