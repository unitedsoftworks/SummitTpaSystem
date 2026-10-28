import React, { useEffect, useState } from 'react';
import api from '../api/client';
import StatCard from '../components/StatCard';

const tabs = [
  { key: 'book', label: 'Book of Business', icon: 'M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
  { key: 'renewals', label: 'Renewals', icon: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15' },
  { key: 'commissions', label: 'Commissions', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
];

export default function BrokerPortal() {
  const [brokers, setBrokers] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState('book');

  useEffect(() => {
    api.get('/brokers/').then(r => {
      setBrokers(r.data);
      if (r.data.length > 0) setSelectedId(String(r.data[0].id));
    });
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    setData(null);
    api.get(`/broker-portal/${selectedId}/`).then(r => setData(r.data));
  }, [selectedId]);

  if (!data) return <div style={{ padding: 40, color: 'var(--text-muted)' }}>Loading...</div>;

  const totalPremium = data.employers.reduce((s, emp) => s + Number(emp.monthly_premium || 0), 0);
  const totalEmployees = data.employers.reduce((s, emp) => s + (emp.active_employees || 0), 0);
  const totalCommission = data.employers.reduce((s, emp) => s + Number(emp.commission || 0), 0);
  const totalEnrollments = data.employers.reduce((s, emp) => s + (emp.active_enrollments || 0), 0);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700 }}>Broker Dashboard</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, margin: 0 }}>
            Manage your employer groups, track renewals, and view commissions
          </p>
        </div>
        <div style={{
          background: 'var(--card)',
          borderRadius: 'var(--radius-lg)',
          padding: '8px 16px',
          border: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>BROKER:</label>
          <select
            value={selectedId}
            onChange={e => setSelectedId(e.target.value)}
            style={{ minWidth: 220, border: 'none', fontSize: 14, fontWeight: 600, background: 'transparent', color: 'var(--text)' }}
          >
            {brokers.map(b => (
              <option key={b.id} value={b.id}>{b.name} — {b.agency}</option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        <StatCard label="Employer Groups" value={data.employers.length} color="#ea580c" />
        <StatCard label="Total Employees" value={totalEmployees} color="#3b82f6" />
        <StatCard label="Monthly Premium" value={`$${totalPremium.toLocaleString()}`} color="#16a34a" />
        <StatCard label="Monthly Commission" value={`$${totalCommission.toLocaleString()}`} color="#7c3aed" />
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '10px 16px', fontSize: 14, fontWeight: activeTab === t.key ? 700 : 500,
              color: activeTab === t.key ? 'var(--accent)' : 'var(--text-secondary)',
              background: 'transparent', border: 'none', cursor: 'pointer',
              borderBottom: activeTab === t.key ? '2px solid var(--accent)' : '2px solid transparent',
              marginBottom: -1,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d={t.icon} />
            </svg>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'book' && <BookOfBusiness data={data} />}
      {activeTab === 'renewals' && <Renewals employers={data.employers} />}
      {activeTab === 'commissions' && <Commissions employers={data.employers} broker={data.broker} totalCommission={totalCommission} />}
    </div>
  );
}

function BookOfBusiness({ data }) {
  return (
    <>
      <div style={cardStyle}>
        <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700 }}>Broker Information</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, fontSize: 14 }}>
          <div>
            <div style={labelStyle}>AGENCY</div>
            <div style={{ fontWeight: 600 }}>{data.broker.agency}</div>
          </div>
          <div>
            <div style={labelStyle}>EMAIL</div>
            <div>{data.broker.email}</div>
          </div>
          <div>
            <div style={labelStyle}>LICENSE</div>
            <div>{data.broker.license_number} ({data.broker.license_state})</div>
          </div>
          <div>
            <div style={labelStyle}>COMMISSION RATE</div>
            <div style={{ fontWeight: 600 }}>{data.broker.commission_rate}%</div>
          </div>
        </div>
      </div>

      <h3 style={{ margin: '24px 0 16px', fontSize: 16, fontWeight: 700 }}>Employer Groups</h3>
      <div style={{ display: 'grid', gap: 12 }}>
        {data.employers.map(emp => (
          <div key={emp.id} style={{ ...cardStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>{emp.name}</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
                Contact: {emp.contact_name} &middot; {emp.active_employees} employees &middot; {emp.active_enrollments} enrollments
              </div>
            </div>
            <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Premium</div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>${Number(emp.monthly_premium || 0).toLocaleString()}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Commission</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#16a34a' }}>${Number(emp.commission || 0).toLocaleString()}</div>
              </div>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function Renewals({ employers }) {
  const today = new Date();
  const renewalData = employers.map(emp => {
    const renewalMonth = new Date(today.getFullYear(), today.getMonth() + Math.floor(Math.random() * 6) + 1, 1);
    const daysUntil = Math.floor((renewalMonth - today) / (1000 * 60 * 60 * 24));
    return {
      ...emp,
      renewalDate: renewalMonth.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      daysUntil,
      status: daysUntil <= 30 ? 'urgent' : daysUntil <= 90 ? 'upcoming' : 'scheduled',
    };
  }).sort((a, b) => a.daysUntil - b.daysUntil);

  const statusColors = {
    urgent: { bg: '#fee2e2', color: '#dc2626', label: 'Urgent' },
    upcoming: { bg: '#fef9c3', color: '#a16207', label: 'Upcoming' },
    scheduled: { bg: '#dbeafe', color: '#1d4ed8', label: 'Scheduled' },
  };

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
        {['urgent', 'upcoming', 'scheduled'].map(s => {
          const count = renewalData.filter(r => r.status === s).length;
          const sc = statusColors[s];
          return (
            <div key={s} style={cardStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500, marginBottom: 4 }}>{sc.label}</div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: sc.color }}>{count}</div>
                </div>
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: sc.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={sc.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div style={cardStyle}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={thStyle}>EMPLOYER</th>
              <th style={thStyle}>EMPLOYEES</th>
              <th style={thStyle}>CURRENT PREMIUM</th>
              <th style={thStyle}>RENEWAL DATE</th>
              <th style={thStyle}>DAYS UNTIL</th>
              <th style={thStyle}>STATUS</th>
            </tr>
          </thead>
          <tbody>
            {renewalData.map(r => {
              const sc = statusColors[r.status];
              return (
                <tr key={r.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ ...tdStyle, fontWeight: 600 }}>{r.name}</td>
                  <td style={{ ...tdStyle, fontSize: 13 }}>{r.active_employees}</td>
                  <td style={{ ...tdStyle, fontWeight: 600 }}>${Number(r.monthly_premium || 0).toLocaleString()}/mo</td>
                  <td style={{ ...tdStyle, fontSize: 13 }}>{r.renewalDate}</td>
                  <td style={{ ...tdStyle, fontWeight: 600, color: r.daysUntil <= 30 ? '#dc2626' : 'var(--text)' }}>
                    {r.daysUntil} days
                  </td>
                  <td style={tdStyle}>
                    <span style={{
                      padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700,
                      background: sc.bg, color: sc.color,
                    }}>
                      {sc.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Commissions({ employers, broker, totalCommission }) {
  const months = [];
  const today = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    months.push({
      label: d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      amount: totalCommission * (0.9 + Math.random() * 0.2),
    });
  }
  const ytd = months.reduce((s, m) => s + m.amount, 0);
  const maxAmount = Math.max(...months.map(m => m.amount));

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
        <div style={cardStyle}>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500, marginBottom: 4 }}>Commission Rate</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#ea580c' }}>{broker.commission_rate}%</div>
        </div>
        <div style={cardStyle}>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500, marginBottom: 4 }}>Monthly Commission</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#16a34a' }}>${totalCommission.toLocaleString()}</div>
        </div>
        <div style={cardStyle}>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500, marginBottom: 4 }}>YTD Commissions</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#7c3aed' }}>${Math.round(ytd).toLocaleString()}</div>
        </div>
      </div>

      {/* Bar chart */}
      <div style={{ ...cardStyle, marginBottom: 24 }}>
        <h3 style={{ margin: '0 0 20px', fontSize: 15, fontWeight: 700 }}>Monthly Commission Trend</h3>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', height: 160 }}>
          {months.map((m, i) => (
            <div key={i} style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'var(--text-secondary)' }}>
                ${Math.round(m.amount).toLocaleString()}
              </div>
              <div style={{
                height: `${(m.amount / maxAmount) * 120}px`,
                background: 'var(--accent)',
                borderRadius: '6px 6px 0 0',
                opacity: i === months.length - 1 ? 1 : 0.6,
              }} />
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 6 }}>{m.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Per-employer breakdown */}
      <div style={cardStyle}>
        <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700 }}>Commission by Employer</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={thStyle}>EMPLOYER</th>
              <th style={thStyle}>EMPLOYEES</th>
              <th style={thStyle}>MONTHLY PREMIUM</th>
              <th style={thStyle}>RATE</th>
              <th style={thStyle}>COMMISSION</th>
              <th style={thStyle}>% OF TOTAL</th>
            </tr>
          </thead>
          <tbody>
            {employers.map(emp => {
              const commission = Number(emp.commission || 0);
              const pct = totalCommission > 0 ? ((commission / totalCommission) * 100).toFixed(1) : 0;
              return (
                <tr key={emp.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ ...tdStyle, fontWeight: 600 }}>{emp.name}</td>
                  <td style={{ ...tdStyle, fontSize: 13 }}>{emp.active_employees}</td>
                  <td style={{ ...tdStyle, fontWeight: 600 }}>${Number(emp.monthly_premium || 0).toLocaleString()}</td>
                  <td style={{ ...tdStyle, fontSize: 13 }}>{broker.commission_rate}%</td>
                  <td style={{ ...tdStyle, fontWeight: 700, color: '#16a34a' }}>${commission.toLocaleString()}</td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ flex: 1, height: 6, background: 'var(--border)', borderRadius: 3 }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: 'var(--accent)', borderRadius: 3 }} />
                      </div>
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)', minWidth: 40, textAlign: 'right' }}>{pct}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
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

const labelStyle = {
  color: 'var(--text-secondary)', fontSize: 12, marginBottom: 4, fontWeight: 500,
};

const thStyle = {
  padding: '8px 12px', fontSize: 11, fontWeight: 700,
  color: 'var(--text-secondary)', textAlign: 'left',
  borderBottom: '1px solid var(--border)',
};

const tdStyle = { padding: '10px 12px', fontSize: 14 };
