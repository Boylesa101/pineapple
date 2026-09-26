import type { Metadata } from 'next';
import { messageFor } from '@/lib/messages';
import { NewClientForm } from './new-client-form';

export const metadata: Metadata = { title: 'New client' };

export default async function NewClientPage(props: PageProps<'/admin/clients/new'>) {
  const { error } = await props.searchParams;
  return (
    <>
      <div className="eyebrow">Agency admin</div>
      <h1>New client</h1>
      <p className="lede">Creates the firm and its website project, then invites your first contact.</p>
      {messageFor(error) && (
        <div className="notice err" role="alert">
          {messageFor(error)}
        </div>
      )}
      <NewClientForm />
    </>
  );
}
