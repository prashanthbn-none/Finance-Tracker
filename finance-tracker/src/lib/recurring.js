// Recurring transaction logic.
//
// A recurring rule describes a transaction that repeats (monthly salary, rent,
// subscriptions). `materializeDue` walks each rule forward from its last run
// date and produces concrete transactions for every period that has come due,
// up to today. It returns the new transactions plus the updated rules (with
// advanced `lastRun` markers), so the caller can persist both together.

import { uid, } from './storage.js';

function addInterval(dateStr, frequency) {
  const d = new Date(dateStr);
  if (frequency === 'weekly') d.setDate(d.getDate() + 7);
  else if (frequency === 'yearly') d.setFullYear(d.getFullYear() + 1);
  else d.setMonth(d.getMonth() + 1); // monthly default
  return d.toISOString().slice(0, 10);
}

export function materializeDue(rules, now = new Date()) {
  const today = now.toISOString().slice(0, 10);
  const created = [];
  const updated = rules.map(rule => {
    if (rule.paused) return rule;
    let cursor = rule.lastRun || rule.startDate;
    let next = rule.lastRun ? addInterval(cursor, rule.frequency) : rule.startDate;
    let lastRun = rule.lastRun;

    while (next <= today) {
      created.push({
        id: uid(),
        type: rule.type,
        amount: rule.amount,
        category: rule.category,
        note: rule.note,
        date: next,
        recurringId: rule.id,
      });
      lastRun = next;
      next = addInterval(next, rule.frequency);
    }
    return { ...rule, lastRun };
  });

  return { created, updated };
}
