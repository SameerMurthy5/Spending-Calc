import { NextRequest, NextResponse } from 'next/server';
import { getTransactions } from '@/lib/queries/transactions';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  return NextResponse.json(getTransactions({
    search: searchParams.get('search') ?? undefined,
    category: searchParams.get('category') ? Number(searchParams.get('category')) : undefined,
    from: searchParams.get('from') ?? undefined,
    to: searchParams.get('to') ?? undefined,
    account_id: searchParams.get('account_id') ?? undefined,
    page: searchParams.get('page') ? Number(searchParams.get('page')) : 1,
    limit: searchParams.get('limit') ? Number(searchParams.get('limit')) : 50,
  }));
}
