import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, todayISO } from './domain.js';

const CATEGORY_RULES = [
  ['Food', /swiggy|zomato|restaurant|restau|cafe|coffee|food|dining|dominos|pizza|kitchen|hotel|sarovara|mayura|shivalli|vasavi/i],
  ['Transportation', /uber|ola|metro|fuel|petrol|diesel|parking|rapido|transport|bmtc|nice limited|toll|indian oil|sara fuel/i],
  ['Rent', /rent|landlord|lease/i],
  ['Utilities', /electric|water|gas|broadband|wifi|airtel|jio|bsnl|utility|recharge/i],
  ['Entertainment', /netflix|prime|spotify|hotstar|bookmyshow|movie|game/i],
  ['Healthcare', /hospital|clinic|pharma|medical|doctor|apollo|medicine/i],
  ['Shopping', /amazon|flipkart|myntra|nykaa|shopping|store|mart/i],
  ['EMI', /emi|loan|hdfc bank loan|bajaj finance|capital float|lending|mpokket|incred|fibe/i],
  ['Insurance', /insurance|lic|policybazaar|premium/i],
  ['Education', /school|college|tuition|course|udemy|coursera|byju|unacademy/i],
  ['Taxes', /tax|gst|tds|income tax/i],
  ['Salary', /salary|payroll|stipend/i],
  ['Freelance', /freelance|consulting|invoice/i],
  ['Investments', /dividend|interest|mutual fund|sip|zerodha|groww|upstox/i],
  ['Gifts', /gift|cashback|reward/i],
];

const HEADER_HINTS = {
  date: ['date', 'txn date', 'transaction date', 'value date', 'posted date'],
  note: ['narration', 'description', 'particulars', 'details', 'remarks', 'transaction remarks'],
  debit: ['debit', 'withdrawal', 'withdrawals', 'dr', 'paid out'],
  credit: ['credit', 'deposit', 'deposits', 'cr', 'paid in'],
  amount: ['amount', 'transaction amount'],
  type: ['type', 'dr/cr', 'debit/credit'],
};

export function parseStatement(text) {
  if (/\d[\d,]*\.\d{2}\((?:Dr|Cr)\)/i.test(text)) return parsePlainTextStatement(text, true);
  const balanceRows = parseRunningBalanceStatement(text);
  if (balanceRows.length) return balanceRows;

  const rows = parseDelimited(text);
  if (rows.length < 2) return parsePlainTextStatement(text);

  const headerIndex = rows.findIndex(row => {
    const h = row.map(normalize);
    return findIndex(h, HEADER_HINTS.date) >= 0 && (
      findIndex(h, HEADER_HINTS.debit) >= 0 ||
      findIndex(h, HEADER_HINTS.credit) >= 0 ||
      findIndex(h, HEADER_HINTS.amount) >= 0
    );
  });
  if (headerIndex < 0) return parsePlainTextStatement(text);

  const headers = rows[headerIndex].map(h => normalize(h));
  const indexes = Object.fromEntries(
    Object.entries(HEADER_HINTS).map(([key, hints]) => [key, findIndex(headers, hints)])
  );
  if (indexes.date < 0) return parsePlainTextStatement(text);

  return rows.slice(headerIndex + 1)
    .map(row => normalizeRow(row, indexes))
    .filter(Boolean);
}


function parseDelimited(text) {
  const delimiter = guessDelimiter(text);
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];
    if (ch === '"' && quoted && next === '"') {
      cell += '"';
      i++;
    } else if (ch === '"') {
      quoted = !quoted;
    } else if (ch === delimiter && !quoted) {
      row.push(cell.trim());
      cell = '';
    } else if ((ch === '\n' || ch === '\r') && !quoted) {
      if (ch === '\r' && next === '\n') i++;
      row.push(cell.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += ch;
    }
  }
  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

function guessDelimiter(text) {
  const first = text.split(/\r?\n/).find(Boolean) || '';
  const options = [',', '\t', ';'];
  return options.sort((a, b) => first.split(b).length - first.split(a).length)[0];
}

