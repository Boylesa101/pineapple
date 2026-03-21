import type { ReactNode } from 'react';

import { siteConfig } from '@shared/pineappleSiteContent';

type SiteLayoutProps = {
  currentPath: '/' | '/privacy' | '/terms' | '/support';
  eyebrow?: string;
  title: string;
  lede: string;
  children: ReactNode;
};

const navItems = [
  { label: 'Home', href: '/' },
  { label: 'Privacy', href: '/privacy/' },
  { label: 'Terms', href: '/terms/' },
  { label: 'Support', href: '/support/' },
] as const;

export function MaterialIcon({ name }: { name: string }) {
  return (
    <span aria-hidden="true" className="material-symbols-rounded">
      {name}
    </span>
  );
}

export function SiteLayout({ currentPath, eyebrow, title, lede, children }: SiteLayoutProps) {
  return (
    <div className="site-shell">
      <header className="topbar">
        <a className="brandmark" href="/">
          <span className="brandmark-badge" aria-hidden="true">
            P
          </span>
          <span className="brandmark-wording">
            <strong>{siteConfig.appName}</strong>
            <span>{siteConfig.tagline}</span>
          </span>
        </a>
        <nav className="topnav" aria-label="Primary">
          {navItems.map((item) => {
            const normalizedCurrent = currentPath === '/' ? '/' : `${currentPath}/`;
            const isActive = item.href === normalizedCurrent;
            return (
              <a key={item.href} className={isActive ? 'nav-link nav-link-active' : 'nav-link'} href={item.href}>
                {item.label}
              </a>
            );
          })}
        </nav>
      </header>

      <main className="page">
        <section className="page-hero">
          {eyebrow ? <p className="page-eyebrow">{eyebrow}</p> : null}
          <h1>{title}</h1>
          <p className="page-lede">{lede}</p>
        </section>
        {children}
      </main>

      <footer className="site-footer">
        <div className="site-footer-grid">
          <div>
            <strong>{siteConfig.appName}</strong>
            <p>{siteConfig.tagline}</p>
          </div>
          <nav className="footer-links" aria-label="Footer">
            <a href="/">Home</a>
            <a href="/privacy/">Privacy</a>
            <a href="/terms/">Terms</a>
            <a href="/support/">Support</a>
          </nav>
        </div>
        <p className="footer-small">{siteConfig.smallPrint}</p>
        <p className="footer-small">© {new Date().getFullYear()} {siteConfig.copyrightName}</p>
      </footer>
    </div>
  );
}
