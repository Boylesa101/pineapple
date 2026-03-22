import { legalConfig } from '../../../src/content/legal';
import { MaterialIcon, SiteLayout } from '../components/SiteLayout';

const featureTeasers = [
  {
    icon: 'passport',
    title: 'Travel docs in one place',
    body: 'Keep passports, licences, health cards, and supporting records easy to reach.',
  },
  {
    icon: 'flight_takeoff',
    title: 'Trips that stay readable',
    body: 'See flights, hotels, transfers, and itinerary details in one travel-first flow.',
  },
  {
    icon: 'sos',
    title: 'SOS when things go sideways',
    body: 'Emergency notes and travel support stay nearby without cluttering the rest of the app.',
  },
] as const;

const benefitPoints = [
  'Local-first',
  'Works offline',
  'Expiry reminders',
  'Travel docs + trips + SOS',
] as const;

const testimonials = [
  {
    quote: 'It feels like the calm version of all the travel details I usually scatter across screenshots and notes.',
    name: 'Early tester',
  },
  {
    quote: 'The app is most useful right before a trip, when finding the right document quickly actually matters.',
    name: 'Frequent traveller',
  },
  {
    quote: 'Pineapple feels like one product instead of five separate travel tools stitched together.',
    name: 'Launch reviewer',
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
            <div className="hero-banner-copy hero-banner-copy-landing">
              <p className="hero-banner-eyebrow">Travel essentials, without the clutter</p>
              <h1>{legalConfig.tagline}</h1>
              <p className="hero-banner-text">
                Store travel documents, organise trips, get expiry reminders, and access SOS travel help quickly when
                it matters most.
              </p>
              <div className="hero-stat-row">
                {benefitPoints.map((item) => (
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
                    <small>Coming soon to</small>
                    <strong>Google Play</strong>
                  </span>
                </a>
                <a className="button button-ghost-light" href="/product/">
                  <MaterialIcon name="arrow_outward" />
                  <span>See how it works</span>
                </a>
              </div>
            </div>

            <div className="hero-showcase hero-showcase-landing">
              <div className="hero-showcase-window hero-showcase-window-landing">
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
                    <div className="hero-showcase-card hero-showcase-card-slim">
                      <div className="hero-showcase-mini-icon">
                        <MaterialIcon name="folder_managed" />
                      </div>
                      <div>
                        <strong>Vault</strong>
                        <span>Passport, licence, hotel, flights</span>
                      </div>
                    </div>
                    <div className="hero-showcase-card hero-showcase-card-slim">
                      <div className="hero-showcase-mini-icon hero-showcase-mini-icon-alert">
                        <MaterialIcon name="sos" />
                      </div>
                      <div>
                        <strong>SOS</strong>
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

      <div className="site-home-content site-home-content-landing">
        <section className="landing-teaser-grid" aria-label="Pineapple highlights">
          {featureTeasers.map((item) => (
            <article key={item.title} className="landing-teaser-card">
              <div className="landing-teaser-icon">
                <MaterialIcon name={item.icon} />
              </div>
              <h2>{item.title}</h2>
              <p>{item.body}</p>
              <a className="landing-inline-link" href="/product/">
                Learn more
              </a>
            </article>
          ))}
        </section>

        <section className="landing-proof-section">
          <div className="landing-proof-copy">
            <p className="page-eyebrow">Why Pineapple feels different</p>
            <h2>Made for travel pressure, not generic planning.</h2>
            <p className="section-supporting">
              Pineapple keeps documents, trip details, reminders, and emergency access in one calmer flow so the next
              thing you need is easier to find.
            </p>
            <div className="landing-proof-actions">
              <a className="button button-secondary" href="/product/">
                <MaterialIcon name="travel_explore" />
                <span>View product details</span>
              </a>
              <a className="button button-secondary" href="/privacy/">
                <MaterialIcon name="shield_lock" />
                <span>Privacy details</span>
              </a>
            </div>
          </div>
          <div className="landing-proof-panel">
            <div className="landing-proof-metric">
              <strong>Offline-first</strong>
              <span>Core travel records stay readable when signal is weak.</span>
            </div>
            <div className="landing-proof-metric">
              <strong>Reminder-led</strong>
              <span>Expiry, travel-day, and check-in prompts stay close to the trip.</span>
            </div>
            <div className="landing-proof-metric">
              <strong>SOS ready</strong>
              <span>Emergency notes and essential travel help sit in one dedicated place.</span>
            </div>
          </div>
        </section>

        <section className="landing-quote-section">
          <div className="section-heading section-heading-wide">
            <p className="page-eyebrow">Early reactions</p>
            <h2>A calmer way to keep travel essentials together.</h2>
          </div>
          <div className="landing-quote-grid">
            {testimonials.map((item) => (
              <article key={item.quote} className="landing-quote-card">
                <p>“{item.quote}”</p>
                <strong>{item.name}</strong>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-cta-section">
          <div className="landing-cta-card">
            <div className="closing-cta-copy">
              <p className="page-eyebrow">Launch-ready pages</p>
              <h2>Product, privacy, terms, and support all in one place.</h2>
              <p>
                Pineapple&apos;s public site is structured for launch and Google Play review without forcing legal copy
                and support details into the main landing page.
              </p>
            </div>
            <div className="closing-cta-actions">
              <a className="button button-secondary" href="/product/">
                <MaterialIcon name="apps" />
                <span>Product</span>
              </a>
              <a className="button button-secondary" href="/support/">
                <MaterialIcon name="support_agent" />
                <span>Support</span>
              </a>
              <a className="button button-secondary" href="/privacy/">
                <MaterialIcon name="policy" />
                <span>Privacy</span>
              </a>
            </div>
          </div>
        </section>
      </div>
    </SiteLayout>
  );
}
