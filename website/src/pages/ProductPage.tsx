import {
  featureGroups,
  homeHighlights,
  privacySummaryBullets,
  whyPineappleSections,
} from '../../../src/content/legal';
import { SurfaceCard } from '../components/ContentBlocks';
import { MaterialIcon, SiteLayout } from '../components/SiteLayout';

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

export function ProductPage() {
  return (
    <SiteLayout
      currentPath="/product"
      eyebrow="Product"
      title="A calmer travel flow for documents, trips, and SOS."
      lede="Pineapple is built around the parts of travel that become stressful: finding the right document, checking what happens next, and getting to emergency details quickly."
    >
      <section className="content-section">
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
          <div key={row.title} className={index % 2 === 0 ? 'showcase-row' : 'showcase-row showcase-row-reversed'}>
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
          <p className="page-eyebrow">Core features</p>
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
            Pineapple is designed so your core travel records stay accessible on the device. That matters when you are
            boarding, crossing borders, or travelling without stable signal.
          </p>
          <ul className="body-list body-list-light">
            {privacySummaryBullets.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </section>
    </SiteLayout>
  );
}
