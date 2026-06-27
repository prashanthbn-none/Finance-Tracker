// Dashboard — a snapshot of financial health: balance, monthly income and
// expense, savings, budget status, and recent transactions.

import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../store/DataContext.jsx';
import { useAuth } from '../store/AuthContext.jsx';
import { useMoney } from '../hooks/useMoney.js';
import { PageHeader } from '../components/shared.jsx';
import { StatCard, ProgressBar, EmptyState } from '../components/ui.jsx';
import TransactionList from '../components/TransactionList.jsx';
import { monthKey, monthLabel, colorFor } from '../lib/domain.js';
import {
  totals,
  totalsForMonth,
  budgetStatus,
  spendByCategory,
  goalProgress,
  monthlySeries,
  sum,
  savingsRateForMonth,
  topExpenseCategory,
  upcomingRecurring,
  cashflowForecast,
} from '../lib/selectors.js';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, AreaChart, Area, XAxis, CartesianGrid } from 'recharts';

export default function DashboardPage() {
  const { transactions, budgets, goals, recurring } = useData();
  const { user } = useAuth();
  const money = useMoney();
  const mKey = monthKey(new Date());

  const allTotals = totals(transactions);
  const month = totalsForMonth(transactions, mKey);
  const savings = sum(goals.map(g => ({ amount: g.saved || 0 })));

  const bStatus = useMemo(() => budgetStatus(budgets, transactions, mKey), [budgets, transactions, mKey]);
  const spend = useMemo(() => spendByCategory(transactions, mKey), [transactions, mKey]);
  const trend = useMemo(() => monthlySeries(transactions, 6).map(s => ({ ...s, label: monthLabel(s.month).split(' ')[0].slice(0, 3) })), [transactions]);
  const savingsRate = useMemo(() => savingsRateForMonth(transactions, mKey), [transactions, mKey]);
  const topSpend = useMemo(() => topExpenseCategory(transactions, mKey), [transactions, mKey]);
  const upcoming = useMemo(() => upcomingRecurring(recurring, 30), [recurring]);
  const forecast = useMemo(() => cashflowForecast({ transactions, recurring }, mKey), [transactions, recurring, mKey]);
  const pieData = Object.entries(spend).map(([name, value]) => ({ name, value }));
  const recent = transactions;
  const hasTrend = transactions.length > 0;

  const firstName = (user?.name || '').split(' ')[0];

  return (
    <>
      <PageHeader
        title={firstName ? `Hello, ${firstName}` : 'Dashboard'}
        subtitle={`Your financial snapshot for ${monthLabel(mKey)}.`}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 22 }}>
        <StatCard label="Total balance" value={money(allTotals.balance)} tone={allTotals.balance >= 0 ? 'pos' : 'neg'} sub="income minus expenses" />
        <StatCard label="Income this month" value={money(month.income)} tone="pos" />
        <StatCard label="Spent this month" value={money(month.expense)} tone="neg" />
        <StatCard label="Savings rate" value={`${Math.round(savingsRate.rate * 100)}%`} tone={savingsRate.rate >= 0.2 ? 'pos' : savingsRate.rate < 0 ? 'neg' : undefined} sub={`${money(month.balance)} net this month`} />
        <StatCard label="Saved toward goals" value={money(savings)} />
      </div>

      <div className="insight-strip" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: 14, marginBottom: 18 }}>
        <InsightCard
          title="30-day forecast"
          value={money(forecast.projectedNet)}
          tone={forecast.projectedNet >= 0 ? 'pos' : 'neg'}
          detail={`${money(forecast.scheduledIncome)} incoming, ${money(forecast.scheduledExpense)} scheduled out`}
        />
        <InsightCard
          title="Top spend"
          value={topSpend ? topSpend.category : 'No spend'}
          detail={topSpend ? `${money(topSpend.amount)} (${Math.round(topSpend.share * 100)}% of expenses)` : 'Add expenses to see patterns'}
        />
        <InsightCard
          title="Bills due"
          value={String(upcoming.filter(r => r.type === 'expense').length)}
          detail={upcoming.length ? `Next: ${upcoming[0].note || upcoming[0].category} in ${upcoming[0].days} day${upcoming[0].days === 1 ? '' : 's'}` : 'Nothing due in next 30 days'}
        />
      </div>

      {hasTrend && (
        <div className="card card-pad" style={{ marginBottom: 18 }}>
          <h3 style={{ fontSize: 16, marginBottom: 14 }}>Income vs expenses — last 6 months</h3>
          <div style={{ width: '100%', height: 200 }}>
            <ResponsiveContainer>
              <AreaChart data={trend} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
                <defs>
                  <linearGradient id="gInc" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--evergreen)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--evergreen)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gExp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--clay)" stopOpacity={0.30} />
                    <stop offset="100%" stopColor="var(--clay)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: 'var(--ink-soft)' }} axisLine={{ stroke: 'var(--line-strong)' }} tickLine={false} />
                <Tooltip formatter={(v) => money(v)} contentStyle={{ borderRadius: 10, border: '1px solid var(--line)', fontSize: 13, background: 'var(--surface)', color: 'var(--ink)' }} />
                <Area type="monotone" dataKey="income" name="Income" stroke="var(--evergreen)" strokeWidth={2} fill="url(#gInc)" />
                <Area type="monotone" dataKey="expense" name="Expenses" stroke="var(--clay)" strokeWidth={2} fill="url(#gExp)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.3fr) minmax(0, 1fr)', gap: 18, marginBottom: 18 }} className="dash-grid">
        {/* spending breakdown */}
        <div className="card card-pad">
          <h3 style={{ fontSize: 16, marginBottom: 14 }}>Where your money went</h3>
          {pieData.length === 0 ? (
            <EmptyState title="No spending this month" body="Once you log expenses, you'll see a category breakdown here." />
          ) : (
            <div style={{ display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ width: 180, height: 180, flexShrink: 0 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={48} outerRadius={84} paddingAngle={2}>
                      {pieData.map(d => <Cell key={d.name} fill={colorFor(d.name)} stroke="none" />)}
                    </Pie>
                    <Tooltip formatter={(v) => money(v)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{ flex: 1, minWidth: 160 }}>
                {pieData.sort((a, b) => b.value - a.value).map(d => (
                  <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0' }}>
                    <span style={{ width: 9, height: 9, borderRadius: 2, background: colorFor(d.name) }} />
                    <span style={{ flex: 1, fontSize: 14 }}>{d.name}</span>
                    <span className="num" style={{ fontSize: 14, color: 'var(--ink-soft)' }}>{money(d.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* budget status */}
        <div className="card card-pad">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
            <h3 style={{ fontSize: 16 }}>Budget status</h3>
            <Link to="/budgets" style={{ fontSize: 13, color: 'var(--evergreen)' }}>Manage</Link>
          </div>
          {bStatus.length === 0 ? (
            <EmptyState title="No budgets set" body="Set monthly limits to track spending against them." />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {bStatus.map(b => (
                <div key={b.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, marginBottom: 5 }}>
                    <span>{b.category}</span>
                    <span className="num muted">{money(b.spent)} / {money(b.limit)}</span>
                  </div>
                  <ProgressBar ratio={b.ratio} color={b.state === 'over' ? 'var(--clay)' : b.state === 'near' ? 'var(--amber)' : 'var(--evergreen)'} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* goals + recent */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.3fr)', gap: 18 }} className="dash-grid">
        <div className="card card-pad">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
            <h3 style={{ fontSize: 16 }}>Savings goals</h3>
            <Link to="/goals" style={{ fontSize: 13, color: 'var(--evergreen)' }}>View all</Link>
          </div>
          {goals.length === 0 ? (
            <EmptyState title="No goals yet" body="Create a goal to start saving with intent." />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {goals.slice(0, 3).map(g => {
                const p = goalProgress(g);
                return (
                  <div key={g.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, marginBottom: 5 }}>
                      <span>{g.name}</span>
                      <span className="num muted">{Math.round(p.ratio * 100)}%</span>
                    </div>
                    <ProgressBar ratio={p.ratio} />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="card card-pad">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
            <h3 style={{ fontSize: 16 }}>Recent activity</h3>
            <Link to="/transactions" style={{ fontSize: 13, color: 'var(--evergreen)' }}>See all</Link>
          </div>
          <TransactionList
            items={recent.slice().sort((a,b)=> a.date<b.date?1:-1).slice(0,6)}
            emptyTitle="Nothing here yet"
            emptyBody="Your latest transactions will appear here."
          />
        </div>
      </div>

      <style>{`@media (max-width: 720px){ .dash-grid { grid-template-columns: 1fr !important; } }`}</style>
      <style>{`@media (max-width: 820px){ .insight-strip { grid-template-columns: 1fr !important; } }`}</style>
    </>
  );
}

function InsightCard({ title, value, detail, tone }) {
  return (
    <div className="card card-pad lift" style={{ minHeight: 118, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      <p className="muted" style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>{title}</p>
      <div>
        <p className={'num ' + (tone || '')} style={{ margin: '8px 0 4px', fontSize: 25, fontWeight: 600, lineHeight: 1.05 }}>{value}</p>
        <p className="muted" style={{ margin: 0, fontSize: 13 }}>{detail}</p>
      </div>
    </div>
  );
}
