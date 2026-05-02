'use client';
import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import type { Category } from '@/lib/queries/categories';

interface Budget { id: number; category_id: number; monthly_limit: number; alert_threshold: number; display_name: string; color: string; spent: number; percent_used: number; is_over_threshold: boolean; }
const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
const barColor = (pct: number) => pct >= 1 ? 'bg-red-500' : pct >= 0.9 ? 'bg-orange-500' : pct >= 0.7 ? 'bg-yellow-500' : 'bg-green-500';

export default function BudgetsClient({ categories }: { categories: Category[] }) {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formCategoryId, setFormCategoryId] = useState('');
  const [formLimit, setFormLimit] = useState('');
  const [formThreshold, setFormThreshold] = useState('80');
  const month = format(new Date(), 'yyyy-MM');

  const fetchBudgets = async () => {
    setLoading(true);
    setBudgets(await fetch(`/api/budgets?month=${month}`).then(r => r.json()));
    setLoading(false);
  };
  useEffect(() => { fetchBudgets(); }, []);

  const availableCategories = editingId ? categories : categories.filter(c => !budgets.some(b => b.category_id === c.id));

  async function handleSubmit() {
    if (editingId) {
      await fetch(`/api/budgets/${editingId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ monthly_limit: Number(formLimit), alert_threshold: Number(formThreshold) / 100 }) });
    } else {
      await fetch('/api/budgets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ category_id: Number(formCategoryId), monthly_limit: Number(formLimit), alert_threshold: Number(formThreshold) / 100 }) });
    }
    setShowModal(false); setEditingId(null); setFormCategoryId(''); setFormLimit(''); setFormThreshold('80');
    fetchBudgets();
  }

  function openEdit(b: Budget) { setEditingId(b.id); setFormCategoryId(String(b.category_id)); setFormLimit(String(b.monthly_limit)); setFormThreshold(String(Math.round(b.alert_threshold * 100))); setShowModal(true); }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <p className="text-gray-500 text-sm">{budgets.length} budget{budgets.length !== 1 ? 's' : ''} set for {month}</p>
        <button onClick={() => { setShowModal(true); setEditingId(null); }} className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium py-2 px-4 rounded-lg">+ Add Budget</button>
      </div>
      {loading ? <div className="text-center py-12 text-gray-400">Loading…</div> : budgets.length === 0 ? <div className="text-center py-12 text-gray-400">No budgets yet. Add one above.</div> : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {budgets.map(b => (
            <div key={b.id} className={`bg-white rounded-xl shadow-sm border p-5 ${b.is_over_threshold ? 'border-amber-200' : 'border-gray-100'}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: b.color }} />
                  <span className="font-medium text-gray-800">{b.display_name}</span>
                  {b.is_over_threshold && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">Alert</span>}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openEdit(b)} className="text-gray-400 text-xs hover:text-indigo-600">Edit</button>
                  <button onClick={async () => { await fetch(`/api/budgets/${b.id}`, { method: 'DELETE' }); fetchBudgets(); }} className="text-gray-400 text-xs hover:text-red-500">Delete</button>
                </div>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2 mb-2">
                <div className={`h-2 rounded-full transition-all ${barColor(b.percent_used)}`} style={{ width: `${Math.min(b.percent_used * 100, 100)}%` }} />
              </div>
              <div className="flex justify-between text-sm text-gray-500"><span>{fmt(b.spent)} spent</span><span>{fmt(b.monthly_limit)} limit</span></div>
            </div>
          ))}
        </div>
      )}
      {showModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="font-semibold text-gray-800 mb-4">{editingId ? 'Edit Budget' : 'New Budget'}</h3>
            <div className="space-y-3">
              {!editingId && (
                <div><label className="text-sm text-gray-600 block mb-1">Category</label>
                  <select value={formCategoryId} onChange={e => setFormCategoryId(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                    <option value="">Select category…</option>
                    {availableCategories.map(c => <option key={c.id} value={c.id}>{c.display_name}</option>)}
                  </select>
                </div>
              )}
              <div><label className="text-sm text-gray-600 block mb-1">Monthly Limit ($)</label><input type="number" value={formLimit} onChange={e => setFormLimit(e.target.value)} placeholder="e.g. 500" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" /></div>
              <div><label className="text-sm text-gray-600 block mb-1">Alert at ({formThreshold}%)</label><input type="range" min={50} max={100} value={formThreshold} onChange={e => setFormThreshold(e.target.value)} className="w-full" /></div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={handleSubmit} disabled={!formLimit || (!editingId && !formCategoryId)} className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium">{editingId ? 'Save' : 'Create'}</button>
              <button onClick={() => { setShowModal(false); setEditingId(null); }} className="flex-1 border border-gray-200 text-gray-600 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
