// Shared domain constants and small pure helpers.

export const INCOME_CATEGORIES = ['Salary', 'Freelance', 'Investments', 'Gifts', 'Other'];

export const EXPENSE_CATEGORIES = [
  'Food', 'Transportation', 'Rent', 'Utilities',
  'Entertainment', 'Healthcare', 'Shopping', 'EMI',
  'Insurance', 'Education', 'Taxes', 'Other',
];

// One colour per expense category, drawn from the app palette. Keeping this in
// one place means charts, lists, and budgets all agree.
export const CATEGORY_COLORS = {
  Food: '#D1435B',
  Transportation: '#2F6FED',
  Rent: '#6F5DD3',
  Utilities: '#B7791F',
  Entertainment: '#087F6D',
  Healthcare: '#E05286',
  Shopping: '#9B6BD3',
  EMI: '#334155',
  Insurance: '#0F9F9A',
  Education: '#C2410C',
  Taxes: '#64748B',
  Other: '#6B7280',
  Salary: '#087F6D',
  Freelance: '#14A38B',
  Investments: '#2F6FED',
  Gifts: '#E05286',
};

export function colorFor(category) {
  return CATEGORY_COLORS[category] || '#7A7A72';
}

export const CURRENCIES = {
  INR: { symbol: '₹', locale: 'en-IN' },
};

export function formatMoney(amount) {
  const c = CURRENCIES.INR;
  return new Intl.NumberFormat(c.locale, {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(amount || 0);
}

export function monthKey(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function monthLabel(key) {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function transactionFingerprint(t) {
  return [
    t.date || '',
    t.type || '',
    Number(t.amount || 0).toFixed(2),
    t.category || '',
    String(t.note || '').toLowerCase().replace(/\s+/g, ' ').trim(),
  ].join('|');
}
