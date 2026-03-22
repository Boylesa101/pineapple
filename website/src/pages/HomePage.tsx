import {
  featureGroups,
  homeHighlights,
  legalConfig,
  privacySummaryBullets,
  whyPineappleSections,
} from '../../../src/content/legal';
import { SurfaceCard } from '../components/ContentBlocks';
import { MaterialIcon, SiteLayout } from '../components/SiteLayout';

const heroStats = [
  'Local-first travel vault',
  'Works offline for core records',
  'SOS and expiry reminders',
] as const;

const showcaseRows = [
  {
    eyebrow: 'Travel docs',
    title: 'Keep the documents that matter in one place.',
    body:
      'Passports, licences, health cards, booking references, and supporting travel notes stay together instead of getting buried across screenshots and inbox threads.',
    bullets: ['Passport-style document views', 'Quick access to key details', 'Built to stay readable on the phone'],
    toneClassName: 'showcase-panel-vault',
  },
  {
    eyebrow: 'Trips',
    title: 'See the journey, not a pile of separate tools.',
    body:
      'Flights, hotels, transfers, itinerary items, and traveller details live in one travel flow so the next decision is easier to make under pressure.',
    bullets: ['Trip-led cards and timelines', 'Hotel, transfer, and check-in details together', 'Travel-day reminders without extra apps'],
    toneClassName: 'showcase-panel-trip',
  },
  {
    eyebrow: 'SOS',
    title: 'Keep emergency help close without cluttering the rest of the app.',
    body:
      'Pineapple keeps SOS travel support separate but nearby, so emergency notes and embassy details are quick to reach when you actually need them.',
    bullets: ['Emergency contacts and notes', 'Travel support in a dedicated SOS area', 'Designed for stressful moments, not generic dashboards'],
    toneClassName: 'showcase-panel-sos',
  },
] as const;

