import type { Metadata } from 'next';
import { Header } from '@/components/header';
import { requireAdminFlag } from '@/lib/auth';
import { MfaForm } from './mfa-form';

export const metadata: Metadata = { title: 'Two-factor check' };

export default async function MfaPage() {
  const viewer = await requireAdminFlag();
  return (
    <>
      <Header email={viewer.email} area="Agency" />
      <main className="narrow">
        <div className="eyebrow">Agency admin</div>
        <h1>Two-factor check</h1>
        <p className="lede">Agency access covers every client, so it needs a code from your authenticator app each time you sign in.</p>
        <MfaForm />
      </main>
    </>
  );
}
