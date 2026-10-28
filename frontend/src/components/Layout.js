import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import api from '../api/client';

const portalConfigs = {
  staff: {
    label: 'Staff Portal',
    color: '#3b82f6',
    groups: [
      {
        label: 'People',
        items: [
          { path: '/staff/employers', label: 'Employers', desc: 'Manage employer groups' },
          { path: '/staff/employees', label: 'Employees', desc: 'Member records & details' },
          { path: '/staff/dependents', label: 'Dependents', desc: 'Dependent records & aging' },
          { path: '/staff/associations', label: 'Associations', desc: 'Buying groups & associations' },
          { path: '/staff/eligibility', label: 'Eligibility', desc: 'Coverage verification' },
          { path: '/staff/life-events', label: 'Life Events', desc: 'Qualifying event processing' },
        ],
      },
      {
        label: 'Benefits',
        items: [
          { path: '/staff/enrollments', label: 'Enrollments', desc: 'Plan enrollment management' },
          { path: '/staff/open-enrollment', label: 'Open Enrollment', desc: 'Annual enrollment periods' },
          { path: '/staff/cobra', label: 'COBRA', desc: 'Continuation coverage admin' },
          { path: '/staff/carriers', label: 'Carriers', desc: 'Insurance carrier management' },
          { path: '/staff/plans', label: 'Plan Management', desc: 'Rates, tiers & plan config' },
        ],
      },
      {
        label: 'Finance',
        items: [
          { path: '/staff/claims', label: 'Claims', desc: 'Claims processing & review' },
          { path: '/staff/invoices', label: 'Carrier Invoices', desc: 'Carrier billing' },
          { path: '/staff/employer-invoices', label: 'Employer Invoices', desc: 'Monthly billing to employers' },
          { path: '/staff/deductions', label: 'Deductions', desc: 'Payroll deduction schedules' },
          { path: '/staff/reimbursements', label: 'Reimbursements', desc: 'HRA/FSA reimbursement requests' },
          { path: '/staff/payments', label: 'Payments', desc: 'Employer premium payments' },
          { path: '/staff/finance', label: 'Finance Summary', desc: 'Revenue & cash flow overview' },
        ],
      },
      {
        label: 'Operations',
        items: [
          { path: '/staff/exceptions', label: 'Exceptions', desc: 'Alerts & action items' },
          { path: '/staff/documents', label: 'Documents', desc: 'Plan docs & compliance filings' },
          { path: '/staff/messages', label: 'Messages', desc: 'Internal communications' },
          { path: '/staff/reports', label: 'Reports', desc: 'Analytics & reporting' },
          { path: '/staff/compliance', label: 'Compliance', desc: 'Regulatory filings & deadlines' },
          { path: '/staff/audit-log', label: 'Audit Log', desc: 'System activity history' },
        ],
      },
    ],
  },
  employer: {
    label: 'Employer Portal',
    color: '#16a34a',
    groups: [
      {
        label: 'Manage',
        items: [
          { path: '/employer/employees', label: 'Employees', desc: 'Your workforce roster' },
          { path: '/employer/enrollments', label: 'Enrollments', desc: 'Plan enrollments' },
          { path: '/employer/invoices', label: 'Invoices & Payments', desc: 'Billing history' },
          { path: '/employer/deductions', label: 'Deduction Schedule', desc: 'Payroll deductions' },
        ],
      },
    ],
  },
  employee: {
    label: 'Employee Portal',
    color: '#7c3aed',
    groups: [],
  },
  broker: {
    label: 'Broker Portal',
    color: '#ea580c',
    groups: [],
  },
};

