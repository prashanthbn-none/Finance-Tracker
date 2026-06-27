// A ruled list of transactions with edit / delete actions. Used by several pages.

import { colorFor } from '../lib/domain.js';
import { useMoney } from '../hooks/useMoney.js';
import { EmptyState } from './ui.jsx';

export default function TransactionList({ items, onEdit, onDelete, emptyTitle, emptyBody, emptyAction }) {
  const money = useMoney();
  if (!items.length) {
    return <EmptyState title={emptyTitle} body={emptyBody} action={emptyAction} />;
  }

  const sorted = [...items].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

  return (
    <div className="ruled">
      {sorted.map(t => (
        <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 4px' }}>
          <span style={{ width: 9, height: 9, borderRadius: '50%', background: colorFor(t.category), flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 14.5, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {t.note || t.category}
            </p>
            <p style={{ margin: '2px 0 0', fontSize: 12.5, color: 'var(--ink-faint)' }}>
              {t.category} · {new Date(t.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              {t.recurringId && ' · recurring'}
            </p>
          </div>
          <span className="num" style={{ fontSize: 15.5, fontWeight: 500, color: t.type === 'income' ? 'var(--evergreen)' : 'var(--clay)' }}>
            {t.type === 'income' ? '+' : '−'}{money(t.amount).replace('-', '')}
          </span>
          <div style={{ display: 'flex', gap: 4 }}>
            {onEdit && <button className="btn ghost sm" aria-label="Edit" onClick={() => onEdit(t)}>Edit</button>}
            {onDelete && <button className="btn ghost sm" aria-label="Delete" onClick={() => onDelete(t)} style={{ color: 'var(--clay)' }}>Delete</button>}
          </div>
        </div>
      ))}
    </div>
  );
}
