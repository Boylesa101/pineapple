import { Header } from '@/components/header';
import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const viewer = await requireUser();
  const supabase = await createClient();
  const { count } = await supabase
    .from('memberships')
    .select('org_id', { count: 'exact', head: true })
    .eq('user_id', viewer.userId)
    .eq('role', 'owner');
  const items = [{ href: '/', label: 'Overview' }];
  if (count) items.push({ href: '/team', label: 'Team' });
  if (viewer.isAgencyAdmin) items.push({ href: '/admin', label: 'Agency admin' });
  return (
    <>
      <Header items={items} email={viewer.email} />
      <main className="page">{children}</main>
    </>
  );
}