function normalizeRow(row, indexes) {
  const note = value(row, indexes.note) || 'Bank statement import';
  const date = parseDate(value(row, indexes.date));
  if (!date) return null;

  const debit = parseAmount(value(row, indexes.debit));
  const credit = parseAmount(value(row, indexes.credit));
  const rawAmount = parseAmount(value(row, indexes.amount));
  const rawType = normalize(value(row, indexes.type));

  let type = credit > 0 ? 'income' : debit > 0 ? 'expense' : '';
  let amount = credit > 0 ? credit : debit;

  if (!type && rawAmount > 0) {
    type = /cr|credit|deposit|income/.test(rawType) ? 'income' : 'expense';
    amount = rawAmount;
  }
  if (!amount || !type) return null;

  return {
    type,
    amount: Math.round(amount * 100) / 100,
    category: guessCategory(note, type),
    date,
    note,
  };
}

function parsePlainTextStatement(text, taggedOnly = false) {
  return text
    .split(/\r?\n/)
    .map(line => line.replace(/\s+/g, ' ').trim())
    .map(line => parseStatementLine(line, taggedOnly))
    .filter(Boolean);
}

function parseRunningBalanceStatement(text) {
  const lines = text
    .split(/\r?\n/)
    .map(line => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  let previousBalance = null;
  const opening = lines.find(line => /\b(opening\s*(?:balance|bal)|balance\s*(?:b\/f|brought\s+forward))\b/i.test(line));
  const openingAmounts = opening ? moneyTokensUniversal(opening) : [];
  if (openingAmounts.length) previousBalance = openingAmounts.at(-1).value;

  const out = [];
  lines.forEach(line => {
    const row = parseRunningBalanceLine(line, previousBalance);
    if (!row) return;
    previousBalance = row.balance;
    if (row.transaction) out.push(row.transaction);
  });
  return out;
}

function parseRunningBalanceLine(line, previousBalance) {
  const match = line.match(/^(?:\d+\s+)?(\d{1,2}[-/]\d{1,2}[-/]\d{2,4}|\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[\s-]+[A-Za-z]{3,9}[\s-]+\d{2,4})\s+(.+)$/);
  if (!match) return null;

  const date = parseDate(match[1]);
  if (!date) return null;

  const rest = match[2];
  const amounts = moneyTokensUniversal(rest);
  if (amounts.length < 2) return null;

  const balance = amounts.at(-1).value;
  const listedAmount = amounts.at(-2).value;
  if (previousBalance === null) return { balance, transaction: null };
  const delta = Math.round((balance - previousBalance) * 100) / 100;
  if (delta === 0) return null;

  const type = delta > 0 ? 'income' : 'expense';
  const amount = Math.abs(delta);
  if (Math.abs(amount - listedAmount) > 0.05) return null;
  const finalAmount = listedAmount;
  const note = rest
    .slice(0, amounts.at(-2).index)
    .replace(/\b(UPI|IMPS|NACH|NEFT|RTGS|KPG|NACHDB|MB)-\S+/ig, '')
    .replace(/\s+/g, ' ')
    .trim();

  return {
    balance,
    transaction: {
      type,
      amount: Math.round(finalAmount * 100) / 100,
      category: guessCategory(note, type),
      date,
      note: note || 'Bank statement import',
    },
  };
}

function moneyTokensLegacy(input) {
  return [...String(input || '').matchAll(/(?:₹|Rs\.?|INR)?\s*-?\(?\d[\d,]*(?:\.\d{1,2})\)?(?:\s*(?:Dr|Cr))?/gi)]
    .map(m => ({
      raw: m[0],
      index: m.index || 0,
      value: parseAmount(m[0]),
      tag: /\bcr\b/i.test(m[0]) ? 'cr' : /\bdr\b/i.test(m[0]) ? 'dr' : '',
    }))
    .filter(m => m.value > 0 && /[.,]|\b(?:dr|cr)\b/i.test(m.raw));
}

function moneyTokensUniversal(input) {
  if (!input) return moneyTokensLegacy(input);
  return [...String(input || '').matchAll(/(?:\u20b9|Rs\.?|INR)?\s*-?\(?\d[\d,]*(?:\.\d{1,2})\)?(?:\s*(?:Dr|Cr))?/gi)]
    .map(m => {
      const numeric = m[0].replace(/[^\d.,-]/g, '').replace(/,/g, '');
      return {
        raw: m[0],
        index: m.index || 0,
        value: Math.abs(Number.parseFloat(numeric)),
      };
    })
    .filter(m => Number.isFinite(m.value) && m.value > 0 && /[.,]|\b(?:dr|cr)\b/i.test(m.raw));
}

function parseStatementLine(line, taggedOnly = false) {
  const dateMatch = line.match(/\b(\d{1,2}[-/]\d{1,2}[-/]\d{2,4}|\d{4}[-/]\d{1,2}[-/]\d{1,2})\b/);
  if (!dateMatch) return null;
  const date = parseDate(dateMatch[1]);
  if (!date) return null;

  const lower = line.toLowerCase();
  if (lower.includes('opening balance') || lower.includes('closing balance')) return null;

  const taggedAmounts = [...line.matchAll(/((?:₹\s*)?\d[\d,]*\.\d{2})\((Dr|Cr)\)/gi)]
    .map(m => ({ raw: m[0], value: parseAmount(m[1]), tag: m[2].toLowerCase() }))
    .filter(m => m.value > 0);
  const transactionAmount = taggedAmounts[0];
  if (taggedOnly && !transactionAmount) return null;

  const amountMatches = taggedAmounts.length ? [] : [...line.matchAll(/(?:₹\s*)?-?\(?\d+(?:,\d{2,3})*(?:\.\d{1,2})?\)?/g)]
    .map(m => ({ raw: m[0], value: parseAmount(m[0]) }))
    .filter(m => m.value > 0);

  if (!transactionAmount && !amountMatches.length) return null;

  const explicitCredit = /\b(cr|credit|deposit|salary|interest|refund|cashback|received)\b/i.test(line);
  const explicitDebit = /\b(dr|debit|withdrawal|upi|imps|neft|atm|pos|sent|paid|payment)\b/i.test(line);
  const type = transactionAmount
    ? transactionAmount.tag === 'cr' ? 'income' : 'expense'
    : explicitCredit && !explicitDebit ? 'income' : 'expense';
  const amount = transactionAmount
    ? transactionAmount.value
    : amountMatches.length >= 2 ? amountMatches[amountMatches.length - 2].value : amountMatches.at(-1).value;
  const note = line
    .replace(dateMatch[0], '')
    .replace(/(?:₹\s*)?\d[\d,]*\.\d{2}\((?:Dr|Cr)\)/ig, '')
    .replace(/(?:₹\s*)?-?\(?\d+(?:,\d{2,3})*(?:\.\d{1,2})?\)?/g, '')
    .replace(/\b(cr|dr|credit|debit)\b/ig, '')
    .replace(/\s+/g, ' ')
    .trim();

  return {
    type,
    amount: Math.round(amount * 100) / 100,
    category: guessCategory(note, type),
    date,
    note: note || 'Bank statement import',
  };
}

function guessCategory(note, type) {
  const fallback = type === 'income' ? INCOME_CATEGORIES.at(-1) : EXPENSE_CATEGORIES.at(-1);
  const match = CATEGORY_RULES.find(([, pattern]) => pattern.test(note));
  if (!match) return fallback;
  const category = match[0];
  const allowed = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  return allowed.includes(category) ? category : fallback;
}

function parseDate(input) {
  if (!input) return '';
  const raw = input.trim();
  const iso = raw.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (iso) return `${iso[1]}-${iso[2].padStart(2, '0')}-${iso[3].padStart(2, '0')}`;

  const monthName = raw.match(/^(\d{1,2})[\s-]+([A-Za-z]{3,9})[\s-]+(\d{2,4})$/);
  if (monthName) {
    const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    const month = months.indexOf(monthName[2].slice(0, 3).toLowerCase()) + 1;
    const year = monthName[3].length === 2 ? `20${monthName[3]}` : monthName[3];
    if (month > 0) return `${year}-${String(month).padStart(2, '0')}-${monthName[1].padStart(2, '0')}`;
  }

  const match = raw.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})$/);
  if (!match) return '';
  const [, d, m, y] = match;
  const year = y.length === 2 ? `20${y}` : y;
  return `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

function parseAmount(input) {
  if (!input) return 0;
  const cleaned = input.replace(/[₹,\s]/g, '').replace(/[()]/g, '-');
  const n = Math.abs(parseFloat(cleaned));
  return Number.isFinite(n) ? n : 0;
}

function findIndex(headers, hints) {
  return headers.findIndex(h => hints.some(hint => h === hint || h.includes(hint)));
}

function value(row, index) {
  return index >= 0 ? row[index] || '' : '';
}

function normalize(input) {
  return String(input || '').trim().toLowerCase();
}

export function sampleStatementCsv() {
  return [
    'Date,Narration,Withdrawal,Deposit,Balance',
    `${todayISO()},Zomato order,420,,25000`,
    `${todayISO()},Salary credit,,75000,100000`,
  ].join('\n');
}
