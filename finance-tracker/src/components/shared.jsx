// Shared: a page header with optional action, and the transaction editor used
// by the Income, Expenses, and Transactions pages.

import { useState, useEffect } from 'react';
import { Modal, Field } from './ui.jsx';
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES, todayISO } from '../lib/domain.js';
import { useData } from '../store/DataContext.jsx';

export function CategorySelect({ type, value, onChange, exclude = [] }) {
  const { customCategories, addCategory } = useData();
  const defaults = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const categories = [...new Set([...defaults, ...(customCategories[type] || [])])]
    .filter(c => !exclude.includes(c) || c === value);

  function createCategory() {
    const name = window.prompt(`New ${type} category name:`);
    if (name == null) return;
    const result = addCategory(type, name);
    if (!result.ok) {
      window.alert(result.reason === 'duplicate' ? 'Category already exists.' : 'Enter a category name.');
      return;
    }
    onChange(result.category);
  }

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <select className="select" value={value} onChange={e => onChange(e.target.value)} style={{ flex: 1 }}>
        <option value="">Select...</option>
        {categories.map(c => <option key={c} value={c}>{c}</option>)}
      </select>
      <button type="button" className="btn" onClick={createCategory} style={{ whiteSpace: 'nowrap' }}>+ New</button>
    </div>
  );
}

export function PageHeader({ title, subtitle, action }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, marginBottom: 22, flexWrap: 'wrap' }}>
      <div>
        <h1 style={{ fontSize: 26, marginBottom: 4 }}>{title}</h1>
        {subtitle && <p className="muted" style={{ fontSize: 14, margin: 0 }}>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

const EMPTY = (type) => ({ type, amount: '', category: '', date: todayISO(), note: '' });

export function TransactionModal({ open, onClose, onSave, initial, lockType }) {
  const [form, setForm] = useState(EMPTY(lockType || 'expense'));
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setForm(initial
        ? { ...initial, amount: String(initial.amount) }
        : EMPTY(lockType || 'expense'));
      setError('');
    }
  }, [open, initial, lockType]);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  function save() {
    const amount = parseFloat(form.amount);
    if (!amount || amount <= 0) return setError('Enter an amount greater than zero.');
    if (!form.category) return setError('Choose a category.');
    if (!form.date) return setError('Choose a date.');
    const result = onSave({
      type: form.type,
      amount: Math.round(amount * 100) / 100,
      category: form.category,
      date: form.date,
      note: form.note.trim(),
    });
    if (result?.reason === 'duplicate') return setError('This transaction already exists.');
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={initial ? 'Edit transaction' : (form.type === 'income' ? 'Add income' : 'Add expense')}>
      {error && <div style={{ background: 'var(--clay-bg)', color: 'var(--clay)', padding: '9px 12px', borderRadius: 'var(--radius-s)', fontSize: 14, marginBottom: 14 }}>{error}</div>}

      {!lockType && (
        <Field label="Type">
          <div style={{ display: 'flex', gap: 8 }}>
            {['expense', 'income'].map(t => (
              <button key={t} type="button"
                className={'btn' + (form.type === t ? ' primary' : '')}
                onClick={() => setForm(f => ({ ...f, type: t, category: '' }))}
                style={{ flex: 1, justifyContent: 'center', textTransform: 'capitalize' }}>
                {t}
              </button>
            ))}
          </div>
        </Field>
      )}

      <Field label="Amount">
        <input className="input" type="number" step="0.01" min="0" value={form.amount} onChange={set('amount')} placeholder="0.00" autoFocus />
      </Field>
      <Field label="Category">
        <CategorySelect type={form.type} value={form.category} onChange={category => setForm(f => ({ ...f, category }))} />
      </Field>
      <Field label="Date">
        <input className="input" type="date" value={form.date} onChange={set('date')} />
      </Field>
      <Field label="Note (optional)">
        <input className="input" value={form.note} onChange={set('note')} placeholder="e.g. Weekly groceries" />
      </Field>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn primary" onClick={save}>{initial ? 'Save changes' : 'Add'}</button>
      </div>
    </Modal>
  );
}
