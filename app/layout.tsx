import type { Metadata } from 'next';
import './globals.css';
import Sidebar from '@/components/layout/Sidebar';

export const metadata: Metadata = { title: 'SpendingCalc', description: 'Personal spending tracker' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 antialiased">
        <Sidebar />
        <main className="ml-56 pt-14 min-h-screen">{children}</main>
      </body>
    </html>
  );
}
