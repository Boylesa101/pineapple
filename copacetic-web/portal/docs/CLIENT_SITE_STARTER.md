# Connecting a client's website to the portal

A client's Next.js site (App Router, Next 16) reads its blog, opening times and documents from the portal's public feeds.

- The site caches each response.
- Whenever the firm changes something, the portal calls the site's `/api/revalidate` endpoint, and the change shows up on the next page view.

## 1. Environment variables on the client's Vercel project

```bash
PORTAL_URL=https://<portal domain>
PORTAL_SITE_ID=<the site's id, shown in the portal under Admin → client → Client website>
PORTAL_REVALIDATE_SECRET=<openssl rand -hex 32>   # the same value goes in the portal's "Refresh secret" field
```

In the portal, go to Admin → the client → Client website. Enter the site's `https://` address and the same secret, then save.

## 2. `lib/portal.ts`

```ts
import 'server-only';

const base = `${process.env.PORTAL_URL}/api/public/v1/sites/${process.env.PORTAL_SITE_ID}`;

// Cached until the portal says something changed (plus an hourly safety net for scheduled posts).
async function get<T>(path: string, tag: string): Promise<T | null> {
  const res = await fetch(`${base}${path}`, { next: { tags: [tag], revalidate: 3600 } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Portal feed ${path} failed: ${res.status}`);
  return res.json() as Promise<T>;
}

export type Cover = { url: string; alt: string } | null;
export type PostSummary = { slug: string; title: string; summary: string; publishedAt: string; updatedAt: string; cover: Cover };
export type Post = PostSummary & { html: string; readingMinutes: number };
export type Interval = { open: string; close: string };
export type Office = {
  id: string; name: string; address: string | null; phone: string | null; note: string | null;
  weekly: Partial<Record<'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun', Interval[]>>;
  specialDays: { day: string; hours: Interval[] | null; note: string | null }[];
  openNow: boolean; closesAt: string | null;
};
export type Doc = { id: string; title: string; description: string | null; fileName: string; mimeType: string; sizeBytes: number; url: string };

export const getPosts = (page = 1) =>
  get<{ posts: PostSummary[]; hasMore: boolean; page: number }>(`/posts?page=${page}`, 'portal:posts');
export const getPost = (slug: string) => get<Post>(`/posts/${encodeURIComponent(slug)}`, 'portal:posts');
export const getOpeningTimes = () => get<{ timeZone: string; offices: Office[] }>('/opening-times', 'portal:opening-times');
export const getDocuments = () => get<{ documents: Doc[] }>('/documents', 'portal:documents');
```

## 3. `app/api/revalidate/route.ts`

```ts
import { createHash, timingSafeEqual } from 'node:crypto';
import { revalidateTag } from 'next/cache';

const ALLOWED = new Set(['portal:posts', 'portal:opening-times', 'portal:documents']);
const digest = (s: string) => createHash('sha256').update(s).digest();

export async function POST(request: Request) {
  const secret = process.env.PORTAL_REVALIDATE_SECRET ?? '';
  const auth = request.headers.get('authorization') ?? '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!secret || !token || !timingSafeEqual(digest(token), digest(secret))) {
    return new Response(null, { status: 401 });
  }
  const { tags } = (await request.json().catch(() => ({}))) as { tags?: unknown };
  const list = Array.isArray(tags) ? tags.filter((t): t is string => typeof t === 'string' && ALLOWED.has(t)) : [];
  // expire: 0 = the next visitor gets fresh content (no stale page after a change).
  for (const tag of list) revalidateTag(tag, { expire: 0 });
  return Response.json({ revalidated: list });
}
```

## 4. Using it in pages

```tsx
// app/blog/[slug]/page.tsx
import { notFound } from 'next/navigation';
import { getPost } from '@/lib/portal';

export default async function PostPage(props: PageProps<'/blog/[slug]'>) {
  const { slug } = await props.params;
  const post = await getPost(slug);
  if (!post) notFound();
  return (
    <article>
      <h1>{post.title}</h1>
      {/* The portal only ever emits p, h2, h3, ul, ol, li, blockquote, strong, em, br and https/mailto links,
          with all text escaped, so this HTML is safe to render. */}
      <div dangerouslySetInnerHTML={{ __html: post.html }} />
    </article>
  );
}
```

Notes:

- **Images.** Covers and documents are served from `PORTAL_URL/api/public/v1/files/<id>`, which redirects to a short-lived storage link. For `next/image`, add the portal host and your Supabase storage host to `images.remotePatterns`.
- **Opening times.** `openNow` is worked out when the feed is fetched. For a live "Open now" badge, recompute it in the browser from `weekly` and `specialDays`, which are in Europe/London time, or fetch opening times with a short `revalidate`, such as 300 seconds.
- **Addresses.** Blog posts live at `/blog/<slug>` on the client's site. The portal links there from the post editor.
