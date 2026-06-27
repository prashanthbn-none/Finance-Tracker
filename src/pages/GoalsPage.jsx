// Savings goals — define a target and date, then track contributions.

import { useState, useEffect } from 'react';
import { useData } from '../store/DataContext.jsx';
import { useMoney } from '../hooks/useMoney.js';
import { PageHeader } from '../components/shared.jsx';
import { Modal, Field, ProgressBar, CircularProgress, EmptyState } from '../components/ui.jsx';
import { todayISO } from '../lib/domain.js';
import { goalProgress } from '../lib/selectors.js';

const SUGGESTIONS = ['Emergency fund', 'New laptop', 'Vacation', 'Vehicle purchase'];

export default function GoalsPage() {
  const { goals, addGoal, updateGoal, contributeToGoal, deleteGoal } = useData();
  const money = useMoney();

  const [editModal, setEditModal] = useState({ open: false, goal: null });
  const [contribModal, setContribModal] = useState({ open: false, goal: null });

  return (
    <>
      <PageHeader
        title="Savings goals"
        subtitle="Save with intent — one target at a time."
        action={<button className="btn primary" onClick={() => setEditModal({ open: true, goal: null })}>+ New goal</button>}
      />

      {goals.length === 0 ? (
        <div className="card card-pad">
          <EmptyState
            title="No savings goals yet"
            body="Whether it's an emergency fund or a holiday, give your saving a name and a number."
            action={<button className="btn primary" onClick={() => setEditModal({ open: true, goal: null })}>+ New goal</button>}
          />
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {goals.map(g => {
            const p = goalProgress(g);
            return (
              <div key={g.id} className="card card-pad lift">
                <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                  <CircularProgress
                    ratio={p.ratio}
                    color={p.complete ? 'var(--evergreen)' : 'var(--evergreen)'}
                  >
                    {Math.round(p.ratio * 100)}%
                  </CircularProgress>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                      <h3 style={{ fontSize: 17 }}>{g.name}</h3>
                      {p.complete && <span className="badge green">Reached</span>}
                    </div>
                    <p className="num" style={{ fontSize: 22, fontWeight: 500, margin: '2px 0' }}>
                      {money(g.saved || 0)}
                      <span className="muted" style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 400 }}> of {money(g.target)}</span>
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--ink-soft)' }}>
                      <span>{p.complete ? 'Complete' : `${money(p.remaining)} to go`}</span>
                      {g.targetDate && (
                        <span>{p.daysLeft >= 0 ? `${p.daysLeft} days left` : 'past target'}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div style={{ margin: '14px 0 0' }}>
                  <ProgressBar ratio={p.ratio} height={7} />
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
                  <button className="btn sm primary" onClick={() => setContribModal({ open: true, goal: g })}>Add funds</button>
                  <button className="btn sm" onClick={() => setEditModal({ open: true, goal: g })}>Edit</button>
                  <button className="btn sm" style={{ color: 'var(--clay)' }} onClick={() => deleteGoal(g.id)}>Delete</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <GoalEditModal
        state={editModal}
        onClose={() => setEditModal({ open: false, goal: null })}
        onSave={(data) => editModal.goal ? updateGoal(editModal.goal.id, data) : addGoal(data)}
      />
      <ContributeModal
        state={contribModal}
        onClose={() => setContribModal({ open: false, goal: null })}
        onApply={(amount) => contributeToGoal(contribModal.goal.id, amount)}
      />
    </>
  );
}

function GoalEditModal({ state, onClose, onSave }) {
  const [form, setForm] = useState({ name: '', target: '', targetDate: '' });
  const [error, setError] = useState('');

  useEffect(() => {
    if (!state.open) return;
    setForm(state.goal
      ? { name: state.goal.name, target: String(state.goal.target), targetDate: state.goal.targetDate || '' }
      : { name: '', target: '', targetDate: '' });
    setError('');
  }, [state.open, state.goal]);

  function save() {
    const target = parseFloat(form.target);
    if (!form.name.trim()) return setError('Give your goal a name.');
    if (!target || target <= 0) return setError('Enter a target greater than zero.');
    onSave({ name: form.name.trim(), target: Math.round(target * 100) / 100, targetDate: form.targetDate || null });
    onClose();
  }

  return (
    <Modal open={state.open} onClose={onClose} title={state.goal ? 'Edit goal' : 'New savings goal'}>
      {error && <div style={{ background: 'var(--clay-bg)', color: 'var(--clay)', padding: '9px 12px', borderRadius: 'var(--radius-s)', fontSize: 14, marginBottom: 14 }}>{error}</div>}
      <Field label="Goal name">
        <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Emergency fund" />
      </Field>
      {!state.goal && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '-6px 0 14px' }}>
          {SUGGESTIONS.map(s => (
            <button key={s} className="badge muted" style={{ cursor: 'pointer', border: 'none' }} onClick={() => setForm(f => ({ ...f, name: s }))}>{s}</button>
          ))}
        </div>
      )}
      <Field label="Target amount">
        <input className="input" type="number" step="0.01" min="0" value={form.target} onChange={e => setForm(f => ({ ...f, target: e.target.value }))} placeholder="0.00" />
      </Field>
      <Field label="Target date (optional)">
        <input className="input" type="date" min={todayISO()} value={form.targetDate} onChange={e => setForm(f => ({ ...f, targetDate: e.target.value }))} />
      </Field>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, flexWrap: 'wrap' }}>
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn primary" onClick={save}>{state.goal ? 'Save changes' : 'Create goal'}</button>
      </div>
    </Modal>
  );
}

function ContributeModal({ state, onClose, onApply }) {
  const [amount, setAmount] = useState('');
  const [mode, setMode] = useState('add');

  useEffect(() => {
    if (state.open) { setAmount(''); setMode('add'); }
  }, [state.open]);

  function apply() {
    const v = parseFloat(amount);
    if (!v || v <= 0) return;
    onApply(mode === 'add' ? v : -v);
    setAmount('');
    onClose();
  }

  return (
    <Modal open={state.open} onClose={() => { setAmount(''); onClose(); }} title={`Update ${state.goal?.name || 'goal'}`}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        <button className={'btn' + (mode === 'add' ? ' primary' : '')} style={{ flex: 1, justifyContent: 'center' }} onClick={() => setMode('add')}>Add funds</button>
        <button className={'btn' + (mode === 'remove' ? ' primary' : '')} style={{ flex: 1, justifyContent: 'center' }} onClick={() => setMode('remove')}>Withdraw</button>
      </div>
      <Field label={`Amount to ${mode === 'add' ? 'add' : 'withdraw'}`}>
        <input className="input" type="number" step="0.01" min="0" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" autoFocus />
      </Field>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, flexWrap: 'wrap' }}>
        <button className="btn" onClick={() => { setAmount(''); onClose(); }}>Cancel</button>
        <button className="btn primary" onClick={apply}>Apply</button>
      </div>
    </Modal>
  );
}
