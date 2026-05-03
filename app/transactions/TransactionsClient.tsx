'use client';
import { useState, useEffect, useCallback } from 'react';
import type { Category } from '@/lib/queries/categories';
import type { Account } from '@/lib/queries/accounts';
import type { Transaction } from '@/lib/queries/transactions';

const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Math.abs(n));

export default function TransactionsClient({ categories, accounts }: { categories: Category[]; accounts: Account[] }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [account, setAccount] = useState('');
  const [loading, setLoading] = useState(false);

  const fetch_ = useCallback(async (p = 1) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(p), limit: '50' });
    if (search) params.set('search', search);
    if (category) params.set('category', category);
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    if (account) params.set('account_id', account);
    const data = await fetch(`/api/transactions?${params}`).then(r => r.json());
    setTransactions(data.transactions); setTotal(data.total); setPages(data.pages); setPage(p); setLoading(false);
  }, [search, category, from, to, account]);

  useEffect(() => { fetch_(1); }, [fetch_]);

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <input type="text" placeholder="Search merchant..." value={search} onChange={e => setSearch(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 col-span-2 md:col-span-1" />
          <select value={category} onChange={e => setCategory(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900">
            <option value="">All categories</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.display_name}</option>)}
          </select>
          <select value={account} onChange={e => setAccount(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900">
            <option value="">All accounts</option>
            {accounts.map(a => <option key={a.id} value={a.id}>{a.account_name}</option>)}
          </select>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900" />
          <input type="date" value={to} onChange={e => setTo(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900" />
        </div>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100"><p className="text-sm text-gray-500">{total} transaction{total !== 1 ? 's' : ''}</p></div>
        {loading ? <div className="py-12 text-center text-gray-400">Loading…</div> : transactions.length === 0 ? <div className="py-12 text-center text-gray-400">No transactions found.</div> : (
          <div className="divide-y divide-gray-50">
            {transactions.map(txn => (
              <div key={txn.id} className="flex items-center px-5 py-3 gap-4 hover:bg-gray-50">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs flex-shrink-0" style={{ backgroundColor: (txn.category_color ?? '#9ca3af') + '20', color: txn.category_color ?? '#9ca3af' }}>
                  {(txn.merchant_name ?? txn.name).charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{txn.merchant_name ?? txn.name}</p>
                  <p className="text-xs text-gray-400">{txn.account_name} · {txn.date}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: (txn.category_color ?? '#9ca3af') + '20', color: txn.category_color ?? '#9ca3af' }}>{txn.category_display_name ?? 'Other'}</span>
                  {txn.pending === 1 && <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-50 text-yellow-700 font-medium">Pending</span>}
                  <p className={`text-sm font-semibold w-20 text-right ${txn.amount < 0 ? 'text-green-600' : 'text-gray-900'}`}>{txn.amount < 0 ? '+' : '-'}{fmt(txn.amount)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
        {pages > 1 && (
          <div className="flex items-center justify-center gap-2 px-5 py-4 border-t border-gray-100">
            <button onClick={() => fetch_(page - 1)} disabled={page <= 1} className="text-sm px-3 py-1 rounded border disabled:opacity-40">Prev</button>
            <span className="text-sm text-gray-500">Page {page} of {pages}</span>
            <button onClick={() => fetch_(page + 1)} disabled={page >= pages} className="text-sm px-3 py-1 rounded border disabled:opacity-40">Next</button>
          </div>
        )}
      </div>
    </div>
  );
}
