// App shell: persistent sidebar (desktop) / drawer (mobile), top bar with theme
// toggle, notifications, and account menu, plus an outlet for the routed page.

import { useState, useMemo } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../store/AuthContext.jsx';
import { useData } from '../store/DataContext.jsx';
import { useSettings } from '../store/SettingsContext.jsx';
import { buildAlerts } from '../lib/selectors.js';
import {
  IconDashboard, IconIncome, IconExpense, IconList, IconBudget, IconGoal,
  IconRecurring, IconReports, IconProfile, IconBell, IconSun, IconMoon,
  IconMenu, IconClose,
} from './icons.jsx';

const NAV = [
  { to: '/', label: 'Dashboard', end: true, Icon: IconDashboard },
  { to: '/income', label: 'Income', Icon: IconIncome },
  { to: '/expenses', label: 'Expenses', Icon: IconExpense },
  { to: '/transactions', label: 'Transactions', Icon: IconList },
  { to: '/budgets', label: 'Budgets', Icon: IconBudget },
  { to: '/goals', label: 'Savings goals', Icon: IconGoal },
  { to: '/recurring', label: 'Recurring', Icon: IconRecurring },
  { to: '/reports', label: 'Reports', Icon: IconReports },
  { to: '/profile', label: 'Profile', Icon: IconProfile },
];

function NavItems({ onNavigate }) {
  return (
    <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {NAV.map(({ to, label, end, Icon }) => (
        <NavLink
          key={to} to={to} end={end} onClick={onNavigate}
          className={({ isActive }) => 'navlink' + (isActive ? ' active' : '')}
        >
          <Icon /> {label}
        </NavLink>
      ))}
    </nav>
  );
}

export default function AppShell() {
  const { user, logout } = useAuth();
  const data = useData();
  const { resolvedTheme, toggleTheme } = useSettings();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const alerts = useMemo(() => buildAlerts(data, data.dismissed), [data]);

  const initials = (user?.name || user?.email || '?')
    .split(' ').map(s => s[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="app-grid" style={{ display: 'grid', gridTemplateColumns: '232px 1fr', minHeight: '100vh' }}>
      <aside className="desktop-sidebar" style={{ borderRight: '1px solid var(--line)', background: 'var(--surface)', padding: '22px 16px', position: 'sticky', top: 0, height: '100vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontFamily: 'var(--font-num)', fontSize: 21, fontWeight: 600, padding: '0 8px 22px', letterSpacing: '-0.02em' }}>RupeeFlow</div>
        <NavItems />
        <div style={{ marginTop: 'auto', fontSize: 12, color: 'var(--ink-faint)', padding: '0 8px' }}>
          Local storage · single device
        </div>
      </aside>

      {/* mobile drawer */}
      {drawerOpen && (
        <>
          <div className="drawer-backdrop" onClick={() => setDrawerOpen(false)} />
          <aside className="mobile-drawer">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 8px 22px' }}>
              <span style={{ fontFamily: 'var(--font-num)', fontSize: 21, fontWeight: 600, letterSpacing: '-0.02em' }}>RupeeFlow</span>
              <button className="btn ghost" aria-label="Close menu" onClick={() => setDrawerOpen(false)}><IconClose /></button>
            </div>
            <NavItems onNavigate={() => setDrawerOpen(false)} />
          </aside>
        </>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <header style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 28px', borderBottom: '1px solid var(--line)', background: 'var(--paper)', position: 'sticky', top: 0, zIndex: 20 }}>
          <button className="btn ghost hamburger" aria-label="Open menu" onClick={() => setDrawerOpen(true)}><IconMenu /></button>
          <div style={{ flex: 1 }} />

          {/* theme toggle */}
          <button className="btn ghost" aria-label="Toggle dark mode" onClick={toggleTheme} title={resolvedTheme === 'dark' ? 'Switch to light' : 'Switch to dark'}>
            {resolvedTheme === 'dark' ? <IconSun /> : <IconMoon />}
          </button>

          {/* notifications */}
          <div style={{ position: 'relative' }}>
            <button className="btn ghost" aria-label="Notifications" onClick={() => { setBellOpen(o => !o); setMenuOpen(false); }} style={{ position: 'relative' }}>
              <IconBell />
              {alerts.length > 0 && (
                <span style={{ position: 'absolute', top: 2, right: 2, minWidth: 16, height: 16, padding: '0 4px', borderRadius: 999, background: 'var(--clay)', color: '#fff', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{alerts.length}</span>
              )}
            </button>
            {bellOpen && (
              <Dropdown onClose={() => setBellOpen(false)} width={320}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--line)', fontWeight: 500 }}>Notifications</div>
                {alerts.length === 0 ? (
                  <p className="muted" style={{ padding: 16, fontSize: 14, margin: 0 }}>You're all caught up.</p>
                ) : (
                  <div className="ruled" style={{ maxHeight: 360, overflowY: 'auto' }}>
                    {alerts.map(a => (
                      <div key={a.id} style={{ padding: '12px 16px', display: 'flex', gap: 10 }}>
                        <Dot kind={a.kind} />
                        <div style={{ flex: 1 }}>
                          <p style={{ margin: 0, fontSize: 14, fontWeight: 500 }}>{a.title}</p>
                          <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--ink-soft)' }}>{a.body}</p>
                        </div>
                        <button className="btn ghost sm" onClick={() => data.dismissAlert(a.id)} aria-label="Dismiss"><IconClose width={14} height={14} /></button>
                      </div>
                    ))}
                  </div>
                )}
              </Dropdown>
            )}
          </div>

          {/* account */}
          <div style={{ position: 'relative' }}>
            <button className="btn ghost" onClick={() => { setMenuOpen(o => !o); setBellOpen(false); }} style={{ gap: 9 }}>
              <span style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--evergreen-bg)', color: 'var(--evergreen-d)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600 }}>{initials}</span>
              <span className="hide-sm" style={{ fontSize: 14, fontWeight: 500 }}>{user?.name || 'Account'}</span>
            </button>
            {menuOpen && (
              <Dropdown onClose={() => setMenuOpen(false)} width={200}>
                <button className="menu-item" onClick={() => { setMenuOpen(false); navigate('/profile'); }}>Profile &amp; settings</button>
                <button className="menu-item" onClick={logout} style={{ color: 'var(--clay)' }}>Sign out</button>
              </Dropdown>
            )}
          </div>
        </header>

        <main style={{ padding: '28px', flex: 1, minWidth: 0 }}>
          <div className="fade-in" style={{ maxWidth: 1080, margin: '0 auto' }}>
            <Outlet />
          </div>
        </main>
      </div>

      <style>{`
        @media (max-width: 520px) { .hide-sm { display: none; } }
      `}</style>
    </div>
  );
}

function Dropdown({ children, onClose, width = 220 }) {
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 30 }} />
      <div className="card" style={{ position: 'absolute', right: 0, top: 'calc(100% + 8px)', width, zIndex: 31, padding: 0, overflow: 'hidden' }}>
        {children}
      </div>
    </>
  );
}

function Dot({ kind }) {
  const c = kind === 'danger' ? 'var(--clay)' : kind === 'warning' ? 'var(--amber)' : kind === 'success' ? 'var(--evergreen)' : 'var(--ink-faint)';
  return <span style={{ width: 8, height: 8, borderRadius: '50%', background: c, marginTop: 6, flexShrink: 0 }} />;
}
