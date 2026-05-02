'use client';
import { useState } from 'react';
import PlaidLinkButton from '@/components/plaid/PlaidLinkButton';
import type { Account } from '@/lib/queries/accounts';

const fmt = (n: number | null) => n === null ? '—' : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
function timeAgo(s: string | null) {
  if (!s) return 'Never synced';
  const mins = Math.floor((Date.now() - new Date(s).getTime()) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return hrs < 24 ? `${hrs}h ago` : `${Math.floor(hrs / 24)}d ago`;
}

export default function SettingsClient({ initialAccounts, plaidEnv }: { initialAccounts: Account[]; plaidEnv: string }) {
  const [accounts, setAccounts] = useState(initialAccounts);

  async function handleDelete(id: string) {
    if (!confirm('Remove this account? All associated transactions will be deleted.')) return;
    await fetch(`/api/accounts/${id}`, { method: 'DELETE' });
    setAccounts(prev => prev.filter(a => a.id !== id));
  }

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-gray-800">Connected Accounts</h3>
            <p className="text-sm text-gray-500 mt-0.5">Environment: <span className={`font-medium ${plaidEnv === 'production' ? 'text-green-600' : 'text-amber-600'}`}>Plaid {plaidEnv}</span></p>
          </div>
          <PlaidLinkButton onSuccess={() => window.location.reload()} label="+ Connect Bank" />
        </div>
        {accounts.length === 0 ? (
          <div className="text-center py-8 text-gray-400">No accounts connected yet. Click above to link your Capital One account.</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {accounts.map(a => (
              <div key={a.id} className="flex items-center gap-4 py-4">
                <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold text-sm flex-shrink-0">{a.institution_name.charAt(0)}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 text-sm">{a.account_name}{a.mask && <span className="text-gray-400"> ···{a.mask}</span>}</p>
                  <p className="text-xs text-gray-400">{a.institution_name} · {timeAgo(a.last_synced_at)}</p>
                </div>
                <div className="text-right"><p className="text-sm font-medium text-gray-800">{fmt(a.current_balance)}</p><p className="text-xs text-gray-400">{a.account_type}</p></div>
                <button onClick={() => handleDelete(a.id)} className="text-red-400 hover:text-red-600 text-sm ml-2" title="Remove account">✕</button>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
        <strong>Note:</strong> Your bank access token and all financial data are stored locally in <code>data/spending.db</code>. Never commit this file to git — it is already in .gitignore.
      </div>
    </div>
  );
}
