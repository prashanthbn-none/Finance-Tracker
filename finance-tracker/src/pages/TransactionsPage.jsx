// Transaction history — search, filter (type, category, date range, amount),
// sort, bulk select/delete, and CSV/Excel export.

import { useRef, useState, useMemo } from 'react';
import { useData } from '../store/DataContext.jsx';
import { useMoney } from '../hooks/useMoney.js';
import { useSettings } from '../store/SettingsContext.jsx';
import { PageHeader, TransactionModal } from '../components/shared.jsx';
import { EmptyState } from '../components/ui.jsx';
import { IconSearch, IconDownload } from '../components/icons.jsx';
import { exportCSV, exportExcel } from '../lib/export.js';
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES, colorFor, transactionFingerprint } from '../lib/domain.js';
import { parseStatement } from '../lib/statementImport.js';

const ALL_CATS = [...new Set([...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES])];

const SORTS = {
  'date-desc': { label: 'Newest first', fn: (a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0) },
  'date-asc': { label: 'Oldest first', fn: (a, b) => (a.date > b.date ? 1 : a.date < b.date ? -1 : 0) },
  'amount-desc': { label: 'Amount: high to low', fn: (a, b) => b.amount - a.amount },
  'amount-asc': { label: 'Amount: low to high', fn: (a, b) => a.amount - b.amount },
  'category': { label: 'Category (A–Z)', fn: (a, b) => a.category.localeCompare(b.category) },
};

