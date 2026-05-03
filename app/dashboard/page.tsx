import TopBar from '@/components/layout/TopBar';
import { getDb } from '@/lib/db/client';
import { getTransactions } from '@/lib/queries/transactions';
import { getBudgets } from '@/lib/queries/budgets';
import { getAllAccounts } from '@/lib/queries/accounts';
import { format } from 'date-fns';
import Link from 'next/link';

function fmt(amount: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

export default function DashboardPage() {
  const db = getDb();
  const month = format(new Date(), 'yyyy-MM');
  const accounts = getAllAccounts();
  const hasAccounts = accounts.length > 0;

  const totals = db.prepare("SELECT COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0) as total, COUNT(CASE WHEN amount > 0 THEN 1 END) as tx_count FROM transactions WHERE strftime('%Y-%m', date) = ? AND pending = 0").get(month) as any;
  const dailyAvg = totals.total / Math.max(new Date().getDate(), 1);
  const topCat = db.prepare("SELECT c.display_name, c.color, SUM(t.amount) as total FROM transactions t JOIN categories c ON t.category_id = c.id WHERE strftime('%Y-%m', t.date) = ? AND t.amount > 0 AND t.pending = 0 GROUP BY c.id ORDER BY total DESC LIMIT 1").get(month) as any;
  const { transactions: recent } = getTransactions({ limit: 10 });
  const alerts = getBudgets(month).filter(b => b.is_over_threshold);

  return (
    <>
      <TopBar title="Dashboard" />
      <div className="p-6 space-y-6">

        {/* ── Setup banner (shown until a bank is connected) ── */}
        {!hasAccounts && (
          <div className="bg-indigo-600 rounded-2xl p-8 text-white flex items-center justify-between gap-6">
            <div>
              <h2 className="text-xl font-bold mb-1">Connect your bank to get started</h2>
              <p className="text-indigo-200 text-sm max-w-md">
                Link your Capital One account via Plaid — secure OAuth, no passwords stored.
                Transactions sync automatically after you connect.
              </p>
            </div>
            <Link
              href="/settings"
              className="flex-shrink-0 bg-white text-indigo-600 font-semibold py-3 px-6 rounded-xl hover:bg-indigo-50 transition-colors text-sm whitespace-nowrap"
            >
              Connect Bank →
            </Link>
          </div>
        )}

        {alerts.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-amber-800 font-medium text-sm">Budget alert: {alerts.map(b => b.display_name).join(', ')} {alerts.length === 1 ? 'is' : 'are'} near or over limit.</p>
          </div>
        )}

        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Spent This Month', value: fmt(totals.total) },
            { label: 'Daily Average', value: fmt(dailyAvg) },
            { label: 'Top Category', value: topCat?.display_name ?? '—', color: topCat?.color },
          ].map(card => (
            <div key={card.label} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <p className="text-gray-500 text-sm">{card.label}</p>
              <div className="flex items-center gap-2 mt-1">
                {card.color && <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: card.color }} />}
                <p className="text-2xl font-bold text-gray-900 truncate">{card.value}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-800">Recent Transactions</h3>
            <Link href="/transactions" className="text-indigo-600 text-sm hover:underline">View all</Link>
          </div>
          {recent.length === 0 ? (
            <div className="px-5 py-10 text-center text-gray-400 space-y-3">
              <p className="text-4xl">🏦</p>
              <p className="font-medium text-gray-500">No transactions yet</p>
              <p className="text-sm">Connect your bank in <Link href="/settings" className="text-indigo-600 hover:underline">Settings</Link> to start tracking.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {recent.map(txn => (
                <div key={txn.id} className="flex items-center px-5 py-3 gap-3">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: txn.category_color ?? '#9ca3af' }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{txn.merchant_name ?? txn.name}</p>
                    <p className="text-xs text-gray-400">{txn.category_display_name ?? 'Uncategorized'} · {txn.date}</p>
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
