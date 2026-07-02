// Pure selectors: derive everything the UI shows from raw collections.
// No React here — just functions, so they're easy to reason about and test.

import { monthKey } from './domain.js';

export function sum(list) {
  return list.reduce((acc, t) => acc + (t.amount || 0), 0);
}

export function totals(transactions) {
  const income = sum(transactions.filter(t => t.type === 'income'));
  const expense = sum(transactions.filter(t => t.type === 'expense'));
  return { income, expense, balance: income - expense };
}

export function totalsForMonth(transactions, mKey) {
  return totals(transactions.filter(t => monthKey(t.date) === mKey));
}

// Running account balance across every completed transaction. Future-dated
// entries are excluded until their date arrives.
export function accountBalance(transactions, asOf = new Date()) {
  const cutoff = asOf instanceof Date
    ? asOf.toISOString().slice(0, 10)
    : String(asOf).slice(0, 10);
  return totals(transactions.filter(t => t.date && t.date <= cutoff));
}

// Sum of expenses per category for a given month.
export function spendByCategory(transactions, mKey) {
  const out = {};
  transactions
    .filter(t => t.type === 'expense' && monthKey(t.date) === mKey)
    .forEach(t => { out[t.category] = (out[t.category] || 0) + t.amount; });
  return out;
}

// Budget status: pair each budget with actual spend and a state flag.
export function budgetStatus(budgets, transactions, mKey) {
  const spend = spendByCategory(transactions, mKey);
  return budgets
    .filter(b => b.month === mKey)
    .map(b => {
      const spent = spend[b.category] || 0;
      const ratio = b.limit > 0 ? spent / b.limit : 0;
      let state = 'ok';
      if (ratio >= 1) state = 'over';
      else if (ratio >= 0.8) state = 'near';
      return { ...b, spent, ratio, state };
    });
}

// Monthly income vs expense series, oldest first, for line/bar charts.
export function monthlySeries(transactions, monthsBack = 6) {
  const now = new Date();
  const keys = [];
  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    keys.push(monthKey(d));
  }
  return keys.map(k => {
    const t = totalsForMonth(transactions, k);
    return { month: k, income: t.income, expense: t.expense, net: t.balance };
  });
}

export function savingsRateForMonth(transactions, mKey) {
  const t = totalsForMonth(transactions, mKey);
  const rate = t.income > 0 ? t.balance / t.income : 0;
  return { ...t, rate };
}

export function topExpenseCategory(transactions, mKey) {
  const spend = spendByCategory(transactions, mKey);
  const entries = Object.entries(spend).sort((a, b) => b[1] - a[1]);
  if (!entries.length) return null;
  const total = entries.reduce((acc, [, value]) => acc + value, 0);
  const [category, amount] = entries[0];
  return { category, amount, share: total > 0 ? amount / total : 0 };
}

export function upcomingRecurring(recurring, daysAhead = 30) {
  const today = new Date();
  const end = new Date(today);
  end.setDate(today.getDate() + daysAhead);

  return recurring
    .filter(r => !r.paused)
    .map(r => ({ ...r, nextDate: nextOccurrence(r) }))
    .filter(r => r.nextDate)
    .map(r => {
      const due = new Date(r.nextDate);
      const days = Math.ceil((due - today) / 86400000);
      return { ...r, days };
    })
    .filter(r => r.days >= 0 && new Date(r.nextDate) <= end)
    .sort((a, b) => a.nextDate.localeCompare(b.nextDate));
}

export function cashflowForecast({ transactions, recurring }, mKey) {
  const current = totalsForMonth(transactions, mKey);
  const upcoming = upcomingRecurring(recurring, 30);
  const scheduledIncome = sum(upcoming.filter(r => r.type === 'income'));
  const scheduledExpense = sum(upcoming.filter(r => r.type === 'expense'));
  return {
    currentNet: current.balance,
    scheduledIncome,
    scheduledExpense,
    projectedNet: current.balance + scheduledIncome - scheduledExpense,
  };
}

export function goalProgress(goal) {
  const ratio = goal.target > 0 ? Math.min(1, goal.saved / goal.target) : 0;
  const remaining = Math.max(0, goal.target - goal.saved);
  let daysLeft = null;
  if (goal.targetDate) {
    daysLeft = Math.ceil((new Date(goal.targetDate) - new Date()) / 86400000);
  }
  return { ratio, remaining, daysLeft, complete: goal.saved >= goal.target };
}

// Build the active notification list. Each alert has a stable id so it can be
// dismissed and stay dismissed.
export function buildAlerts({ budgets, transactions, goals, recurring }, dismissed = []) {
  const alerts = [];
  const mKey = monthKey(new Date());

  budgetStatus(budgets, transactions, mKey).forEach(b => {
    if (b.state === 'over') {
      alerts.push({
        id: `budget-over-${b.month}-${b.category}`,
        kind: 'danger',
        title: `${b.category} budget exceeded`,
        body: `You've spent more than your ${b.category.toLowerCase()} limit this month.`,
      });
    } else if (b.state === 'near') {
      alerts.push({
        id: `budget-near-${b.month}-${b.category}`,
        kind: 'warning',
        title: `${b.category} budget almost reached`,
        body: `You're at ${Math.round(b.ratio * 100)}% of your ${b.category.toLowerCase()} limit.`,
      });
    }
  });

  goals.forEach(g => {
    const { ratio, complete } = goalProgress(g);
    if (complete) {
      alerts.push({
        id: `goal-done-${g.id}`,
        kind: 'success',
        title: `Goal reached: ${g.name}`,
        body: `You've fully funded this goal. Time to put it to use.`,
      });
    } else if (ratio >= 0.5 && ratio < 0.6) {
      alerts.push({
        id: `goal-half-${g.id}`,
        kind: 'info',
        title: `Halfway to ${g.name}`,
        body: `You've saved half of your target. Keep going.`,
      });
    }
  });

  // Upcoming recurring bills within the next 5 days.
  const today = new Date();
  recurring.filter(r => !r.paused && r.type === 'expense').forEach(r => {
    const next = nextOccurrence(r);
    if (!next) return;
    const days = Math.ceil((new Date(next) - today) / 86400000);
    if (days >= 0 && days <= 5) {
      alerts.push({
        id: `bill-${r.id}-${next}`,
        kind: 'info',
        title: `Upcoming: ${r.note || r.category}`,
        body: days === 0 ? 'Due today.' : `Due in ${days} day${days === 1 ? '' : 's'}.`,
      });
    }
  });

  return alerts.filter(a => !dismissed.includes(a.id));
}

function nextOccurrence(rule) {
  const base = rule.lastRun || rule.startDate;
  if (!base) return null;
  const d = new Date(rule.lastRun ? base : rule.startDate);
  if (rule.lastRun) {
    if (rule.frequency === 'weekly') d.setDate(d.getDate() + 7);
    else if (rule.frequency === 'yearly') d.setFullYear(d.getFullYear() + 1);
    else d.setMonth(d.getMonth() + 1);
  }
  return d.toISOString().slice(0, 10);
}
