// Recurring transactions — rules that auto-generate transactions each period
// (salary, rent, subscriptions, bills).

import { useState, useEffect } from 'react';
import { useData } from '../store/DataContext.jsx';
import { useMoney } from '../hooks/useMoney.js';
import { PageHeader } from '../components/shared.jsx';
import { Modal, Field, EmptyState } from '../components/ui.jsx';
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES, todayISO, colorFor } from '../lib/domain.js';

const FREQ = { weekly: 'Weekly', monthly: 'Monthly', yearly: 'Yearly' };

export default function RecurringPage() {
  const { recurring, addRecurring, updateRecurring, deleteRecurring } = useData();
  const money = useMoney();
  const [modal, setModal] = useState({ open: false, rule: null });

  return (
    <>
      <PageHeader
        title="Recurring transactions"
        subtitle="Set these once — they post automatically each period."
        action={<button className="btn primary" onClick={() => setModal({ open: true, rule: null })}>+ New rule</button>}
      />

      {recurring.length === 0 ? (
        <div className="card card-pad">
          <EmptyState
            title="No recurring transactions"
            body="Add your salary, rent, or subscriptions so you don't have to enter them each month."
            action={<button className="btn primary" onClick={() => setModal({ open: true, rule: null })}>+ New rule</button>}
          />
        </div>
      ) : (
        <div className="card card-pad">
          <div className="ruled">
            {recurring.map(r => (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 4px' }}>
                <span style={{ width: 9, height: 9, borderRadius: '50%', background: colorFor(r.category), flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontWeight: 500, fontSize: 14.5 }}>{r.note || r.category}</p>
                  <p style={{ margin: '2px 0 0', fontSize: 12.5, color: 'var(--ink-faint)' }}>
                    {FREQ[r.frequency]} · {r.category}{r.paused ? ' · paused' : ''}
                  </p>
                </div>
                <span className="num" style={{ fontSize: 15, fontWeight: 500, color: r.type === 'income' ? 'var(--evergreen)' : 'var(--clay)' }}>
                  {r.type === 'income' ? '+' : '−'}{money(r.amount).replace('-', '')}
                </span>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button className="btn ghost sm" onClick={() => updateRecurring(r.id, { paused: !r.paused })}>{r.paused ? 'Resume' : 'Pause'}</button>
                  <button className="btn ghost sm" onClick={() => setModal({ open: true, rule: r })}>Edit</button>
                  <button className="btn ghost sm" style={{ color: 'var(--clay)' }} onClick={() => deleteRecurring(r.id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <RuleModal
        state={modal}
        onClose={() => setModal({ open: false, rule: null })}
        onSave={(data) => modal.rule ? updateRecurring(modal.rule.id, data) : addRecurring(data)}
      />
    </>
  );
}

const blank = () => ({ type: 'expense', amount: '', category: '', frequency: 'monthly', startDate: todayISO(), note: '' });

function RuleModal({ state, onClose, onSave }) {
  const [form, setForm] = useState(blank());
  const [error, setError] = useState('');

  useEffect(() => {
    if (!state.open) return;
    setForm(state.rule ? { ...state.rule, amount: String(state.rule.amount) } : blank());
    setError('');
  }, [state.open, state.rule]);

  const cats = form.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  function save() {
    const amount = parseFloat(form.amount);
    if (!amount || amount <= 0) return setError('Enter an amount greater than zero.');
    if (!form.category) return setError('Choose a category.');
    onSave({
      type: form.type,
      amount: Math.round(amount * 100) / 100,
      category: form.category,
      frequency: form.frequency,
      startDate: form.startDate,
      note: form.note.trim(),
    });
    onClose();
  }

  return (
    <Modal open={state.open} onClose={onClose} title={state.rule ? 'Edit rule' : 'New recurring rule'}>
      {error && <div style={{ background: 'var(--clay-bg)', color: 'var(--clay)', padding: '9px 12px', borderRadius: 'var(--radius-s)', fontSize: 14, marginBottom: 14 }}>{error}</div>}
      <Field label="Type">
        <div style={{ display: 'flex', gap: 8 }}>
          {['expense', 'income'].map(t => (
            <button key={t} type="button" className={'btn' + (form.type === t ? ' primary' : '')} style={{ flex: 1, justifyContent: 'center', textTransform: 'capitalize' }} onClick={() => setForm(f => ({ ...f, type: t, category: '' }))}>{t}</button>
          ))}
        </div>
      </Field>
      <Field label="Amount">
        <input className="input" type="number" step="0.01" min="0" value={form.amount} onChange={set('amount')} placeholder="0.00" />
      </Field>
      <Field label="Category">
        <select className="select" value={form.category} onChange={set('category')}>
          <option value="">Select…</option>
          {cats.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </Field>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 160px' }}><Field label="Frequency"><select className="select" value={form.frequency} onChange={set('frequency')}>{Object.entries(FREQ).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field></div>
        <div style={{ flex: '1 1 160px' }}><Field label="Starts on"><input className="input" type="date" value={form.startDate} onChange={set('startDate')} /></Field></div>
      </div>
      <Field label="Note (optional)">
        <input className="input" value={form.note} onChange={set('note')} placeholder="e.g. Netflix subscription" />
      </Field>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, flexWrap: 'wrap' }}>
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn primary" onClick={save}>{state.rule ? 'Save changes' : 'Create rule'}</button>
      </div>
    </Modal>
  );
}
