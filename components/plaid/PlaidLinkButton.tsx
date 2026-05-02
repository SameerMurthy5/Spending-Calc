'use client';
import { useCallback, useEffect, useState } from 'react';
import { usePlaidLink } from 'react-plaid-link';

interface Props { onSuccess?: () => void; label?: string; className?: string; }

export default function PlaidLinkButton({ onSuccess, label = 'Connect Bank Account', className }: Props) {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const oauthStateId = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('oauth_state_id') : null;

  useEffect(() => {
    setLoading(true);
    fetch('/api/plaid/create-link-token', { method: 'POST' })
      .then(r => r.json())
      .then(data => { if (data.link_token) setLinkToken(data.link_token); else setError('Could not get link token'); })
      .catch(() => setError('Network error'))
      .finally(() => setLoading(false));
  }, []);

  const handleSuccess = useCallback(async (public_token: string) => {
    const res = await fetch('/api/plaid/exchange-token', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ public_token }),
    });
    if (res.ok) onSuccess?.(); else setError('Failed to connect account');
  }, [onSuccess]);

  const { open, ready } = usePlaidLink({
    token: linkToken ?? '',
    onSuccess: handleSuccess,
    ...(oauthStateId && { receivedRedirectUri: window.location.href }),
  });

  if (error) return <p className="text-red-500 text-sm">{error}</p>;
  return (
    <button onClick={() => open()} disabled={!ready || loading || !linkToken}
      className={className ?? 'bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium py-2 px-4 rounded-lg transition-colors'}>
      {loading ? 'Loading…' : label}
    </button>
  );
}
