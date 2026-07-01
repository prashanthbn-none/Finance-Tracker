// Budgets — set monthly spending limits per category and track actuals.

import { useState, useMemo } from 'react';
import { useData } from '../store/DataContext.jsx';
import { useMoney } from '../hooks/useMoney.js';
import { PageHeader, CategorySelect } from '../components/shared.jsx';
import { Modal, Field, ProgressBar, EmptyState } from '../components/ui.jsx';
import { monthKey, monthLabel, colorFor } from '../lib/domain.js';
import { budgetStatus } from '../lib/selectors.js';

function recentMonths(n = 6) {
  const out = [];
  const now = new Date();
  for (let i = 0; i < n; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push(monthKey(d));
  }
  return out;
}

export default function BudgetsPage() {
  const { budgets, transactions, setBudget, deleteBudget } = useData();
  const money = useMoney();

  const [month, setMonth] = useState(monthKey(new Date()));
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ category: '', limit: '' });
  const [error, setError] = useState('');

  const status = useMemo(() => budgetStatus(budgets, transactions, month), [budgets, transactions, month]);
  const usedCats = status.map(b => b.category);

  const totalLimit = status.reduce((s, b) => s + b.limit, 0);
  const totalSpent = status.reduce((s, b) => s + b.spent, 0);

  function save() {
    const limit = parseFloat(form.limit);
    if (!form.category) return setError('Choose a category.');
    if (!limit || limit <= 0) return setError('Enter a limit greater than zero.');
    setBudget({ month, category: form.category, limit: Math.round(limit * 100) / 100 });
    setModal(false); setForm({ category: '', limit: '' }); setError('');
  }

  return (
    <>
      <PageHeader
        title="Budgets"
        subtitle="Set monthly limits and stay ahead of overspending."
        action={
          <div style={{ display: 'flex', gap: 10 }}>
            <select className="select" value={month} onChange={e => setMonth(e.target.value)} style={{ width: 'auto' }}>
              {recentMonths().map(m => <option key={m} value={m}>{monthLabel(m)}</option>)}
            </select>
            <button className="btn primary" onClick={() => { setModal(true); setError(''); }}>+ Add budget</button>
          </div>
        }
      />

      {status.length > 0 && (
        <div className="card card-pad" style={{ marginBottom: 18, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <p className="muted" style={{ fontSize: 13, margin: 0 }}>Total budgeted</p>
            <p className="num" style={{ fontSize: 22, fontWeight: 500, margin: '2px 0 0' }}>{money(totalLimit)}</p>
          </div>
          <div>
            <p className="muted" style={{ fontSize: 13, margin: 0 }}>Total spent</p>
            <p className="num" style={{ fontSize: 22, fontWeight: 500, margin: '2px 0 0', color: totalSpent > totalLimit ? 'var(--clay)' : 'var(--ink)' }}>{money(totalSpent)}</p>
          </div>
          <div>
            <p className="muted" style={{ fontSize: 13, margin: 0 }}>Remaining</p>
            <p className="num" style={{ fontSize: 22, fontWeight: 500, margin: '2px 0 0', color: 'var(--evergreen)' }}>{money(Math.max(0, totalLimit - totalSpent))}</p>
          </div>
        </div>
      )}

      {status.length === 0 ? (
        <div className="card card-pad">
          <EmptyState
            title={`No budgets for ${monthLabel(month)}`}
            body="Add a category limit to start tracking spending against a target."
            action={<button className="btn primary" onClick={() => setModal(true)}>+ Add budget</button>}
          />
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {status.map(b => (
            <div key={b.id} className="card card-pad">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                  <span style={{ width: 11, height: 11, borderRadius: 3, background: colorFor(b.category) }} />
                  <span style={{ fontWeight: 500 }}>{b.category}</span>
                </div>
                {b.state === 'over' && <span className="badge clay">Over</span>}
                {b.state === 'near' && <span className="badge amber">Almost</span>}
                {b.state === 'ok' && <span className="badge green">On track</span>}
              </div>
              <ProgressBar ratio={b.ratio} color={b.state === 'over' ? 'var(--clay)' : b.state === 'near' ? 'var(--amber)' : 'var(--evergreen)'} height={9} />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: 13.5 }}>
                <span className="num">{money(b.spent)} spent</span>
                <span className="num muted">of {money(b.limit)}</span>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                <button className="btn sm" onClick={() => { setForm({ category: b.category, limit: String(b.limit) }); setModal(true); }}>Edit limit</button>
                <button className="btn sm" style={{ color: 'var(--clay)' }} onClick={() => deleteBudget(b.id)}>Remove</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title="Set budget">
        {error && <div style={{ background: 'var(--clay-bg)', color: 'var(--clay)', padding: '9px 12px', borderRadius: 'var(--radius-s)', fontSize: 14, marginBottom: 14 }}>{error}</div>}
        <p className="muted" style={{ fontSize: 13, marginTop: 0 }}>For {monthLabel(month)}</p>
        <Field label="Category">
          <CategorySelect type="expense" value={form.category} exclude={usedCats} onChange={category => setForm(f => ({ ...f, category }))} />
        </Field>
        <Field label="Monthly limit">
          <input className="input" type="number" step="0.01" min="0" value={form.limit} onChange={e => setForm(f => ({ ...f, limit: e.target.value }))} placeholder="0.00" />
        </Field>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn" onClick={() => setModal(false)}>Cancel</button>
          <button className="btn primary" onClick={save}>Save</button>
        </div>
      </Modal>
    </>
  );
}
