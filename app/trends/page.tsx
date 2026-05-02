import TopBar from '@/components/layout/TopBar';
import TrendsClient from './TrendsClient';
export default function TrendsPage() {
  return (<><TopBar title="Trends" /><div className="p-6"><TrendsClient /></div></>);
}
