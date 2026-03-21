import {
  featureGroups,
  homeHighlights,
  legalConfig,
  privacySummaryBullets,
  whyPineappleSections,
} from '../../../src/content/legal';
import { SurfaceCard } from '../components/ContentBlocks';
import { HomePreview } from '../components/HomePreview';
import { MaterialIcon, SiteLayout } from '../components/SiteLayout';

export function HomePage() {
  const playStoreReady = legalConfig.futurePlayStoreUrl !== '#';

  return (
    <SiteLayout
      currentPath="/"
      eyebrow="Travel companion app"
      title={legalConfig.appName}
      lede="Store travel documents, organise trips, get expiry reminders, and access SOS help quickly when it matters most."
    >
      <section className="hero-grid">
        <SurfaceCard>
          <div className="hero-copy">
            <p className="hero-tagline">{legalConfig.tagline}</p>
            <p>
              Pineapple keeps travel documents, trips, reminders, and emergency travel context together in one calm,
              privacy-aware mobile experience.
            </p>
            <div className="cta-row">
              <a
                className={playStoreReady ? 'button button-primary' : 'button button-primary button-disabled'}
                href={playStoreReady ? legalConfig.futurePlayStoreUrl : '#'}
                aria-disabled={!playStoreReady}
              >
                <MaterialIcon name="shop" />
                <span>Coming soon to Google Play</span>
              </a>
              <a className="button button-secondary" href="/privacy/">
                <MaterialIcon name="policy" />
                <span>Read the privacy policy</span>
              </a>
            </div>
          </div>
        </SurfaceCard>
        <HomePreview />
      </section>

      <section className="content-section">
        <div className="section-heading">
          <p className="page-eyebrow">Key benefits</p>
          <h2>Built for real travel pressure, not generic planning.</h2>
        </div>
        <div className="feature-grid">
          {homeHighlights.map((item) => (
            <SurfaceCard
              key={item.title}
              title={item.title}
              icon={<MaterialIcon name={item.icon} />}
            >
              <p>{item.body}</p>
            </SurfaceCard>
          ))}
        </div>
      </section>

      <section className="content-section">
        <div className="section-heading">
          <p className="page-eyebrow">Why Pineapple is different</p>
          <h2>Travel docs, trips, and SOS are treated like one product.</h2>
        </div>
        <div className="stack-grid">
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
        <div className="section-heading">
          <p className="page-eyebrow">Features</p>
          <h2>One place for travel docs, trips, and decision-making.</h2>
        </div>
        <div className="stack-grid">
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

      <section className="content-section two-up-grid">
        <SurfaceCard title="Works offline where it matters">
          <p>
            Pineapple is designed so your core travel records stay accessible on the device. That matters when you are
            boarding, crossing borders, or travelling without stable signal.
          </p>
        </SurfaceCard>
        <SurfaceCard title="Privacy-first and local-first messaging">
          <ul className="body-list">
            {privacySummaryBullets.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </SurfaceCard>
      </section>

      <section className="content-section">
        <SurfaceCard title="Ready for launch and store review">
          <p>
            Pineapple&apos;s public site includes plain-English legal pages, support details, and a structure that is
            ready for a future custom domain without rebuilding the project.
          </p>
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
        </SurfaceCard>
      </section>
    </SiteLayout>
  );
}