function Dropdown({ group, color, isActive, portalPrefix }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const location = useLocation();
  const timeoutRef = useRef(null);

  const groupActive = group.items.some(
    item => location.pathname === item.path || location.pathname.startsWith(item.path + '/')
  );

  useEffect(() => {
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, []);

  const handleEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setOpen(true);
  };
  const handleLeave = () => {
    timeoutRef.current = setTimeout(() => setOpen(false), 150);
  };

  return (
    <div
      ref={ref}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      style={{ position: 'relative' }}
    >
      <button
        onClick={() => setOpen(!open)}
        style={{
          background: 'none', border: 'none', padding: '8px 14px',
          fontSize: 14, fontWeight: groupActive ? 600 : 500,
          color: groupActive ? color : 'var(--text-secondary)',
          cursor: 'pointer', borderRadius: 8,
          display: 'flex', alignItems: 'center', gap: 4,
          transition: 'color 0.15s',
        }}
      >
        {group.label}
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0,
          background: 'var(--card)', borderRadius: 12,
          boxShadow: '0 12px 40px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.06)',
          border: '1px solid var(--border)',
          padding: 6, minWidth: 240, zIndex: 100,
          animation: 'dropIn 0.15s ease-out',
        }}>
          {group.items.map(item => {
            const active = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setOpen(false)}
                style={{
                  display: 'block', padding: '10px 14px',
                  borderRadius: 8, textDecoration: 'none',
                  background: active ? `${color}0a` : 'transparent',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.background = '#f8fafc'; }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
              >
                <div style={{ fontSize: 14, fontWeight: active ? 600 : 500, color: active ? color : 'var(--text)', marginBottom: 1 }}>
                  {item.label}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{item.desc}</div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SearchBar({ portal }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ employees: [], employers: [], claims: [] });
  const navigate = useNavigate();
  const ref = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (!query || query.length < 2) { setResults({ employees: [], employers: [], claims: [] }); return; }
    const timer = setTimeout(() => {
      Promise.all([
        api.get(`/employees/?search=${encodeURIComponent(query)}`).then(r => r.data).catch(() => []),
        api.get(`/employers/?search=${encodeURIComponent(query)}`).then(r => r.data).catch(() => []),
        api.get(`/claims/?search=${encodeURIComponent(query)}`).then(r => r.data).catch(() => []),
      ]).then(([employees, employers, claims]) => {
        setResults({
          employees: (employees || []).slice(0, 4),
          employers: (employers || []).slice(0, 4),
          claims: (claims || []).slice(0, 4),
        });
      });
    }, 200);
    return () => clearTimeout(timer);
  }, [query]);

  const hasResults = results.employees.length + results.employers.length + results.claims.length > 0;

  const goTo = (path) => { navigate(path); setOpen(false); setQuery(''); };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 50); }}
        style={{
          width: 36, height: 36, borderRadius: 8, border: 'none',
          background: open ? 'var(--border)' : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', color: 'var(--text-muted)', transition: 'all 0.15s',
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', right: 0, marginTop: 4,
          width: 380, background: 'var(--card)', borderRadius: 12,
          boxShadow: '0 12px 40px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.06)',
          border: '1px solid var(--border)', zIndex: 200,
          animation: 'dropIn 0.15s ease-out',
        }}>
          <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)' }}>
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search employees, employers, claims..."
              style={{
                width: '100%', border: 'none', outline: 'none', fontSize: 14,
                background: 'transparent', color: 'var(--text)',
              }}
            />
          </div>
          <div style={{ maxHeight: 360, overflow: 'auto', padding: 6 }}>
            {query.length < 2 && (
              <div style={{ padding: '16px 10px', textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
                Type at least 2 characters to search
              </div>
            )}
            {query.length >= 2 && !hasResults && (
              <div style={{ padding: '16px 10px', textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
                No results found
              </div>
            )}
            {results.employees.length > 0 && (
              <>
                <div style={{ padding: '8px 10px 4px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Employees</div>
                {results.employees.map(e => (
                  <div key={e.id} onClick={() => goTo(`/staff/employees/${e.id}`)}
                    style={{ padding: '8px 10px', borderRadius: 6, cursor: 'pointer', transition: 'background 0.1s' }}
                    onMouseEnter={ev => ev.currentTarget.style.background = '#f8fafc'}
                    onMouseLeave={ev => ev.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{e.full_name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{e.employer_name}</div>
                  </div>
                ))}
              </>
            )}
            {results.employers.length > 0 && (
              <>
                <div style={{ padding: '8px 10px 4px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Employers</div>
                {results.employers.map(e => (
                  <div key={e.id} onClick={() => goTo(`/staff/employers/${e.id}`)}
                    style={{ padding: '8px 10px', borderRadius: 6, cursor: 'pointer', transition: 'background 0.1s' }}
                    onMouseEnter={ev => ev.currentTarget.style.background = '#f8fafc'}
                    onMouseLeave={ev => ev.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{e.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{e.active_employee_count} employees</div>
                  </div>
                ))}
              </>
            )}
            {results.claims.length > 0 && (
              <>
                <div style={{ padding: '8px 10px 4px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Claims</div>
                {results.claims.map(c => (
                  <div key={c.id} onClick={() => goTo(`/staff/claims/${c.id}`)}
                    style={{ padding: '8px 10px', borderRadius: 6, cursor: 'pointer', transition: 'background 0.1s' }}
                    onMouseEnter={ev => ev.currentTarget.style.background = '#f8fafc'}
                    onMouseLeave={ev => ev.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{c.claim_number}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{c.employee_name} &middot; ${c.billed_amount}</div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ThemeToggle() {
  const [dark, setDark] = useState(() => document.documentElement.getAttribute('data-theme') === 'dark');
  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light');
    try { localStorage.setItem('summit-theme', next ? 'dark' : 'light'); } catch(e) {}
  };
  return (
    <button onClick={toggle} style={{
      width: 36, height: 36, borderRadius: 8, border: 'none',
      background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center',
      cursor: 'pointer', color: 'var(--text-muted)', padding: 0, transition: 'all 0.15s',
    }}>
      {dark ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
        </svg>
      )}
    </button>
  );
}

function Breadcrumb({ portal }) {
  const location = useLocation();
  const parts = location.pathname.split('/').filter(Boolean);
  if (parts.length <= 1) return null;

  const crumbs = parts.map((p, i) => ({
    label: p.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    path: '/' + parts.slice(0, i + 1).join('/'),
  }));

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>
      {crumbs.map((c, i) => (
        <React.Fragment key={c.path}>
          {i > 0 && <span style={{ opacity: 0.4 }}>/</span>}
          {i < crumbs.length - 1 ? (
            <Link to={c.path} style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>{c.label}</Link>
          ) : (
            <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{c.label}</span>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

export default function Layout({ portal, children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const config = portalConfigs[portal] || portalConfigs.staff;

  useEffect(() => {
    try {
      const saved = localStorage.getItem('summit-theme');
      if (saved) document.documentElement.setAttribute('data-theme', saved);
    } catch(e) {}
  }, []);

  const dashPath = `/${portal}`;
  const isDash = location.pathname === dashPath;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{
        background: 'var(--card)',
        borderBottom: '1px solid var(--border)',
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <div style={{
          maxWidth: 1400, margin: '0 auto',
          padding: '0 32px', height: 60,
          display: 'flex', alignItems: 'center', gap: 0,
        }}>
          {/* Logo */}
          <div
            onClick={() => navigate('/')}
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, marginRight: 8, flexShrink: 0 }}
          >
            <svg width="30" height="30" viewBox="0 0 40 40" fill="none">
              <rect width="40" height="40" rx="10" fill={config.color}/>
              <path d="M12 28L20 12L28 28H12Z" fill="white" opacity="0.9"/>
              <path d="M16 28L20 20L24 28H16Z" fill="white"/>
            </svg>
            <span style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.3px', color: 'var(--text)' }}>
              Summit
            </span>
          </div>

          {/* Portal badge */}
          <span style={{
            padding: '4px 10px', borderRadius: 6,
            fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '0.5px',
            background: `${config.color}10`, color: config.color,
            marginRight: 20, flexShrink: 0,
          }}>
            {config.label}
          </span>

          {/* Nav */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
            <Link
              to={dashPath}
              style={{
                padding: '8px 14px', borderRadius: 8,
                fontSize: 14, fontWeight: isDash ? 600 : 500,
                color: isDash ? config.color : 'var(--text-secondary)',
                textDecoration: 'none', transition: 'color 0.15s',
              }}
            >
              Dashboard
            </Link>
            {config.groups.map(g => (
              <Dropdown key={g.label} group={g} color={config.color} portalPrefix={portal} />
            ))}
          </nav>

          {/* Right side: search, notifications, portal switch */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
            <ThemeToggle />
            {portal === 'staff' && <SearchBar portal={portal} />}
            {portal === 'staff' && (
              <Link
                to="/staff/notifications"
                style={{
                  width: 36, height: 36, borderRadius: 8,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: location.pathname === '/staff/notifications' ? `${config.color}10` : 'transparent',
                  color: location.pathname === '/staff/notifications' ? config.color : 'var(--text-muted)',
                  transition: 'all 0.15s', textDecoration: 'none',
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </Link>
            )}
            <button
              onClick={() => navigate('/')}
              style={{
                background: 'none', border: '1px solid var(--border)',
                padding: '7px 14px', borderRadius: 8, fontSize: 13,
                fontWeight: 500, color: 'var(--text-secondary)',
                display: 'flex', alignItems: 'center', gap: 6,
                cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2v-4M9 21H5a2 2 0 01-2-2v-4" />
              </svg>
              Switch
            </button>
          </div>
        </div>
      </header>

      <main style={{
        flex: 1,
        maxWidth: 1400, width: '100%',
        margin: '0 auto',
        padding: '28px 32px',
      }}>
        <Breadcrumb portal={portal} />
        {children}
      </main>
    </div>
  );
}
