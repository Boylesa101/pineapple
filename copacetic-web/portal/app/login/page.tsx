import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Header } from '@/components/header';
import { getViewer, safeNext } from '@/lib/auth';
import { LoginForm } from './login-form';

export const metadata: Metadata = { title: 'Sign in' };

export default async function LoginPage(props: PageProps<'/login'>) {
  const { next, error } = await props.searchParams;
  const nextPath = safeNext(typeof next === 'string' ? next : undefined);
  if (await getViewer()) redirect(nextPath);
  return (
    <>
      <Header />
      <main className="narrow">
        <div className="eyebrow">Client portal</div>
        <h1>Sign in</h1>
        <p className="lede">We’ll email you a secure link. No password needed.</p>
        {error === 'link' && (
          <div className="notice err" role="alert">
            That sign-in link has expired or was already used. Request a new one below.
          </div>
        )}
        <LoginForm next={nextPath} />
      </main>
    </>
  );
}
