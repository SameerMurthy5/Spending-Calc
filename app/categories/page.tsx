import TopBar from '@/components/layout/TopBar';
import CategoriesClient from './CategoriesClient';
export default function CategoriesPage() {
  return (<><TopBar title="Categories" /><div className="p-6"><CategoriesClient /></div></>);
}
