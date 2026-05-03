'use client';
import { useRouter } from 'next/navigation';
import { format, parse, subMonths, addMonths } from 'date-fns';

export default function DashboardMonthPicker({ currentMonth }: { currentMonth: string }) {
  const router = useRouter();

  const date = parse(currentMonth, 'yyyy-MM', new Date());
  const label = format(date, 'MMMM yyyy');
  const prev = format(subMonths(date, 1), 'yyyy-MM');
  const next = format(addMonths(date, 1), 'yyyy-MM');

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={() => router.push(`/dashboard?month=${prev}`)}
        className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 text-gray-500 text-sm"
      >
        ‹
      </button>
      <span className="text-sm font-semibold text-gray-700 w-32 text-center">{label}</span>
      <button
        onClick={() => router.push(`/dashboard?month=${next}`)}
        className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 text-gray-500 text-sm"
      >
        ›
      </button>
    </div>
  );
}