export default function TransactionsPage() {
  const { transactions, addTransaction, addTransactions, updateTransaction, deleteTransaction } = useData();
  const money = useMoney();
  const { currency } = useSettings();
  const importRef = useRef(null);

  const [q, setQ] = useState('');
  const [type, setType] = useState('all');
  const [category, setCategory] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [min, setMin] = useState('');
  const [max, setMax] = useState('');
  const [sort, setSort] = useState('date-desc');
  const [selected, setSelected] = useState(() => new Set());
  const [modal, setModal] = useState({ open: false, initial: null });
  const [importStatus, setImportStatus] = useState('');

  const filtered = useMemo(() => {
    const minN = min === '' ? -Infinity : parseFloat(min);
    const maxN = max === '' ? Infinity : parseFloat(max);
    return transactions.filter(t => {
      if (type !== 'all' && t.type !== type) return false;
      if (category !== 'all' && t.category !== category) return false;
      if (from && t.date < from) return false;
      if (to && t.date > to) return false;
      if (t.amount < minN || t.amount > maxN) return false;
      if (q) {
        const hay = `${t.note || ''} ${t.category}`.toLowerCase();
        if (!hay.includes(q.toLowerCase())) return false;
      }
      return true;
    }).sort(SORTS[sort].fn);
  }, [transactions, type, category, from, to, min, max, q, sort]);

  const hasFilters = q || type !== 'all' || category !== 'all' || from || to || min || max;
  function clear() { setQ(''); setType('all'); setCategory('all'); setFrom(''); setTo(''); setMin(''); setMax(''); }

  function toggle(id) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }
  function toggleAll() {
    setSelected(prev => prev.size === filtered.length ? new Set() : new Set(filtered.map(t => t.id)));
  }
  function bulkDelete() {
    if (!selected.size) return;
    if (!window.confirm(`Delete ${selected.size} transaction${selected.size > 1 ? 's' : ''}? This can't be undone.`)) return;
    selected.forEach(id => deleteTransaction(id));
    setSelected(new Set());
  }

  function doExport(kind) {
    const cols = [
      { key: 'date', label: 'Date' },
      { key: 'type', label: 'Type' },
      { key: 'category', label: 'Category' },
      { key: 'note', label: 'Note' },
      { key: 'amount', label: `Amount (${currency})` },
    ];
    const rows = filtered.map(t => ({ ...t, note: t.note || '' }));
    const stamp = new Date().toISOString().slice(0, 10);
    kind === 'csv'
      ? exportCSV(`transactions-${stamp}`, cols, rows)
      : exportExcel(`transactions-${stamp}`, cols, rows, 'Transactions');
  }

  async function importStatement(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setImportStatus('Reading statement...');
    try {
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      const text = isPdf
        ? await import('../lib/pdfStatement.js').then(m => m.extractPdfStatementText(file))
        : await file.text();
      const parsed = parseStatement(text);
      const existing = new Set(transactions.map(transactionFingerprint));
      const fresh = parsed.filter(t => !existing.has(transactionFingerprint(t)));
      const added = addTransactions(fresh);
      setImportStatus(added
        ? `Imported ${added} transaction${added === 1 ? '' : 's'} from statement.`
        : parsed.length ? 'Statement already imported. No new transactions found.' : 'No transactions found. Try an unlocked PDF statement with selectable text.');
    } catch {
      setImportStatus('Could not read this statement. Use an unlocked PDF downloaded from net banking.');
    }
  }

  return (
    <>
      <PageHeader
        title="Transactions"
        subtitle={`${filtered.length} of ${transactions.length} shown`}
        action={(
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn" onClick={() => importRef.current?.click()}>Import statement</button>
            <button className="btn primary" onClick={() => setModal({ open: true, initial: null })}>+ Add transaction</button>
            <input ref={importRef} type="file" accept=".pdf,.csv,.txt,text/csv,application/pdf" onChange={importStatement} style={{ display: 'none' }} />
          </div>
        )}
      />
      {importStatus && (
        <div className="card card-pad" style={{ marginBottom: 18, padding: '12px 16px', borderColor: 'var(--blue)', color: 'var(--ink-soft)' }}>
          {importStatus}
        </div>
      )}

      <div className="card card-pad" style={{ marginBottom: 18 }}>
        <div style={{ position: 'relative', marginBottom: 12 }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-faint)', display: 'flex' }}><IconSearch /></span>
          <input className="input" value={q} onChange={e => setQ(e.target.value)} placeholder="Search notes or categories…" style={{ paddingLeft: 38 }} />
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <label className="field" style={{ flex: '1 1 110px' }}>
            <span className="flabel">Type</span>
            <select className="select" value={type} onChange={e => setType(e.target.value)}>
              <option value="all">All</option><option value="income">Income</option><option value="expense">Expense</option>
            </select>
          </label>
          <label className="field" style={{ flex: '1 1 130px' }}>
            <span className="flabel">Category</span>
            <select className="select" value={category} onChange={e => setCategory(e.target.value)}>
              <option value="all">All</option>
              {ALL_CATS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label className="field" style={{ flex: '1 1 130px' }}>
            <span className="flabel">From</span>
            <input className="input" type="date" value={from} onChange={e => setFrom(e.target.value)} />
          </label>
          <label className="field" style={{ flex: '1 1 130px' }}>
            <span className="flabel">To</span>
            <input className="input" type="date" value={to} onChange={e => setTo(e.target.value)} />
          </label>
          <label className="field" style={{ flex: '1 1 90px' }}>
            <span className="flabel">Min</span>
            <input className="input" type="number" min="0" value={min} onChange={e => setMin(e.target.value)} placeholder="0" />
          </label>
          <label className="field" style={{ flex: '1 1 90px' }}>
            <span className="flabel">Max</span>
            <input className="input" type="number" min="0" value={max} onChange={e => setMax(e.target.value)} placeholder="∞" />
          </label>
          <label className="field" style={{ flex: '1 1 160px' }}>
            <span className="flabel">Sort</span>
            <select className="select" value={sort} onChange={e => setSort(e.target.value)}>
              {Object.entries(SORTS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </label>
          {hasFilters && <button className="btn" onClick={clear}>Clear</button>}
        </div>
      </div>

      {/* action bar: bulk + export */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: 'var(--ink-soft)', cursor: 'pointer' }}>
          <input type="checkbox" checked={filtered.length > 0 && selected.size === filtered.length} onChange={toggleAll} />
          Select all
        </label>
        {selected.size > 0 && (
          <button className="btn danger sm" onClick={bulkDelete}>Delete selected ({selected.size})</button>
        )}
        <div style={{ flex: 1 }} />
        <button className="btn sm" onClick={() => doExport('csv')}><IconDownload width={15} height={15} /> CSV</button>
        <button className="btn sm" onClick={() => doExport('excel')}><IconDownload width={15} height={15} /> Excel</button>
      </div>

      <div className="card card-pad">
        {filtered.length === 0 ? (
          <EmptyState
            title={hasFilters ? 'Nothing matches those filters' : 'No transactions yet'}
            body={hasFilters ? 'Try widening your search or clearing filters.' : 'Add income or an expense to begin your history.'}
          />
        ) : (
          <div className="ruled">
            {filtered.map(t => (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 4px', background: selected.has(t.id) ? 'var(--evergreen-bg)' : 'transparent', borderRadius: 6 }}>
                <input type="checkbox" checked={selected.has(t.id)} onChange={() => toggle(t.id)} aria-label="Select transaction" />
                <span style={{ width: 9, height: 9, borderRadius: '50%', background: colorFor(t.category), flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 14.5, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.note || t.category}</p>
                  <p style={{ margin: '2px 0 0', fontSize: 12.5, color: 'var(--ink-faint)' }}>
                    {t.category} · {new Date(t.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}{t.recurringId && ' · recurring'}
                  </p>
                </div>
                <span className="num" style={{ fontSize: 15.5, fontWeight: 500, color: t.type === 'income' ? 'var(--evergreen)' : 'var(--clay)' }}>
                  {t.type === 'income' ? '+' : '−'}{money(t.amount).replace('-', '')}
                </span>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button className="btn ghost sm" onClick={() => setModal({ open: true, initial: t })}>Edit</button>
                  <button className="btn ghost sm" onClick={() => deleteTransaction(t.id)} style={{ color: 'var(--clay)' }}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <TransactionModal
        open={modal.open}
        onClose={() => setModal({ open: false, initial: null })}
        onSave={(data) => modal.initial ? updateTransaction(modal.initial.id, data) : addTransaction(data)}
        initial={modal.initial}
      />


      <style>{`.flabel { font-size: 13px; color: var(--ink-soft); font-weight: 500; }`}</style>
    </>
  );
}
