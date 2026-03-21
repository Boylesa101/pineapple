import { AppScreenshotShell } from '../components/AppScreenshotShell';

const cards = [
  {
    title: 'Home screen',
    href: '/screens/home/',
    body: 'Stacked trip cards, floating new-trip button, and the four-tab footer.',
  },
  {
    title: 'Document Vault',
    href: '/screens/vault/',
    body: 'Physical-style passport, licence, health card, and travel cards in the current vault language.',
  },
  {
    title: 'SOS',
    href: '/screens/sos/',
    body: 'Emergency header, red hero card, embassy notes, nearest services, and trip emergency data.',
  },
  {
    title: 'Inside a trip',
    href: '/screens/trip/',
    body: 'Hero image, overview chips, travel and hotel cards, and the contextual trip footer.',
  },
] as const;

export function ScreenshotIndexPage() {
  return (
    <AppScreenshotShell screenKey="home">
      <div className="shots-index">
        <div className="shots-index-card">
          <p className="shots-index-eyebrow">Capture-ready pages</p>
          <h1>Pineapple app screenshots</h1>
          <p>
            These hidden routes mirror the current app layout in HTML/CSS so you can take browser screenshots for the
            store listing without screenshot-blocking on-device.
          </p>
        </div>

        <div className="shots-index-grid">
          {cards.map((card) => (
            <a key={card.href} className="shots-index-link" href={card.href}>
              <strong>{card.title}</strong>
              <span>{card.body}</span>
            </a>
          ))}
        </div>
      </div>
    </AppScreenshotShell>
  );
}
