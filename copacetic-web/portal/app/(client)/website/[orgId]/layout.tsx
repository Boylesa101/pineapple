import Link from 'next/link';
import { notFound } from 'next/navigation';
import { loadWebsite } from '@/lib/website/load';
import { uuid } from '@/lib/validation';

export default async function WebsiteLayout(props: LayoutProps<'/website/[orgId]'>) {
  const { orgId } = await props.params;
  if (!uuid.safeParse(orgId).success) notFound();
  const w = await loadWebsite(orgId);

  return (
    <>
      <Link className="small" href="/">← Overview</Link>
      <div className="eyebrow" style={{ marginTop: 14 }}>Your website · {w.org.name}</div>
      {!w.enabled && !w.isAgency ? (
        <div className="card muted">
          <h1>Your website</h1>
          <p>
            Once we start building your site, this is where you’ll write blog posts, keep your opening times up to date
            and publish documents such as your price list.
          </p>
        </div>
      ) : (
        <div className="two-col" style={{ marginTop: 10 }}>
          <nav className="side" aria-label="Website">
            <Link href={`/website/${orgId}/blog`}><span>Blog</span></Link>
            <Link href={`/website/${orgId}/opening-times`}><span>Opening times</span></Link>
            <Link href={`/website/${orgId}/documents`}><span>Documents</span></Link>
            {w.sites.filter((s) => s.website_url).map((s) => (
              <a key={s.id} href={s.website_url!} target="_blank" rel="noopener noreferrer">
                <span>View {s.name}</span><span aria-hidden>↗</span>
              </a>
            ))}
          </nav>
          <div>{props.children}</div>
        </div>
      )}
    </>
  );
}
