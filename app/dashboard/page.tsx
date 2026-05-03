import TopBar from '@/components/layout/TopBar';
import { getDb } from '@/lib/db/client';
import { getTransactions } from '@/lib/queries/transactions';
import { getBudgets } from '@/lib/queries/budgets';
import { getAllAccounts } from '@/lib/queries/accounts';
import Link from 'next/link';
import DashboardMonthPicker from './DashboardMonthPicker';

function fmt(amount: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

export default function DashboardPage({
  searchParams,
}: {
  searchParams?: { month?: string };
}) {
  const db = getDb();
  const accounts = getAllAccounts();
  const hasAccounts = accounts.length > 0;

  // Find the most recent month that has transactions as the default
  const latestMonth = (db.prepare(
    "SELECT substr(date,1,7) as month FROM transactions ORDER BY date DESC LIMIT 1"
  ).get() as any)?.month;

  const currentMonth = new Date().toISOString().slice(0, 7);
  const defaultMonth = latestMonth ?? currentMonth;
  const month = searchParams?.month ?? defaultMonth;

  const totals = db.prepare(`
    SELECT
      COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0) as total,
      COUNT(CASE WHEN amount > 0 THEN 1 END) as tx_count
    FROM transactions
    WHERE substr(date,1,7) = ? AND pending = 0
  `).get(month) as any;

  // For the current month use days elapsed so far; for past months use all days in that month
  const isCurrentMonth = month === currentMonth;
  const daysInMonth = isCurrentMonth
    ? new Date().getDate()
    : new Date(parseInt(month.slice(0, 4)), parseInt(month.slice(5, 7)), 0).getDate();
  const dailyAvg = totals.total / Math.max(daysInMonth, 1);

  const topCat = db.prepare(`
    SELECT c.display_name, c.color, SUM(t.amount) as total
    FROM transactions t
    JOIN categories c ON t.category_id = c.id
    WHERE substr(t.date,1,7) = ? AND t.amount > 0 AND t.pending = 0
    GROUP BY c.id ORDER BY total DESC LIMIT 1
  `).get(month) as any;

  const { transactions: recent } = getTransactions({ limit: 10 });
  const alerts = getBudgets(month).filter(b => b.is_over_threshold);

  return (
    <>
      <TopBar title="Dashboard" />
      <div className="p-6 space-y-6">

        {/* Setup banner */}
        {!hasAccounts && (
          <div className="bg-indigo-600 rounded-2xl p-8 text-white flex items-center justify-between gap-6">
            <div>
              <h2 className="text-xl font-bold mb-1">Connect your bank to get started</h2>
              <p className="text-indigo-200 text-sm max-w-md">
                Import a Capital One CSV or link your account via Plaid for automatic sync.
              </p>
            </div>
            <Link href="/settings" className="flex-shrink-0 bg-white text-indigo-600 font-semibold py-3 px-6 rounded-xl hover:bg-indigo-50 transition-colors text-sm whitespace-nowrap">
              Go to Settings →
            </Link>
          </div>
        )}

        {alerts.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-amber-800 font-medium text-sm">
              Budget alert: {alerts.map(b => b.display_name).join(', ')} {alerts.length === 1 ? 'is' : 'are'} near or over limit.
            </p>
          </div>
        )}

        {/* Month picker */}
        <DashboardMonthPicker currentMonth={month} />

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <p className="text-gray-700 text-sm">Spent This Month</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{fmt(totals.total)}</p>
            <p className="text-xs text-gray-600 mt-1">{totals.tx_count} transactions</p>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <p className="text-gray-700 text-sm">Daily Average</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{fmt(dailyAvg)}</p>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <p className="text-gray-700 text-sm">Top Category</p>
            {topCat ? (
              <div className="flex items-center gap-2 mt-1">
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: topCat.color }} />
                <p className="text-xl font-bold text-gray-900 truncate">{topCat.display_name}</p>
              </div>
            ) : (
              <p className="text-2xl font-bold text-gray-600 mt-1">—</p>
            )}
            {topCat && <p className="text-xs text-gray-600 mt-1">{fmt(topCat.total)}</p>}
          </div>
        </div>

        {/* Recent transactions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-800">Recent Transactions</h3>
            <Link href="/transactions" className="text-indigo-600 text-sm hover:underline">View all</Link>
          </div>
          {recent.length === 0 ? (
            <div className="px-5 py-10 text-center text-gray-600 space-y-3">
              <p className="text-4xl">🏦</p>
              <p className="font-medium text-gray-700">No transactions yet</p>
              <p className="text-sm">
                <Link href="/settings" className="text-indigo-600 hover:underline">Import a CSV</Link> to start tracking.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {recent.map(txn => (
                <div key={txn.id} className="flex items-center px-5 py-3 gap-3">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: txn.category_color ?? '#9ca3af' }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{txn.merchant_name ?? txn.name}</p>
                    <p className="text-xs text-gray-600">{txn.category_display_name ?? 'Uncategorized'} · {txn.date}</p>
                  </div>
                  <p className={`text-sm font-semibold ${txn.amount > 0 ? 'text-gray-900' : 'text-green-600'}`}>
                    {txn.amount > 0 ? '-' : '+'}{fmt(Math.abs(txn.amount))}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
