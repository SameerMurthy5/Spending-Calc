import { NextRequest, NextResponse } from 'next/server';
import { deleteAccount, getAccessToken } from '@/lib/queries/accounts';
import { plaidClient } from '@/lib/plaid/client';

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const access_token = getAccessToken(params.id);
  if (access_token) {
    try { await plaidClient.itemRemove({ access_token }); } catch (err) { console.error('itemRemove error:', err); }
  }
  deleteAccount(params.id);
  return NextResponse.json({ success: true });
}
