import type { ReactNode } from 'react';

import { legalConfig } from '../../../src/content/legal';

type SiteLayoutProps = {
  currentPath: '/' | '/privacy' | '/terms' | '/support' | '/delete-account';
  eyebrow?: string;
  title: string;
  lede: string;
  children: ReactNode;
  hidePageHero?: boolean;
  shellClassName?: string;
  topbarClassName?: string;
  pageClassName?: string;
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

export function SiteLayout({
  currentPath,
  eyebrow,
  title,
  lede,
  children,
  hidePageHero = false,
  shellClassName,
  topbarClassName,
  pageClassName,
}: SiteLayoutProps) {
  return (
    <div className={shellClassName ? `site-shell ${shellClassName}` : 'site-shell'}>
      <header className={topbarClassName ? `topbar ${topbarClassName}` : 'topbar'}>
        <a className="brandmark" href="/">
          <span className="brandmark-badge" aria-hidden="true">
            P
          </span>
          <span className="brandmark-wording">
            <strong>{legalConfig.appName}</strong>
            <span>{legalConfig.tagline}</span>
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

      <main className={pageClassName ? `page ${pageClassName}` : 'page'}>
        {hidePageHero ? null : (
          <section className="page-hero">
            {eyebrow ? <p className="page-eyebrow">{eyebrow}</p> : null}
            <h1>{title}</h1>
            <p className="page-lede">{lede}</p>
          </section>
        )}
        {children}
      </main>

      <footer className="site-footer">
        <div className="site-footer-grid">
          <div>
            <strong>{legalConfig.appName}</strong>
            <p>{legalConfig.tagline}</p>
          </div>
          <nav className="footer-links" aria-label="Footer">
            <a href="/">Home</a>
            <a href="/privacy/">Privacy</a>
            <a href="/terms/">Terms</a>
            <a href="/support/">Support</a>
          </nav>
        </div>
        <p className="footer-small">{legalConfig.smallPrint}</p>
        <p className="footer-small">© {new Date().getFullYear()} {legalConfig.copyrightName}</p>
      </footer>
    </div>
  );
}
