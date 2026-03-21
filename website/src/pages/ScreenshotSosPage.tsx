import { AppScreenshotShell, ShotMaterialIcon } from '../components/AppScreenshotShell';

const emergencyRows = [
  {
    icon: 'account_balance',
    title: 'Embassy / consulate note',
    description: 'British Embassy Denpasar · Jalan Tantular No. 32 · save appointment notes and local guidance.',
  },
  {
    icon: 'local_police',
    title: 'Local emergency note',
    description: '112 national emergency number · add district-specific police and ambulance notes for offline access.',
  },
  {
    icon: 'medication',
    title: 'Traveller medical notes',
    description: 'Travellers carry antihistamines and a GP note. Keep prescriptions packed in cabin bags.',
  },
] as const;

export function ScreenshotSosPage() {
  return (
    <AppScreenshotShell screenKey="sos">
      <div className="app-shot app-sos-shot">
        <div className="shot-safe">
          <header className="app-header-card">
            <div className="app-header-brand">
              <div className="app-header-badge app-header-badge-red">!</div>
              <div className="app-header-copy">
                <h1>SOS</h1>
                <p>Emergency travel support</p>
              </div>
            </div>
            <button className="app-header-action" aria-label="Open travel mode">
              <ShotMaterialIcon name="travel_explore" />
            </button>
          </header>

          <section className="sos-hero-shot">
            <div className="sos-hero-copy">
              <h2>Emergency help nearby</h2>
              <p>
                Keep embassy notes, emergency contacts, travel insurance numbers, and key trip details ready when
                travel gets stressful.
              </p>
            </div>
            <div className="sos-location-pill">
              <ShotMaterialIcon name="location_on" />
              <span>Bali, Indonesia</span>
            </div>
            <div className="sos-hero-actions">
              <button className="app-button app-button-secondary">Open Travel Mode</button>
              <button className="app-button app-button-danger">Emergency call</button>
            </div>
          </section>

          <section className="app-section">
            <div className="app-section-header">
              <h2>Embassy &amp; support notes</h2>
              <span>Trip data</span>
            </div>
            <div className="white-card">
              {emergencyRows.map((row) => (
                <div key={row.title} className="sos-row">
                  <div className="sos-row-icon">
                    <ShotMaterialIcon name={row.icon} />
                  </div>
                  <div className="sos-row-copy">
                    <strong>{row.title}</strong>
                    <span>{row.description}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="app-section">
            <div className="app-section-header">
              <h2>Nearest services</h2>
              <span>Local-first</span>
            </div>
            <div className="white-card">
              <div className="sos-row">
                <div className="sos-row-icon sos-row-icon-blue">
                  <ShotMaterialIcon name="local_hospital" />
                </div>
                <div className="sos-row-copy">
                  <strong>Hospital and pharmacy</strong>
                  <span>Save local hospital, clinic, and pharmacy details in your trip emergency note.</span>
                </div>
              </div>
              <div className="sos-row">
                <div className="sos-row-icon sos-row-icon-blue">
                  <ShotMaterialIcon name="local_police" />
                </div>
                <div className="sos-row-copy">
                  <strong>Police and local services</strong>
                  <span>Pineapple keeps your local emergency note and support numbers available even without signal.</span>
                </div>
              </div>
            </div>
          </section>

          <section className="app-section">
            <div className="app-section-header">
              <h2>Trip emergency data</h2>
            </div>
            <div className="white-card emergency-data-card">
              <div className="emergency-data-row">
                <strong>Insurance documents</strong>
                <span>Ready</span>
              </div>
              <p>+44 20 7946 0341</p>
              <div className="emergency-data-row">
                <strong>Emergency contacts</strong>
                <span>Saved</span>
              </div>
              <p>Mum · +44 7xxx xxx xxx · Hotel reception · +62 361 123 456</p>
              <div className="emergency-data-actions">
                <button className="app-button app-button-outline">Open trip emergency</button>
                <button className="app-button app-button-secondary">Open vault</button>
              </div>
            </div>
          </section>
        </div>

        <footer className="app-footer">
          <a className="app-footer-item" href="#">
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
          <a className="app-footer-item app-footer-item-active" href="#">
            <ShotMaterialIcon name="sos" />
            <span>SOS</span>
          </a>
        </footer>
      </div>
    </AppScreenshotShell>
  );
}
