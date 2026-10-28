import React, { useEffect, useState } from 'react';
import api from '../api/client';
import Table from '../components/Table';
import StatusBadge from '../components/StatusBadge';

export default function Deductions() {
  const [deductions, setDeductions] = useState([]);
  const [employers, setEmployers] = useState([]);
  const [generating, setGenerating] = useState(false);

  const load = () => {
    api.get('/deductions/').then(r => setDeductions(r.data));
  };

  useEffect(() => {
    load();
    api.get('/employers/').then(r => setEmployers(r.data));
  }, []);

  const generateDeductions = async (employerId) => {
    setGenerating(true);
    try {
      const res = await api.post('/deductions/generate/', { employer_id: employerId });
      alert(`Generated ${res.data.created} new deductions`);
      load();
    } catch (err) {
      alert('Error generating deductions');
    }
    setGenerating(false);
  };

  const totalAmount = deductions.reduce((s, d) => s + Number(d.amount), 0);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Payroll Deductions</h2>
          <div style={{ fontSize: 14, color: '#666', marginTop: 4 }}>
            Total: ${totalAmount.toLocaleString()} across {deductions.length} deductions
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {employers.map(emp => (
            <button
              key={emp.id}
              onClick={() => generateDeductions(emp.id)}
              disabled={generating}
              style={{
                padding: '8px 16px',
                borderRadius: 6,
                border: '1px solid #4f8cff',
                background: '#4f8cff',
                color: '#fff',
                cursor: generating ? 'not-allowed' : 'pointer',
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              Generate for {emp.name.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>
      <Table
        columns={[
          { key: 'employee_name', label: 'Employee' },
          { key: 'plan_name', label: 'Plan' },
          { key: 'period_start', label: 'Period Start' },
          { key: 'period_end', label: 'Period End' },
          { key: 'amount', label: 'Amount', render: v => `$${Number(v).toLocaleString()}` },
          { key: 'status', label: 'Status', render: v => <StatusBadge status={v} /> },
        ]}
        data={deductions}
      />
    </div>
  );
}
