import { AppScreenshotShell, ShotMaterialIcon } from '../components/AppScreenshotShell';

const quickAccess = [
  { icon: 'flight_takeoff', label: 'Flight' },
  { icon: 'passport', label: 'Passport' },
  { icon: 'hotel', label: 'Hotel' },
] as const;

const flightItems = [
  { title: 'British Airways BA267', subtitle: 'LHR to LAX', meta: '12 Apr · Check-in opens tomorrow' },
  { title: 'Eurostar 9024', subtitle: 'Paris to London', meta: '16 Apr · Gare du Nord to St Pancras' },
] as const;

export function ScreenshotVaultPage() {
  return (
    <AppScreenshotShell screenKey="vault">
      <div className="app-shot app-vault-shot">
        <div className="shot-safe">
          <header className="app-header-card">
            <div className="app-header-brand">
              <div className="app-header-badge">V</div>
              <div className="app-header-copy">
                <h1>Vault</h1>
                <p>Travel documents</p>
              </div>
            </div>
            <button className="app-header-action" aria-label="Open trip">
              <ShotMaterialIcon name="travel_explore" />
            </button>
          </header>

          <div className="vault-summary-card">
            <p className="vault-summary-eyebrow">Privacy summary</p>
            <ul>
              <li>Your documents and trip data stay on this device.</li>
              <li>No account is required for basic use.</li>
              <li>Location is only used when you open SOS help nearby.</li>
              <li>Vault items stay readable even offline.</li>
            </ul>
          </div>

          <div className="vault-quick-row">
            {quickAccess.map((item) => (
              <div key={item.label} className="vault-quick-button">
                <ShotMaterialIcon name={item.icon} />
                <span>{item.label}</span>
              </div>
            ))}
          </div>

          <section className="app-section">
            <div className="vault-card passport-cover-shot">
              <div className="passport-top">
                <ShotMaterialIcon name="public" />
                <span>Passport</span>
              </div>
              <div className="passport-middle">
                <div className="passport-emblem">
                  <ShotMaterialIcon name="public" />
                </div>
                <strong>United Kingdom</strong>
              </div>
              <div className="passport-bottom">5482 1184</div>
            </div>

            <div className="vault-meta-strip">
              <span className="vault-tag">Verified</span>
              <span className="vault-tag vault-tag-warm">Expires in 7 months</span>
            </div>

            <div className="vault-card licence-cover-shot">
              <div className="licence-top">
                <div>
                  <span>United Kingdom</span>
                  <strong>Driving Licence</strong>
                </div>
                <ShotMaterialIcon name="directions_car" />
              </div>
              <div className="licence-body">
                <div className="licence-photo" />
                <div className="licence-copy">
                  <strong>Andrew Boyle</strong>
                  <span>BOYLE801122AB9YZ</span>
                  <small>Full licence · reverse saved</small>
                </div>
              </div>
            </div>

            <div className="vault-card health-cover-shot">
              <div className="health-top">
                <div>
                  <span>Health card</span>
                  <strong>GHIC / EHIC</strong>
                </div>
                <ShotMaterialIcon name="local_hospital" />
              </div>
              <div className="licence-body">
                <div className="health-photo" />
                <div className="licence-copy licence-copy-light">
                  <strong>Andrew Boyle</strong>
                  <span>QW76 991 334</span>
                  <small>Emergency health access · UK</small>
                </div>
              </div>
            </div>
          </section>

          <section className="app-section">
            <div className="vault-section-card">
              <h2>Flights</h2>
              {flightItems.map((item) => (
                <div key={item.title} className="travel-vault-item">
                  <div className="travel-vault-badge">
                    <ShotMaterialIcon name="flight" />
                  </div>
                  <div className="travel-vault-copy">
                    <strong>{item.title}</strong>
                    <span>{item.subtitle}</span>
                    <small>{item.meta}</small>
                  </div>
                </div>
              ))}
            </div>

            <div className="vault-section-card">
              <h2>Hotel</h2>
              <div className="travel-vault-item">
                <div className="travel-vault-badge">
                  <ShotMaterialIcon name="hotel" />
                </div>
                <div className="travel-vault-copy">
                  <strong>The Uluwatu Bay Resort</strong>
                  <span>Pecatu, Bali</span>
                  <small>12 Apr to 20 Apr</small>
                </div>
              </div>
            </div>
          </section>

          <button className="vault-fab" aria-label="Add document">
            <ShotMaterialIcon name="add" />
          </button>
        </div>

        <footer className="app-footer">
          <a className="app-footer-item" href="#">
            <ShotMaterialIcon name="home" />
            <span>Home</span>
          </a>
          <a className="app-footer-item app-footer-item-active" href="#">
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