export function HomePage() {
  const playStoreReady = legalConfig.futurePlayStoreUrl !== '#';

  return (
    <SiteLayout
      currentPath="/"
      eyebrow="Travel companion app"
      title={legalConfig.appName}
      lede="Store travel documents, organise trips, get expiry reminders, and access SOS help quickly when it matters most."
      hidePageHero
      shellClassName="site-shell-home"
      topbarClassName="topbar-home"
      pageClassName="page-home"
    >
      <section className="hero-banner">
        <div className="hero-banner-overlay" />
        <div className="hero-banner-body">
          <div className="hero-banner-grid">
            <div className="hero-banner-copy">
              <p className="hero-banner-eyebrow">Travel essentials, without the clutter</p>
              <h1>{legalConfig.tagline}</h1>
              <p className="hero-banner-text">
                Store travel documents, organise trips, get expiry reminders, and access SOS travel help quickly when
                it matters most.
              </p>
              <div className="hero-explainer">
                <h2>Why Pineapple exists</h2>
                <p>
                  Travel documents, bookings, reminders, and emergency details are usually scattered across
                  screenshots, emails, and separate apps. Pineapple brings them back into one clear place on your
                  device.
                </p>
              </div>
              <div className="hero-stat-row">
                {heroStats.map((item) => (
                  <span key={item} className="hero-stat-pill">
                    {item}
                  </span>
                ))}
              </div>
              <div className="cta-row">
                <a
                  className={playStoreReady ? 'button button-play' : 'button button-play button-disabled'}
                  href={playStoreReady ? legalConfig.futurePlayStoreUrl : '#'}
                  aria-disabled={!playStoreReady}
                >
                  <span className="play-badge-icon" aria-hidden="true">
                    ▶
                  </span>
                  <span className="play-badge-copy">
                    <small>Get it on</small>
                    <strong>Google Play</strong>
                  </span>
                </a>
                <a className="button button-ghost-light" href="/privacy/">
                  <MaterialIcon name="policy" />
                  <span>Read the privacy policy</span>
                </a>
              </div>
            </div>

            <div className="hero-showcase">
              <div className="hero-showcase-window">
                <div className="hero-showcase-phone">
                  <div className="hero-showcase-screen">
                    <div className="hero-showcase-top">
                      <span>Pineapple</span>
                      <span>Local-first</span>
                    </div>
                    <div className="hero-showcase-card hero-showcase-card-main">
                      <p className="hero-showcase-label">BALI</p>
                      <strong>Bali reset</strong>
                      <span>12 Apr — 20 Apr</span>
                      <div className="hero-showcase-chip-row">
                        <span className="hero-showcase-chip">All key docs</span>
                        <span className="hero-showcase-chip hero-showcase-chip-ghost">22 days</span>
                      </div>
                    </div>
                    <div className="hero-showcase-card">
                      <div className="hero-showcase-mini-icon">
                        <MaterialIcon name="folder_managed" />
                      </div>
                      <div>
                        <strong>Vault ready</strong>
                        <span>Passport, licence, hotel, flights</span>
                      </div>
                    </div>
                    <div className="hero-showcase-card">
                      <div className="hero-showcase-mini-icon hero-showcase-mini-icon-alert">
                        <MaterialIcon name="sos" />
                      </div>
                      <div>
                        <strong>SOS nearby</strong>
                        <span>Emergency notes and travel help</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="site-home-content">
        <section className="content-section content-section-tight">
          <div className="section-heading section-heading-wide">
            <p className="page-eyebrow">Built for real travel pressure</p>
            <h2>One app for the things people usually split across five different places.</h2>
            <p className="section-supporting">
              Pineapple is not a generic holiday planner. It is designed around the parts of travel that become
              stressful: documents, timings, reminders, and emergency access.
            </p>
          </div>
          <div className="benefit-grid">
            {homeHighlights.map((item) => (
              <SurfaceCard key={item.title} title={item.title} icon={<MaterialIcon name={item.icon} />}>
                <p>{item.body}</p>
              </SurfaceCard>
            ))}
          </div>
        </section>

        <section className="content-section showcase-section">
          {showcaseRows.map((row, index) => (
            <div
              key={row.title}
              className={index % 2 === 0 ? 'showcase-row' : 'showcase-row showcase-row-reversed'}
            >
              <div className="showcase-copy">
                <p className="page-eyebrow">{row.eyebrow}</p>
                <h2>{row.title}</h2>
                <p className="section-supporting">{row.body}</p>
                <ul className="body-list body-list-strong">
                  {row.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              </div>

              <div className={`showcase-panel ${row.toneClassName}`}>
                <div className="showcase-panel-card showcase-panel-card-large">
                  <span className="showcase-panel-eyebrow">{row.eyebrow}</span>
                  <strong>{row.title}</strong>
                  <p>{row.body}</p>
                </div>
                <div className="showcase-panel-stack">
                  <div className="showcase-panel-card">
                    <MaterialIcon name="offline_bolt" />
                    <span>Available when signal is weak</span>
                  </div>
                  <div className="showcase-panel-card">
                    <MaterialIcon name="shield_lock" />
                    <span>Travel essentials kept close at hand</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </section>

        <section className="content-section story-section">
          <div className="section-heading section-heading-wide">
            <p className="page-eyebrow">Why Pineapple is different</p>
            <h2>Travel docs, trips, and SOS are treated like one product.</h2>
          </div>
          <div className="story-grid">
            {whyPineappleSections.map((section) => (
              <SurfaceCard key={section.heading} title={section.heading}>
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </SurfaceCard>
            ))}
          </div>
        </section>

        <section className="content-section">
          <div className="section-heading section-heading-wide">
            <p className="page-eyebrow">Features</p>
            <h2>One place for travel docs, trips, and decision-making.</h2>
            <p className="section-supporting">
              The first release keeps the scope tight: secure document access, trip essentials in one place, and a
              calmer path to the details that matter on travel days.
            </p>
          </div>
          <div className="feature-showcase-grid">
            {featureGroups.map((group) => (
              <SurfaceCard key={group.title} title={group.title}>
                <p>{group.body}</p>
                <ul className="body-list">
                  {group.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </SurfaceCard>
            ))}
          </div>
        </section>

        <section className="content-section privacy-band">
          <div className="privacy-band-panel">
            <div>
              <p className="page-eyebrow page-eyebrow-light">Works offline</p>
              <h2>Built for airports, border checks, poor signal, and travel-day pressure.</h2>
            </div>
            <p>
              Pineapple is designed so your core travel records stay accessible on the device. That matters when you
              are boarding, crossing borders, or travelling without stable signal.
            </p>
            <ul className="body-list body-list-light">
              {privacySummaryBullets.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </section>

        <section className="content-section closing-cta-section">
          <div className="closing-cta-card">
            <div className="closing-cta-copy">
              <p className="page-eyebrow">Ready for launch and store review</p>
              <h2>Your travel essentials in one secure place — even offline.</h2>
              <p>
                Pineapple&apos;s public site now mirrors the app&apos;s privacy-first positioning with clear support,
                privacy, and terms pages for launch and Google Play review.
              </p>
            </div>
            <div className="closing-cta-actions">
              <a
                className={playStoreReady ? 'button button-play' : 'button button-play button-disabled'}
                href={playStoreReady ? legalConfig.futurePlayStoreUrl : '#'}
                aria-disabled={!playStoreReady}
              >
                <span className="play-badge-icon" aria-hidden="true">
                  ▶
                </span>
                <span className="play-badge-copy">
                  <small>Coming soon to</small>
                  <strong>Google Play</strong>
                </span>
              </a>
              <div className="cta-row">
                <a className="button button-secondary" href="/terms/">
                  <MaterialIcon name="gavel" />
                  <span>Terms of Use</span>
                </a>
                <a className="button button-secondary" href="/support/">
                  <MaterialIcon name="support_agent" />
                  <span>Support</span>
                </a>
              </div>
            </div>
          </div>
        </section>
      </div>
    </SiteLayout>
  );
}
