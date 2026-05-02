import { NextRequest, NextResponse } from 'next/server';
import { getCategories } from '@/lib/queries/categories';
import { format } from 'date-fns';

export async function GET(req: NextRequest) {
  const month = req.nextUrl.searchParams.get('month') ?? format(new Date(), 'yyyy-MM');
  return NextResponse.json((await getCategories(month)).filter((c) => (c.total_spent ?? 0) > 0));
}
