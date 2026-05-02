import TopBar from '@/components/layout/TopBar';
import BudgetsClient from './BudgetsClient';
import { getCategories } from '@/lib/queries/categories';
export default function BudgetsPage() {
  return (<><TopBar title="Budgets" /><div className="p-6"><BudgetsClient categories={getCategories()} /></div></>);
}
