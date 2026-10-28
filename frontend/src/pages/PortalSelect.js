import React from 'react';
import { useNavigate } from 'react-router-dom';

const portals = [
  {
    key: 'staff',
    title: 'Staff Portal',
    subtitle: 'Benefits Administration',
    desc: 'Full system access. Manage employers, employees, enrollments, invoicing, carrier reconciliation, and reporting.',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"/>
      </svg>
    ),
    color: '#0D9488',
    path: '/staff',
  },
  {
    key: 'employer',
    title: 'Employer Portal',
    subtitle: 'Group Management',
    desc: 'View your employee roster, benefit plans, invoices, payment history, and deduction schedules.',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/>
      </svg>
    ),
    color: '#059669',
    path: '/employer',
  },
  {
    key: 'employee',
    title: 'Employee Portal',
    subtitle: 'My Benefits',
    desc: 'View your benefit elections, coverage details, payroll deductions, and carrier confirmations.',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
      </svg>
    ),
    color: '#2DD4BF',
    path: '/employee',
  },
  {
    key: 'broker',
    title: 'Broker Portal',
    subtitle: 'Book of Business',
    desc: 'Track your employer groups, premium volume, commissions, and enrollment activity.',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/><rect width="20" height="14" x="2" y="6" rx="2"/>
      </svg>
    ),
    color: '#F59E0B',
    path: '/broker',
  },
];

export default function PortalSelect() {
  const navigate = useNavigate();

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0B1120 0%, #0F172A 50%, #0B1120 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 20px',
    }}>
      <div style={{ textAlign: 'center', marginBottom: 48 }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 12,
        }}>
          <svg width="44" height="44" viewBox="0 0 120 120" fill="none">
            <path d="M20 104L52 16L64 16L32 104Z" fill="#0D9488" opacity="0.4"/>
            <path d="M40 104L72 16L84 16L52 104Z" fill="#0D9488" opacity="0.65"/>
            <path d="M60 104L92 16L104 16L72 104Z" fill="#0D9488"/>
          </svg>
          <h1 style={{
            fontFamily: 'Lexend, sans-serif',
            color: '#fff',
            fontSize: 32,
            fontWeight: 800,
            letterSpacing: '-1px',
          }}>
            Summit<span style={{ color: '#0D9488' }}>Health</span>
          </h1>
        </div>
        <p style={{
          color: '#64748B',
          fontSize: 16,
          fontWeight: 400,
        }}>
          Benefits Administration Platform
        </p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: 20,
        maxWidth: 720,
        width: '100%',
      }}>
        {portals.map(portal => (
          <div
            key={portal.key}
            onClick={() => navigate(portal.path)}
            style={{
              background: 'rgba(30,41,59,0.5)',
              backdropFilter: 'blur(12px)',
              border: '1px solid #1E293B',
              borderRadius: 16,
              padding: 28,
              cursor: 'pointer',
              transition: 'all 0.2s',
              position: 'relative',
              overflow: 'hidden',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(30,41,59,0.8)';
              e.currentTarget.style.borderColor = portal.color;
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(30,41,59,0.5)';
              e.currentTarget.style.borderColor = '#1E293B';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <div style={{ color: portal.color, marginBottom: 16 }}>
              {portal.icon}
            </div>
            <h3 style={{
              fontFamily: 'Lexend, sans-serif',
              color: '#E2E8F0',
              fontSize: 18,
              fontWeight: 700,
              marginBottom: 2,
            }}>
              {portal.title}
            </h3>
            <div style={{
              color: portal.color,
              fontSize: 12,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: 10,
            }}>
              {portal.subtitle}
            </div>
            <p style={{
              color: '#64748B',
              fontSize: 13,
              lineHeight: 1.5,
            }}>
              {portal.desc}
            </p>
          </div>
        ))}
      </div>

      <p style={{
        color: '#334155',
        fontSize: 12,
        marginTop: 40,
      }}>
        Summit Health Administration
      </p>
    </div>
  );
}
