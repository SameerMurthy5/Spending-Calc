import { NextResponse } from 'next/server';
import { getAllAccounts } from '@/lib/queries/accounts';

export async function GET() {
  return NextResponse.json(getAllAccounts());
}
