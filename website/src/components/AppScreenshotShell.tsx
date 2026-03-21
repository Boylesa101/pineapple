import type { ReactNode } from 'react';

import pineappleLogo from '../../../assets/brand/pineapple-app-icon.svg';

type ScreenshotShellProps = {
  screenKey: 'home' | 'vault' | 'sos' | 'trip';
  children: ReactNode;
};

const links = [
  { key: 'home', label: 'Home', href: '/screens/home/' },
  { key: 'vault', label: 'Vault', href: '/screens/vault/' },
  { key: 'sos', label: 'SOS', href: '/screens/sos/' },
  { key: 'trip', label: 'Trip', href: '/screens/trip/' },
] as const;

export function ShotMaterialIcon({ name }: { name: string }) {
  return (
    <span className="material-symbols-rounded" aria-hidden="true">
      {name}
    </span>
  );
}

export function AppScreenshotShell({ screenKey, children }: ScreenshotShellProps) {
  return (
    <main className="shots-page">
      <header className="shots-toolbar">
        <a className="shots-toolbar-brand" href="/screens/">
          <img src={pineappleLogo} alt="Pineapple" />
          <span>Pineapple screenshot set</span>
        </a>
        <nav className="shots-toolbar-nav" aria-label="Screenshot screens">
          {links.map((link) => (
            <a
              key={link.key}
              href={link.href}
              className={screenKey === link.key ? 'shots-toolbar-link shots-toolbar-link-active' : 'shots-toolbar-link'}
            >
              {link.label}
            </a>
          ))}
        </nav>
      </header>

      <section className={`shot-stage shot-stage-${screenKey}`}>{children}</section>
    </main>
  );
}
