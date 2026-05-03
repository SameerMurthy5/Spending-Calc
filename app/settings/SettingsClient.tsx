'use client';
import { useState, useRef } from 'react';
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

function CsvImporter({ onImported }: { onImported: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<{ type: 'idle' | 'loading' | 'success' | 'error'; message?: string }>({ type: 'idle' });
  const [dragOver, setDragOver] = useState(false);

  async function upload(file: File) {
    setStatus({ type: 'loading' });
    const form = new FormData();
    form.append('file', file);
    try {
      const res = await fetch('/api/import/csv', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Upload failed');
      setStatus({ type: 'success', message: `✓ Imported ${data.added} transactions (${data.skipped} duplicates skipped)` });
      onImported();
    } catch (err: any) {
      setStatus({ type: 'error', message: err.message });
    }
  }

  function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    upload(files[0]);
  }

  return (
    <div className="space-y-3">
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
        onClick={() => fileRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${dragOver ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'}`}
      >
        <p className="text-3xl mb-2">📂</p>
        <p className="font-medium text-gray-700 text-sm">Drop your Capital One CSV here</p>
        <p className="text-gray-600 text-xs mt-1">or click to browse</p>
        <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={e => handleFiles(e.target.files)} />
      </div>
      {status.type === 'loading' && <p className="text-sm text-indigo-600 text-center">Importing…</p>}
      {status.type === 'success' && <p className="text-sm text-green-600 bg-green-50 rounded-lg px-3 py-2">{status.message}</p>}
      {status.type === 'error'   && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">⚠ {status.message}</p>}
    </div>
  );
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

      {/* ── CSV Import (always visible) ── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <div className="mb-4">
          <h3 className="font-semibold text-gray-800">Import from CSV</h3>
          <p className="text-sm text-gray-700 mt-0.5">
            Drop your Capital One transaction CSV here — download it from the Capital One website under <strong>Account Activity → Download</strong>.
          </p>
        </div>
        <CsvImporter onImported={() => window.location.reload()} />
      </div>

      {/* ── Step-by-step Plaid setup guide (shown when no accounts) ── */}
      {accounts.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-5">
          <h3 className="font-semibold text-gray-800 text-lg">Get started in 3 steps</h3>
          <ol className="space-y-4">
            <li className="flex gap-4">
              <span className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 font-bold text-sm flex items-center justify-center flex-shrink-0">1</span>
              <div>
                <p className="font-medium text-gray-800 text-sm">Get free Plaid API credentials</p>
                <p className="text-gray-700 text-sm mt-0.5">
                  Go to{' '}
                  <a href="https://dashboard.plaid.com/signup" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline font-medium">
                    dashboard.plaid.com/signup
                  </a>{' '}
                  → copy your <strong>Client ID</strong> and <strong>Sandbox Secret</strong>.
                </p>
              </div>
            </li>
            <li className="flex gap-4">
              <span className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 font-bold text-sm flex items-center justify-center flex-shrink-0">2</span>
              <div>
                <p className="font-medium text-gray-800 text-sm">Add credentials to <code className="bg-gray-100 px-1 rounded">.env.local</code></p>
                <pre className="bg-gray-900 text-green-400 text-xs rounded-lg p-3 mt-2 overflow-x-auto">
{`PLAID_CLIENT_ID=your_client_id
PLAID_SECRET=your_sandbox_secret
PLAID_ENV=sandbox
DATABASE_PATH=./data/spending.db`}
                </pre>
                <p className="text-gray-700 text-xs mt-1">Then restart the dev server (<code>npm run dev</code>).</p>
              </div>
            </li>
            <li className="flex gap-4">
              <span className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 font-bold text-sm flex items-center justify-center flex-shrink-0">3</span>
              <div>
                <p className="font-medium text-gray-800 text-sm">Click the button below to link your bank</p>
                <p className="text-gray-700 text-sm mt-0.5">A Plaid popup will guide you through connecting Capital One. Transactions sync automatically.</p>
              </div>
            </li>
          </ol>
          <div className="pt-2">
            <PlaidLinkButton onSuccess={() => window.location.reload()} label="🏦  Connect Bank Account" className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold py-3 px-4 rounded-xl transition-colors text-sm" />
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-gray-800">Connected Accounts</h3>
            <p className="text-sm text-gray-700 mt-0.5">Environment: <span className={`font-medium ${plaidEnv === 'production' ? 'text-green-600' : 'text-amber-600'}`}>Plaid {plaidEnv}</span></p>
          </div>
          {accounts.length > 0 && <PlaidLinkButton onSuccess={() => window.location.reload()} label="+ Add Account" />}
        </div>
        {accounts.length === 0 ? (
          <div className="text-center py-4 text-gray-600 text-sm">No accounts connected yet — follow the steps above.</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {accounts.map(a => (
              <div key={a.id} className="flex items-center gap-4 py-4">
                <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold text-sm flex-shrink-0">{a.institution_name.charAt(0)}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 text-sm">{a.account_name}{a.mask && <span className="text-gray-600"> ···{a.mask}</span>}</p>
                  <p className="text-xs text-gray-600">{a.institution_name} · {timeAgo(a.last_synced_at)}</p>
                </div>
                <div className="text-right"><p className="text-sm font-medium text-gray-800">{fmt(a.current_balance)}</p><p className="text-xs text-gray-600">{a.account_type}</p></div>
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
