import TopBar from '@/components/layout/TopBar';
import TransactionsClient from './TransactionsClient';
import { getCategories } from '@/lib/queries/categories';
import { getAllAccounts } from '@/lib/queries/accounts';

export default function TransactionsPage() {
  return (
    <>
      <TopBar title="Transactions" />
      <div className="p-6"><TransactionsClient categories={getCategories()} accounts={getAllAccounts()} /></div>
    </>
  );
}
