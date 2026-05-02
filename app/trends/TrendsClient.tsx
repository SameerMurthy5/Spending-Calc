'use client';
import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, parse } from 'date-fns';

const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

export default function TrendsClient() {
  const [data, setData] = useState<{ month: string; total: number }[]>([]);
  const [months, setMonths] = useState(12);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/analytics/monthly?months=${months}`).then(r => r.json()).then(d => { setData(d); setLoading(false); });
  }, [months]);

  const chartData = data.map(d => ({ ...d, label: format(parse(d.month, 'yyyy-MM', new Date()), 'MMM yy') }));
  const maxTotal = Math.max(...data.map(d => d.total), 1);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <label className="text-sm text-gray-600 font-medium">Show</label>
        <select value={months} onChange={e => setMonths(Number(e.target.value))} className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm">
          <option value={6}>Last 6 months</option>
          <option value={12}>Last 12 months</option>
          <option value={24}>Last 24 months</option>
        </select>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h3 className="font-semibold text-gray-800 mb-6">Monthly Spending</h3>
        {loading ? <div className="h-72 flex items-center justify-center text-gray-400">Loading…</div> : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={v => `$${v}`} tick={{ fontSize: 12 }} />
              <Tooltip formatter={v => fmt(Number(v))} labelFormatter={l => `Month: ${l}`} />
              <Line type="monotone" dataKey="total" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 4, fill: '#6366f1' }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
            <tr><th className="px-5 py-3 text-left">Month</th><th className="px-5 py-3 text-right">Total Spent</th><th className="px-5 py-3 text-left pl-8">Relative</th></tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {[...chartData].reverse().map(row => (
              <tr key={row.month} className="hover:bg-gray-50">
                <td className="px-5 py-3 font-medium">{row.label}</td>
                <td className="px-5 py-3 text-right">{fmt(row.total)}</td>
                <td className="px-5 py-3 pl-8"><div className="flex items-center gap-2"><div className="flex-1 bg-gray-100 rounded-full h-1.5"><div className="h-1.5 rounded-full bg-indigo-500" style={{ width: `${(row.total / maxTotal) * 100}%` }} /></div></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
