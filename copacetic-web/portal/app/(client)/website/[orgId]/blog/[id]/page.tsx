import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ConfirmSubmit } from '@/components/confirm-submit';
import { Submit } from '@/components/submit';
import { messageFor } from '@/lib/messages';
import { uuid } from '@/lib/validation';
import { loadLibrary, loadPost } from '@/lib/website/data';
import { loadWebsite } from '@/lib/website/load';
import { postState } from '@/lib/website/posts';
import { deletePost, publishPost, unpublishPost } from '@/app/(client)/website/actions';
import { PostEditor } from './post-editor';

export const metadata: Metadata = { title: 'Edit post' };

const when = new Intl.DateTimeFormat('en-GB', { dateStyle: 'full', timeStyle: 'short', timeZone: 'Europe/London' });

export default async function PostPage(props: PageProps<'/website/[orgId]/blog/[id]'>) {
  const { orgId, id } = await props.params;
  const { error, published } = await props.searchParams;
  if (!uuid.safeParse(id).success) notFound();
  const w = await loadWebsite(orgId);
  const [post, images] = await Promise.all([loadPost(orgId, id), loadLibrary(orgId, 'image')]);
  if (!post) notFound();
  const state = postState(post);
  const editable = w.canPublish || state === 'draft';
  const siteUrl = w.sites.find((s) => s.website_url)?.website_url ?? null;

  return (
    <>
      <Link className="small" href={`/website/${orgId}/blog`}>← All posts</Link>
      <h1 style={{ marginTop: 10 }}>{post.title.trim() || 'Untitled post'}</h1>
      {messageFor(error) && <div className="notice err" role="alert">{messageFor(error)}</div>}
      {published && state !== 'draft' && (
        <div className="notice ok" role="status">
          {state === 'scheduled' ? 'Scheduled. It will appear on your site at the time you chose.' : 'Published. Your site updates within a minute.'}
        </div>
      )}

      <section className="card" aria-labelledby="status">
        <div className="spread">
          <h2 id="status" style={{ marginBottom: 0 }}>
            {state === 'draft' ? 'Draft' : state === 'scheduled' ? 'Scheduled' : 'Live on your site'}
          </h2>
          {state === 'published' && siteUrl && (
            <a href={`${siteUrl.replace(/\/$/, '')}/blog/${post.slug}`} target="_blank" rel="noopener noreferrer">View on your site ↗</a>
          )}
        </div>
        {state !== 'draft' && post.published_at && (
          <p className="small" style={{ marginTop: 6 }}>{state === 'scheduled' ? 'Goes live' : 'Published'} {when.format(new Date(post.published_at))}</p>
        )}
        {w.canPublish ? (
          <div className="stack" style={{ marginTop: 14 }}>
            {state !== 'published' && (
              <form action={publishPost} className="row">
                <input type="hidden" name="orgId" value={orgId} />
                <input type="hidden" name="id" value={id} />
                <input type="hidden" name="at" value="" />
                <Submit pending="Publishing…">Publish now</Submit>
              </form>
            )}
            {state === 'draft' && (
              <form action={publishPost} className="row">
                <input type="hidden" name="orgId" value={orgId} />
                <input type="hidden" name="id" value={id} />
                <label htmlFor="at" className="small">Or publish on</label>
                <input id="at" name="at" type="datetime-local" required style={{ width: 'auto' }} />
                <Submit className="btn ghost" pending="Scheduling…">Schedule</Submit>
              </form>
            )}
            {state !== 'draft' && (
              <form action={unpublishPost}>
                <input type="hidden" name="orgId" value={orgId} />
                <input type="hidden" name="id" value={id} />
                <Submit className="btn ghost" pending="Unpublishing…">{state === 'scheduled' ? 'Cancel schedule' : 'Unpublish'}</Submit>
              </form>
            )}
            <p className="hint">Times are UK time. Publishing and changes to a live post appear on your site within a minute.</p>
          </div>
        ) : (
          <p className="small" style={{ marginTop: 8 }}>
            {state === 'draft' ? 'When it’s ready, ask an owner or approver at your firm to publish it.' : 'Ask an owner or approver to make changes.'}
          </p>
        )}
      </section>

      <section className="card">
        <PostEditor
          // Publishing changes the version: start the editor afresh so autosave doesn't see a conflict.
          key={`${post.status}-${post.published_at}`}
          orgId={orgId}
          slug={post.slug}
          siteUrl={siteUrl}
          id={id}
          version={post.version}
          editable={editable}
          images={images}
          initial={{
            title: post.title,
            summary: post.summary,
            body: (post.body as { type: 'doc'; content?: unknown[] }) ?? { type: 'doc' },
            coverMediaId: post.cover_media_id,
          }}
        />
      </section>

      {editable && (
        <form action={deletePost}>
          <input type="hidden" name="orgId" value={orgId} />
          <input type="hidden" name="id" value={id} />
          <ConfirmSubmit confirm={state === 'draft' ? 'Delete this draft?' : 'Delete this post? It will disappear from your website.'}>
            Delete post
          </ConfirmSubmit>
        </form>
      )}
    </>
  );
}
