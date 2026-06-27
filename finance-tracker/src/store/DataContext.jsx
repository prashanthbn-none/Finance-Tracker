// Central data store.
//
// Loads every collection for the signed-in user through the storage adapter,
// exposes CRUD operations, and keeps derived state (notifications) fresh. All
// writes go back through the adapter so swapping in a backend later is a
// one-file change in storage.js.

import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { createStorage, uid } from '../lib/storage.js';
import { materializeDue } from '../lib/recurring.js';
import { monthKey, transactionFingerprint } from '../lib/domain.js';
import { useAuth } from './AuthContext.jsx';

const DataContext = createContext(null);

export function DataProvider({ children }) {
  const { user } = useAuth();
  const [store, setStore] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [goals, setGoals] = useState([]);
  const [recurring, setRecurring] = useState([]);
  const [dismissed, setDismissed] = useState([]);
  const [loading, setLoading] = useState(true);

  // (Re)load everything when the user changes.
  useEffect(() => {
    if (!user) {
      setStore(null);
      setTransactions([]); setBudgets([]); setGoals([]); setRecurring([]);
      setLoading(false);
      return;
    }
    let alive = true;
    const adapter = createStorage(user.id);
    setStore(adapter);
    setLoading(true);

    (async () => {
      const [tx, bg, gl, rc, dm] = await Promise.all([
        adapter.list('transactions'),
        adapter.list('budgets'),
        adapter.list('goals'),
        adapter.list('recurring'),
        adapter.getMeta('dismissedAlerts'),
      ]);
      if (!alive) return;

      // Apply any recurring transactions that have come due since last visit.
      const { created, updated } = materializeDue(rc);
      const seen = new Set(tx.map(transactionFingerprint));
      const freshCreated = created.filter(t => {
        const fp = transactionFingerprint(t);
        if (seen.has(fp)) return false;
        seen.add(fp);
        return true;
      });
      const nextTx = freshCreated.length ? [...tx, ...freshCreated] : tx;
      if (freshCreated.length) {
        await adapter.write('transactions', nextTx);
        await adapter.write('recurring', updated);
      }

      setTransactions(nextTx);
      setBudgets(bg);
      setGoals(gl);
      setRecurring(updated);
      setDismissed(dm || []);
      setLoading(false);
    })();

    return () => { alive = false; };
  }, [user]);

  // Generic persist helper for a collection.
  const persist = useCallback((collection, records, setter) => {
    setter(records);
    if (store) store.write(collection, records);
  }, [store]);

  // --- Transactions ---
  const addTransaction = useCallback((data) => {
    const fp = transactionFingerprint(data);
    if (transactions.some(t => transactionFingerprint(t) === fp)) {
      return { ok: false, reason: 'duplicate' };
    }
    persist('transactions', [...transactions, { id: uid(), ...data }], setTransactions);
    return { ok: true };
  }, [transactions, persist]);

  const addTransactions = useCallback((items) => {
    const seen = new Set(transactions.map(transactionFingerprint));
    const clean = items
      .filter(t => t && t.amount > 0 && t.date && t.type)
      .filter(t => {
        const fp = transactionFingerprint(t);
        if (seen.has(fp)) return false;
        seen.add(fp);
        return true;
      })
      .map(t => ({ id: uid(), ...t }));
    if (!clean.length) return 0;
    persist('transactions', [...transactions, ...clean], setTransactions);
    return clean.length;
  }, [transactions, persist]);

  const updateTransaction = useCallback((id, patch) => {
    const current = transactions.find(t => t.id === id);
    if (!current) return { ok: false, reason: 'missing' };
    const nextItem = { ...current, ...patch };
    const fp = transactionFingerprint(nextItem);
    if (transactions.some(t => t.id !== id && transactionFingerprint(t) === fp)) {
      return { ok: false, reason: 'duplicate' };
    }
    persist('transactions', transactions.map(t => t.id === id ? { ...t, ...patch } : t), setTransactions);
    return { ok: true };
  }, [transactions, persist]);

  const deleteTransaction = useCallback((id) => {
    persist('transactions', transactions.filter(t => t.id !== id), setTransactions);
  }, [transactions, persist]);

  // --- Budgets (one record per category per month) ---
  const setBudget = useCallback(({ month, category, limit }) => {
    const existing = budgets.find(b => b.month === month && b.category === category);
    let next;
    if (existing) {
      next = budgets.map(b => b === existing ? { ...b, limit } : b);
    } else {
      next = [...budgets, { id: uid(), month, category, limit }];
    }
    persist('budgets', next, setBudgets);
  }, [budgets, persist]);

  const deleteBudget = useCallback((id) => {
    persist('budgets', budgets.filter(b => b.id !== id), setBudgets);
  }, [budgets, persist]);

  // --- Goals ---
  const addGoal = useCallback((data) => {
    persist('goals', [...goals, { id: uid(), saved: 0, ...data }], setGoals);
  }, [goals, persist]);

  const updateGoal = useCallback((id, patch) => {
    persist('goals', goals.map(g => g.id === id ? { ...g, ...patch } : g), setGoals);
  }, [goals, persist]);

  const contributeToGoal = useCallback((id, amount) => {
    persist('goals', goals.map(g => g.id === id ? { ...g, saved: Math.max(0, (g.saved || 0) + amount) } : g), setGoals);
  }, [goals, persist]);

  const deleteGoal = useCallback((id) => {
    persist('goals', goals.filter(g => g.id !== id), setGoals);
  }, [goals, persist]);

  // --- Recurring ---
  const addRecurring = useCallback((data) => {
    const rule = { id: uid(), lastRun: null, paused: false, ...data };
    // Immediately materialize any periods already due for the new rule.
    const { created, updated } = materializeDue([rule]);
    const nextRules = [...recurring, ...updated];
    persist('recurring', nextRules, setRecurring);
    if (created.length) {
      const seen = new Set(transactions.map(transactionFingerprint));
      const freshCreated = created.filter(t => {
        const fp = transactionFingerprint(t);
        if (seen.has(fp)) return false;
        seen.add(fp);
        return true;
      });
      if (freshCreated.length) persist('transactions', [...transactions, ...freshCreated], setTransactions);
    }
  }, [recurring, transactions, persist]);

  const updateRecurring = useCallback((id, patch) => {
    persist('recurring', recurring.map(r => r.id === id ? { ...r, ...patch } : r), setRecurring);
  }, [recurring, persist]);

  const deleteRecurring = useCallback((id) => {
    persist('recurring', recurring.filter(r => r.id !== id), setRecurring);
  }, [recurring, persist]);

  const dismissAlert = useCallback((alertId) => {
    const next = [...dismissed, alertId];
    setDismissed(next);
    if (store) store.setMeta('dismissedAlerts', next);
  }, [dismissed, store]);

  const replaceAllData = useCallback(async ({ transactions: tx = [], budgets: bg = [], goals: gl = [], recurring: rc = [] }) => {
    setTransactions(tx);
    setBudgets(bg);
    setGoals(gl);
    setRecurring(rc);
    if (!store) return;
    await Promise.all([
      store.write('transactions', tx),
      store.write('budgets', bg),
      store.write('goals', gl),
      store.write('recurring', rc),
    ]);
  }, [store]);

  const resetAllData = useCallback(async () => {
    setTransactions([]);
    setBudgets([]);
    setGoals([]);
    setRecurring([]);
    setDismissed([]);
    if (store) await store.clearAll();
  }, [store]);

  const value = useMemo(() => ({
    loading,
    transactions, budgets, goals, recurring, dismissed,
    addTransaction, addTransactions, updateTransaction, deleteTransaction,
    setBudget, deleteBudget,
    addGoal, updateGoal, contributeToGoal, deleteGoal,
    addRecurring, updateRecurring, deleteRecurring,
    dismissAlert, replaceAllData, resetAllData,
  }), [loading, transactions, budgets, goals, recurring, dismissed,
    addTransaction, addTransactions, updateTransaction, deleteTransaction, setBudget, deleteBudget,
    addGoal, updateGoal, contributeToGoal, deleteGoal,
    addRecurring, updateRecurring, deleteRecurring, dismissAlert, replaceAllData, resetAllData]);

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}

export { monthKey };
