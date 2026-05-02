import { NextRequest, NextResponse } from 'next/server';
import { getCategories } from '@/lib/queries/categories';

export async function GET(req: NextRequest) {
  return NextResponse.json(getCategories(req.nextUrl.searchParams.get('month') ?? undefined));
}
