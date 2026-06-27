// Profile & settings — account details, appearance (theme), display currency,
// data summary, full export/backup, and reset.

import { useState, useRef } from 'react';
import { useAuth } from '../store/AuthContext.jsx';
import { useData } from '../store/DataContext.jsx';
import { useSettings } from '../store/SettingsContext.jsx';
import { PageHeader } from '../components/shared.jsx';
import { Field, Modal } from '../components/ui.jsx';
import { IconSun, IconMoon, IconDownload } from '../components/icons.jsx';
import { exportCSV } from '../lib/export.js';

const THEMES = [
  { key: 'light', label: 'Light', Icon: IconSun },
  { key: 'dark', label: 'Dark', Icon: IconMoon },
  { key: 'system', label: 'System', Icon: null },
];

export default function ProfilePage() {
  const { user, updateProfile, logout } = useAuth();
  const { transactions, goals, budgets, recurring, replaceAllData, resetAllData } = useData();
  const { theme, setTheme, currency } = useSettings();
  const [name, setName] = useState(user?.name || '');
  const [saved, setSaved] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const fileRef = useRef(null);

  function save() {
    updateProfile({ name: name.trim() });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function resetData() {
    await resetAllData();
    setConfirmReset(false);
  }

  // Full JSON backup of every collection — the roadmap's backup & restore.
  function backup() {
    const data = { version: 1, exportedAt: new Date().toISOString(), transactions, budgets, goals, recurring };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rupeeflow-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function restore(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!data || typeof data !== 'object') throw new Error('bad file');
        replaceAllData({
          transactions: Array.isArray(data.transactions) ? data.transactions : [],
          budgets: Array.isArray(data.budgets) ? data.budgets : [],
          goals: Array.isArray(data.goals) ? data.goals : [],
          recurring: Array.isArray(data.recurring) ? data.recurring : [],
        });
      } catch {
        window.alert('That file could not be read as a RupeeFlow backup.');
      }
    };
    reader.readAsText(file);
  }

  function exportAll() {
    const cols = [
      { key: 'date', label: 'Date' },
      { key: 'type', label: 'Type' },
      { key: 'category', label: 'Category' },
      { key: 'note', label: 'Note' },
      { key: 'amount', label: `Amount (${currency})` },
    ];
    exportCSV(`all-transactions-${new Date().toISOString().slice(0, 10)}`, cols,
      transactions.map(t => ({ ...t, note: t.note || '' })));
  }

  return (
    <>
      <PageHeader title="Profile & settings" subtitle="Manage your account and preferences." />

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 18 }} className="prof-grid">
        <div className="card card-pad">
          <h3 style={{ fontSize: 16, marginBottom: 16 }}>Your details</h3>
          <Field label="Name">
            <input className="input" value={name} onChange={e => setName(e.target.value)} />
          </Field>
          <Field label="Email">
            <input className="input" value={user?.email || ''} disabled style={{ opacity: 0.6 }} />
          </Field>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
            <button className="btn primary" onClick={save}>Save changes</button>
            {saved && <span className="badge green">Saved</span>}
          </div>
        </div>

        <div className="card card-pad">
          <h3 style={{ fontSize: 16, marginBottom: 16 }}>Appearance</h3>
          <Field label="Theme">
            <div style={{ display: 'flex', gap: 8 }}>
              {THEMES.map(({ key, label, Icon }) => (
                <button
                  key={key}
                  className={'btn' + (theme === key ? ' primary' : '')}
                  style={{ flex: 1, justifyContent: 'center' }}
                  onClick={() => setTheme(key)}
                >
                  {Icon && <Icon width={15} height={15} />} {label}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Display currency">
            <input className="input" value="INR (₹)" disabled style={{ opacity: 0.75 }} />
          </Field>
          <p className="muted" style={{ fontSize: 13, margin: '4px 0 0' }}>
            RupeeFlow is now INR-only, so every amount stays consistent.
          </p>
        </div>

        <div className="card card-pad">
          <h3 style={{ fontSize: 16, marginBottom: 16 }}>Your data</h3>
          <div className="ruled">
            <Row label="Transactions" value={transactions.length} />
            <Row label="Budgets" value={budgets.length} />
            <Row label="Savings goals" value={goals.length} />
            <Row label="Recurring rules" value={recurring.length} />
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 16 }}>
            <button className="btn sm" onClick={exportAll}><IconDownload width={15} height={15} /> Export CSV</button>
            <button className="btn sm" onClick={backup}><IconDownload width={15} height={15} /> Backup (JSON)</button>
            <button className="btn sm" onClick={() => fileRef.current?.click()}>Restore backup</button>
            <input ref={fileRef} type="file" accept="application/json" onChange={restore} style={{ display: 'none' }} />
          </div>
        </div>

        <div className="card card-pad">
          <h3 style={{ fontSize: 16, marginBottom: 16 }}>Account</h3>
          <p className="muted" style={{ fontSize: 13, marginTop: 0 }}>
            Everything is stored locally in this browser. Clearing your browser data, or resetting below, will remove it.
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn" onClick={logout}>Sign out</button>
            <button className="btn danger" onClick={() => setConfirmReset(true)}>Reset all data</button>
          </div>
        </div>
      </div>

      <Modal open={confirmReset} onClose={() => setConfirmReset(false)} title="Reset all data?">
        <p style={{ marginTop: 0 }}>This permanently deletes all your transactions, budgets, goals, and recurring rules. Your account stays, but its records will be empty. This can't be undone.</p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn" onClick={() => setConfirmReset(false)}>Cancel</button>
          <button className="btn danger" onClick={resetData}>Delete everything</button>
        </div>
      </Modal>

      <style>{`@media (max-width: 720px){ .prof-grid { grid-template-columns: 1fr !important; } }`}</style>
    </>
  );
}

function Row({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', fontSize: 14 }}>
      <span className="muted">{label}</span>
      <span className="num" style={{ fontWeight: 500 }}>{value}</span>
    </div>
  );
}
