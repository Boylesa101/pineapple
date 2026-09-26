import type { Metadata } from 'next';
import Link from 'next/link';
import { Submit } from '@/components/submit';
import { messageFor } from '@/lib/messages';
import { loadPosts } from '@/lib/website/data';
import { loadWebsite } from '@/lib/website/load';
import { postState } from '@/lib/website/posts';
import { createPost } from '@/app/(client)/website/actions';

export const metadata: Metadata = { title: 'Blog' };

const when = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' });
const STATE = { draft: ['Draft', ''], scheduled: ['Scheduled', 'amber'], published: ['Live', 'green'] } as const;

export default async function BlogPage(props: PageProps<'/website/[orgId]/blog'>) {
  const { orgId } = await props.params;
  const { error } = await props.searchParams;
  const w = await loadWebsite(orgId);
  const posts = await loadPosts(orgId);

  return (
    <>
      <div className="spread">
        <h1 style={{ marginBottom: 0 }}>Blog</h1>
        <form action={createPost}>
          <input type="hidden" name="orgId" value={orgId} />
          <Submit pending="Starting…">New post</Submit>
        </form>
      </div>
      <p className="lede" style={{ marginTop: 10 }}>
        {w.canPublish
          ? 'Write and publish posts for your website. You can publish straight away or schedule a date.'
          : 'Write posts for your website. An owner or approver at your firm publishes them.'}
      </p>
      {messageFor(error) && <div className="notice err" role="alert">{messageFor(error)}</div>}
      {!posts.length ? (
        <div className="card muted">No posts yet. Start one with <strong>New post</strong>.</div>
      ) : (
        <div className="card table-scroll">
          <table>
            <thead>
              <tr>
                <th scope="col">Post</th>
                <th scope="col">Status</th>
                <th scope="col">Last changed</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((p) => {
                const state = postState(p);
                const [label, tone] = STATE[state];
                return (
                  <tr key={p.id}>
                    <td>
                      <Link href={`/website/${orgId}/blog/${p.id}`}>{p.title.trim() || 'Untitled post'}</Link>
                      {p.summary && <div className="small">{p.summary}</div>}
                    </td>
                    <td>
                      <span className={`pill ${tone}`}>{label}</span>
                      {state === 'scheduled' && p.published_at && <div className="small">{when.format(new Date(p.published_at))}</div>}
                    </td>
                    <td className="small">{when.format(new Date(p.updated_at))}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
