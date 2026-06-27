// Reports & analytics — income vs expense over time, category breakdown,
// savings trend, with a selectable time range.

import { useState, useMemo, useRef } from 'react';
import { useData } from '../store/DataContext.jsx';
import { useMoney } from '../hooks/useMoney.js';
import { useSettings } from '../store/SettingsContext.jsx';
import { PageHeader } from '../components/shared.jsx';
import { EmptyState } from '../components/ui.jsx';
import { IconDownload, IconPrint } from '../components/icons.jsx';
import { exportCSV, exportExcel, printNode } from '../lib/export.js';
import { monthKey, monthLabel, colorFor } from '../lib/domain.js';
import { monthlySeries, totals } from '../lib/selectors.js';
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';

const RANGES = { 3: '3 months', 6: '6 months', 12: '12 months' };

export default function ReportsPage() {
  const { transactions } = useData();
  const money = useMoney();
  const { currency } = useSettings();
  const [range, setRange] = useState(6);
  const reportRef = useRef(null);

  const series = useMemo(() => monthlySeries(transactions, range), [transactions, range]);
  const display = series.map(s => ({ ...s, label: monthLabel(s.month).split(' ')[0].slice(0, 3) }));

  const rangeKeys = series.map(s => s.month);
  const inRange = transactions.filter(t => rangeKeys.includes(monthKey(t.date)));
  const rangeTotals = totals(inRange);

  // category breakdown across the whole range
  const catTotals = {};
  inRange.filter(t => t.type === 'expense').forEach(t => { catTotals[t.category] = (catTotals[t.category] || 0) + t.amount; });
  const pieData = Object.entries(catTotals).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

  const hasData = transactions.length > 0;
  const fmt = (v) => money(v);
  const tick = { fontSize: 12, fill: 'var(--ink-soft)' };

  function exportMonthly(kind) {
    const cols = [
      { key: 'month', label: 'Month' },
      { key: 'income', label: `Income (${currency})` },
      { key: 'expense', label: `Expenses (${currency})` },
      { key: 'net', label: `Net (${currency})` },
    ];
    const rows = series.map(s => ({ month: monthLabel(s.month), income: s.income, expense: s.expense, net: s.net }));
    const stamp = new Date().toISOString().slice(0, 10);
    kind === 'csv'
      ? exportCSV(`report-${stamp}`, cols, rows)
      : exportExcel(`report-${stamp}`, cols, rows, `Financial report — last ${RANGES[range]}`);
  }

  return (
    <>
      <PageHeader
        title="Reports & analytics"
        subtitle="Understand the shape of your money over time."
        action={
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <select className="select" value={range} onChange={e => setRange(Number(e.target.value))} style={{ width: 'auto' }}>
              {Object.entries(RANGES).map(([v, l]) => <option key={v} value={v}>Last {l}</option>)}
            </select>
            {hasData && (
              <>
                <button className="btn sm" onClick={() => exportMonthly('csv')}><IconDownload width={15} height={15} /> CSV</button>
                <button className="btn sm" onClick={() => exportMonthly('excel')}><IconDownload width={15} height={15} /> Excel</button>
                <button className="btn sm" onClick={() => printNode(reportRef.current, 'Financial Report')}><IconPrint width={15} height={15} /> PDF / Print</button>
              </>
            )}
          </div>
        }
      />

      {!hasData ? (
        <div className="card card-pad">
          <EmptyState title="No data to report yet" body="Add some income and expenses, and your trends will appear here." />
        </div>
      ) : (
        <div ref={reportRef}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 14, marginBottom: 18 }}>
            <Summary label={`Income (last ${RANGES[range]})`} value={fmt(rangeTotals.income)} tone="pos" />
            <Summary label={`Expenses (last ${RANGES[range]})`} value={fmt(rangeTotals.expense)} tone="neg" />
            <Summary label="Net" value={fmt(rangeTotals.balance)} tone={rangeTotals.balance >= 0 ? 'pos' : 'neg'} />
            <Summary label="Avg monthly spend" value={fmt(rangeTotals.expense / range)} />
          </div>

          <div className="card card-pad" style={{ marginBottom: 18 }}>
            <h3 style={{ fontSize: 16, marginBottom: 16 }}>Income vs expenses</h3>
            <div style={{ width: '100%', height: 280 }}>
              <ResponsiveContainer>
                <BarChart data={display} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
                  <XAxis dataKey="label" tick={tick} axisLine={{ stroke: 'var(--line-strong)' }} tickLine={false} />
                  <YAxis tick={tick} axisLine={false} tickLine={false} width={64} tickFormatter={(v) => fmt(v)} />
                  <Tooltip formatter={fmt} contentStyle={{ borderRadius: 10, border: '1px solid var(--line)', fontSize: 13, background: 'var(--surface)', color: 'var(--ink)' }} />
                  <Legend wrapperStyle={{ fontSize: 13 }} />
                  <Bar dataKey="income" name="Income" fill="var(--evergreen)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expense" name="Expenses" fill="var(--clay)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.2fr) minmax(0,1fr)', gap: 18 }} className="rep-grid">
            <div className="card card-pad">
              <h3 style={{ fontSize: 16, marginBottom: 16 }}>Net savings trend</h3>
              <div style={{ width: '100%', height: 240 }}>
                <ResponsiveContainer>
                  <LineChart data={display} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
                    <XAxis dataKey="label" tick={tick} axisLine={{ stroke: 'var(--line-strong)' }} tickLine={false} />
                    <YAxis tick={tick} axisLine={false} tickLine={false} width={64} tickFormatter={(v) => fmt(v)} />
                    <Tooltip formatter={fmt} contentStyle={{ borderRadius: 10, border: '1px solid var(--line)', fontSize: 13, background: 'var(--surface)', color: 'var(--ink)' }} />
                    <Line type="monotone" dataKey="net" name="Net" stroke="var(--evergreen)" strokeWidth={2.5} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card card-pad">
              <h3 style={{ fontSize: 16, marginBottom: 16 }}>Spending by category</h3>
              {pieData.length === 0 ? (
                <EmptyState title="No expenses in range" />
              ) : (
                <>
                  <div style={{ width: '100%', height: 180 }}>
                    <ResponsiveContainer>
                      <PieChart>
                        <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={44} outerRadius={78} paddingAngle={2}>
                          {pieData.map(d => <Cell key={d.name} fill={colorFor(d.name)} stroke="none" />)}
                        </Pie>
                        <Tooltip formatter={fmt} contentStyle={{ borderRadius: 10, border: '1px solid var(--line)', fontSize: 13, background: 'var(--surface)', color: 'var(--ink)' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div style={{ marginTop: 8 }}>
                    {pieData.slice(0, 6).map(d => (
                      <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', fontSize: 13.5 }}>
                        <span style={{ width: 9, height: 9, borderRadius: 2, background: colorFor(d.name) }} />
                        <span style={{ flex: 1 }}>{d.name}</span>
                        <span className="num muted">{fmt(d.value)}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`@media (max-width: 720px){ .rep-grid { grid-template-columns: 1fr !important; } }`}</style>
    </>
  );
}

function Summary({ label, value, tone }) {
  const color = tone === 'pos' ? 'var(--evergreen)' : tone === 'neg' ? 'var(--clay)' : 'var(--ink)';
  return (
    <div className="card card-pad">
      <p className="muted" style={{ fontSize: 13, margin: 0 }}>{label}</p>
      <p className="num" style={{ fontSize: 22, fontWeight: 500, color, margin: '4px 0 0' }}>{value}</p>
    </div>
  );
}
