'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/transactions', label: 'Transactions', icon: '💳' },
  { href: '/categories', label: 'Categories', icon: '🏷️' },
  { href: '/trends', label: 'Trends', icon: '📈' },
  { href: '/budgets', label: 'Budgets', icon: '🎯' },
  { href: '/settings', label: 'Settings', icon: '⚙️' },
];

export default function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="w-56 min-h-screen bg-gray-900 text-gray-100 flex flex-col py-6 px-3 fixed top-0 left-0 z-20">
      <div className="mb-8 px-3">
        <h1 className="text-xl font-bold text-white">SpendingCalc</h1>
        <p className="text-gray-600 text-xs mt-0.5">Personal Finance</p>
      </div>
      <nav className="flex flex-col gap-1 flex-1">
        {links.map((link) => {
          const active = pathname.startsWith(link.href);
          return (
            <Link key={link.href} href={link.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${active ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'}`}>
              <span>{link.icon}</span>{link.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
