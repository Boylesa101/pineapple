import { AppScreenshotShell, ShotMaterialIcon } from '../components/AppScreenshotShell';

const trips = [
  {
    destination: 'BALI',
    title: 'Bali reset',
    dates: '12 Apr — 20 Apr',
    meta: '2 travellers · hotel saved · flights ready',
    badge: 'All key docs',
    days: '22 days',
    imageClass: 'trip-visual-bali',
  },
  {
    destination: 'LISBON',
    title: 'Lisbon city break',
    dates: '4 May — 9 May',
    meta: '1 traveller · hotel saved · flights ready',
    badge: '2 docs need attention',
    days: '44 days',
    imageClass: 'trip-visual-lisbon',
  },
  {
    destination: 'TOKYO',
    title: 'Tokyo summer trip',
    dates: '28 Jun — 9 Jul',
    meta: '3 travellers · no hotel yet',
    badge: 'All key docs',
    days: '98 days',
    imageClass: 'trip-visual-tokyo',
  },
] as const;

export function ScreenshotHomePage() {
  return (
    <AppScreenshotShell screenKey="home">
      <div className="app-shot app-home-shot">
        <div className="shot-safe">
          <header className="app-topbar">
            <div className="app-topcopy">
              <h1>Hello Andrew</h1>
            </div>
            <div className="app-topicons">
              <button className="app-icon-button" aria-label="Account">
                <ShotMaterialIcon name="person" />
              </button>
              <button className="app-icon-button" aria-label="Notifications">
                <ShotMaterialIcon name="notifications" />
                <span className="app-notification-dot" />
              </button>
            </div>
          </header>

          <section className="app-section">
            <div className="app-section-header">
              <h2>Current trip</h2>
              <span>View all</span>
            </div>

            <div className="trip-stack-shot">
              {trips
                .map((trip, index) => ({ trip, index }))
                .reverse()
                .map(({ trip, index }) => (
                  <article
                    key={trip.destination}
                    className={`trip-card-shot ${trip.imageClass} trip-card-depth-${index}`}
                    aria-label={`${trip.title} trip card`}
                  >
                    <div className="trip-card-overlay" />
                    <div className="trip-card-content">
                      <div className="trip-card-copy">
                        <div className="trip-card-destination">{trip.destination}</div>
                        <div className="trip-card-title">{trip.title}</div>
                        <div className="trip-card-subtitle">{trip.dates}</div>
                        <div className="trip-card-meta">{trip.meta}</div>
                        <div className="trip-card-badges">
                          <span className="trip-card-badge">{trip.badge}</span>
                          <span className="trip-card-days">{trip.days}</span>
                        </div>
                      </div>
                      <div className="trip-card-actions">
                        <span className="trip-card-icon">
                          <ShotMaterialIcon name="flight" />
                        </span>
                        <span className="trip-card-icon">
                          <ShotMaterialIcon name="hotel" />
                        </span>
                        <span className="trip-card-icon">
                          <ShotMaterialIcon name="swap_horiz" />
                        </span>
                      </div>
                    </div>
                    {index === 0 ? (
                      <span className="trip-card-info">
                        <ShotMaterialIcon name="info" />
                      </span>
                    ) : null}
                  </article>
                ))}
              <div className="trip-stack-hint">Swipe up or down to move through trips</div>
            </div>
          </section>

          <button className="new-trip-fab">
            <ShotMaterialIcon name="add" />
            <span>New trip</span>
          </button>
        </div>

        <footer className="app-footer">
          <a className="app-footer-item app-footer-item-active" href="#">
            <ShotMaterialIcon name="home" />
            <span>Home</span>
          </a>
          <a className="app-footer-item" href="#">
            <ShotMaterialIcon name="folder_managed" />
            <span>Vault</span>
          </a>
          <a className="app-footer-item" href="#">
            <ShotMaterialIcon name="mood" />
            <span>Vibe</span>
          </a>
          <a className="app-footer-item" href="#">
            <ShotMaterialIcon name="sos" />
            <span>SOS</span>
          </a>
        </footer>
      </div>
    </AppScreenshotShell>
  );
}
