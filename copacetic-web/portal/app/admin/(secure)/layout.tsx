import { Header } from '@/components/header';
import { requireAdmin } from '@/lib/auth';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const viewer = await requireAdmin();
  return (
    <>
      <Header
        area="Agency"
        email={viewer.email}
        items={[
          { href: '/admin', label: 'Clients' },
          { href: '/admin/clients/new', label: 'New client' },
          { href: '/admin/sync', label: 'Asana sync' },
        ]}
      />
      <main className="page">{children}</main>
    </>
  );
}
