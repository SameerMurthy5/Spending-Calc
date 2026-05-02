import TopBar from '@/components/layout/TopBar';
import SettingsClient from './SettingsClient';
import { getAllAccounts } from '@/lib/queries/accounts';
import { plaidEnv } from '@/lib/plaid/client';

export default function SettingsPage() {
  return (
    <>
      <TopBar title="Settings" />
      <div className="p-6 max-w-2xl">
        <SettingsClient initialAccounts={getAllAccounts()} plaidEnv={plaidEnv} />
      </div>
    </>
  );
}
