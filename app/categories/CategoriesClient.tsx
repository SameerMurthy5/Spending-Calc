'use client';
import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';

interface Cat { id: number; display_name: string; color: string; total_spent: number; tx_count: number; }
const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

export default function CategoriesClient() {
  const [month, setMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [data, setData] = useState<Cat[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');

  useEffect(() => {
    setLoading(true);
    fetch(`/api/categories?month=${month}`).then(r => r.json()).then(d => { setData(d); setLoading(false); });
  }, [month]);

  const spending = data.filter(c => c.total_spent > 0);
  const total = spending.reduce((s, c) => s + c.total_spent, 0);

  async function saveEdit(id: number) {
    await fetch(`/api/categories/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ display_name: editName, color: editColor }) });
    setEditing(null);
    setData(prev => prev.map(c => c.id === id ? { ...c, display_name: editName, color: editColor } : c));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <label className="text-sm text-gray-600 font-medium">Month</label>
        <input type="month" value={month} onChange={e => setMonth(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm" />
      </div>
      {loading ? <div className="text-center py-12 text-gray-400">Loading…</div> : spending.length === 0 ? <div className="text-center py-12 text-gray-400">No spending data for this month.</div> : (
        <>
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <h3 className="font-semibold text-gray-800 mb-4">Breakdown</h3>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={spending} dataKey="total_spent" nameKey="display_name" cx="50%" cy="50%" outerRadius={110} label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={false}>
                    {spending.map(e => <Cell key={e.id} fill={e.color} />)}
                  </Pie>
                  <Tooltip formatter={v => fmt(Number(v))} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <h3 className="font-semibold text-gray-800 mb-4">By Amount</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={spending} layout="vertical" margin={{ left: 80 }}>
                  <XAxis type="number" tickFormatter={v => `$${v}`} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="display_name" width={80} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={v => fmt(Number(v))} />
                  <Bar dataKey="total_spent" radius={[0, 4, 4, 0]}>{spending.map(e => <Cell key={e.id} fill={e.color} />)}</Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                <tr><th className="px-5 py-3 text-left">Category</th><th className="px-5 py-3 text-right">Spent</th><th className="px-5 py-3 text-right">% of Total</th><th className="px-5 py-3 text-right">Transactions</th><th className="px-5 py-3"></th></tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {spending.map(cat => (
                  <tr key={cat.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3">
                      {editing === cat.id ? (
                        <div className="flex items-center gap-2"><input type="color" value={editColor} onChange={e => setEditColor(e.target.value)} className="w-7 h-7 rounded cursor-pointer" /><input type="text" value={editName} onChange={e => setEditName(e.target.value)} className="border rounded px-2 py-1 text-sm" /></div>
                      ) : (
                        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />{cat.display_name}</div>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right font-medium">{fmt(cat.total_spent)}</td>
                    <td className="px-5 py-3 text-right text-gray-500">{total > 0 ? ((cat.total_spent / total) * 100).toFixed(1) : 0}%</td>
                    <td className="px-5 py-3 text-right text-gray-500">{cat.tx_count}</td>
                    <td className="px-5 py-3 text-right">
                      {editing === cat.id ? (
                        <div className="flex gap-2 justify-end"><button onClick={() => saveEdit(cat.id)} className="text-indigo-600 text-xs hover:underline">Save</button><button onClick={() => setEditing(null)} className="text-gray-400 text-xs hover:underline">Cancel</button></div>
                      ) : (
                        <button onClick={() => { setEditing(cat.id); setEditName(cat.display_name); setEditColor(cat.color); }} className="text-gray-400 text-xs hover:text-indigo-600">Edit</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
