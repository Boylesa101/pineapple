import Link from 'next/link';

type Item = { href: string; label: string };

export function Header({ items = [], email, area }: { items?: Item[]; email?: string; area?: string }) {
  return (
    <header className="top">
      <div className="top-in">
        <Link className="logo" href={area === 'Agency' ? '/admin' : '/'}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/mark.png" alt="" width={26} height={26} />
          <span className="word">
            copacetic<span>.web</span>
          </span>
          {area && <small>{area}</small>}
        </Link>
        <nav className="nav" aria-label="Main">
          {items.map((i) => (
            <Link key={i.href} href={i.href}>
              {i.label}
            </Link>
          ))}
        </nav>
        {email && (
          <div className="who">
            <span className="email">{email}</span>
            <form action="/auth/signout" method="post">
              <button className="btn link" type="submit">
                Sign out
              </button>
            </form>
          </div>
        )}
      </div>
    </header>
  );
}
