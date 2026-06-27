// Ledger page — renders either income or expenses depending on `type`.
// Used by both /income and /expenses routes.

import { useState, useMemo } from 'react';
import { useData } from '../store/DataContext.jsx';
import { useMoney } from '../hooks/useMoney.js';
import { PageHeader, TransactionModal } from '../components/shared.jsx';
import TransactionList from '../components/TransactionList.jsx';
import { StatCard } from '../components/ui.jsx';
import { monthKey, monthLabel } from '../lib/domain.js';
import { sum } from '../lib/selectors.js';

export default function LedgerPage({ type }) {
  const { transactions, addTransaction, updateTransaction, deleteTransaction } = useData();
  const money = useMoney();
  const [modal, setModal] = useState({ open: false, initial: null });

  const isIncome = type === 'income';
  const items = useMemo(() => transactions.filter(t => t.type === type), [transactions, type]);

  const thisMonth = monthKey(new Date());
  const monthTotal = sum(items.filter(t => monthKey(t.date) === thisMonth));
  const allTotal = sum(items);

  function handleSave(data) {
    if (modal.initial) updateTransaction(modal.initial.id, data);
    else addTransaction(data);
  }

  return (
    <>
      <PageHeader
        title={isIncome ? 'Income' : 'Expenses'}
        subtitle={isIncome ? 'Money coming in, by source.' : 'Money going out, by category.'}
        action={<button className="btn primary" onClick={() => setModal({ open: true, initial: null })}>+ Add {type}</button>}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 22 }}>
        <StatCard label={`${monthLabel(thisMonth)}`} value={money(monthTotal)} tone={isIncome ? 'pos' : 'neg'} />
        <StatCard label="All time" value={money(allTotal)} />
        <StatCard label="Entries" value={<span className="num">{items.length}</span>} sub={isIncome ? 'income records' : 'expense records'} />
      </div>

      <div className="card card-pad">
        <TransactionList
          items={items}
          onEdit={(t) => setModal({ open: true, initial: t })}
          onDelete={(t) => deleteTransaction(t.id)}
          emptyTitle={isIncome ? 'No income recorded yet' : 'No expenses recorded yet'}
          emptyBody={isIncome ? 'Add your salary, freelance pay, or any other money coming in.' : 'Log a purchase to start seeing where your money goes.'}
          emptyAction={<button className="btn primary" onClick={() => setModal({ open: true, initial: null })}>+ Add {type}</button>}
        />
      </div>

      <TransactionModal
        open={modal.open}
        onClose={() => setModal({ open: false, initial: null })}
        onSave={handleSave}
        initial={modal.initial}
        lockType={type}
      />
    </>
  );
}
