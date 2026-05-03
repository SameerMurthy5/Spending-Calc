'use client';
import { useState } from 'react';

export default function TopBar({ title }: { title: string }) {
  const [syncing, setSyncing] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);

  async function handleSync() {
    setSyncing(true); setLastResult(null);
    try {
      const data = await fetch('/api/plaid/sync', { method: 'POST' }).then(r => r.json());
      setLastResult(data.success ? `+${data.added} added, ${data.modified} updated` : 'Sync failed');
    } catch { setLastResult('Sync failed'); }
    setSyncing(false);
  }

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 fixed top-0 left-56 right-0 z-10">
      <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
      <div className="flex items-center gap-3">
        {lastResult && <span className="text-sm text-gray-700">{lastResult}</span>}
        <button onClick={handleSync} disabled={syncing}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium py-1.5 px-4 rounded-lg transition-colors">
          {syncing ? 'Syncing…' : 'Sync Now'}
        </button>
      </div>
    </header>
  );
}
