import { AppScreenshotShell, ShotMaterialIcon } from '../components/AppScreenshotShell';

export function ScreenshotTripPage() {
  return (
    <AppScreenshotShell screenKey="trip">
      <div className="app-shot app-trip-shot">
        <div className="shot-safe">
          <section className="trip-hero-shot trip-visual-bali">
            <div className="trip-card-overlay trip-card-overlay-strong" />
            <div className="trip-hero-copy">
              <div className="trip-hero-destination">BALI</div>
              <h1>Bali reset</h1>
              <p>12 Apr — 20 Apr</p>
            </div>
          </section>

          <div className="white-card trip-chip-card">
            <div className="trip-chip-row">
              <span className="vault-tag vault-tag-blue">22 day(s) until departure</span>
              <span className="vault-tag vault-tag-warm">30 day(s) left</span>
            </div>
            <div className="trip-participants">
              <div className="participant-dot participant-gold">A</div>
              <div className="participant-dot participant-blue">S</div>
              <div className="participant-dot participant-coral">J</div>
              <span>3 participant(s) in this shared trip space</span>
            </div>
            <p>
              Keep the airport transfer, hotel booking, travel segment notes, and emergency details together for the
              whole journey.
            </p>
          </div>

          <section className="app-section">
            <div className="white-card trip-overview-card">
              <div className="overview-metric">
                <strong>3</strong>
                <span>Travellers</span>
              </div>
              <div className="overview-metric">
                <strong>5</strong>
                <span>Documents</span>
              </div>
              <div className="overview-metric">
                <strong>12</strong>
                <span>Packing</span>
              </div>
              <div className="overview-metric">
                <strong>6</strong>
                <span>Timeline</span>
              </div>
            </div>
          </section>

          <section className="app-section">
            <div className="white-card trip-module-card trip-module-card-active">
              <div className="trip-module-header">
                <div>
                  <h2>Flight and train info</h2>
                  <p>Add outbound, return, or rail travel with provider branding and booking details.</p>
                </div>
                <button className="mini-button">Add</button>
              </div>

              <div className="trip-transport-row">
                <div className="travel-vault-badge">
                  <ShotMaterialIcon name="flight" />
                </div>
                <div className="trip-module-copy">
                  <div className="trip-module-topline">
                    <strong>Flight · outbound</strong>
                    <span className="vault-tag vault-tag-blue">Flight</span>
                  </div>
                  <span>British Airways BA267</span>
                  <span>LHR → DPS</span>
                  <small>12 Apr, 08:45</small>
                </div>
              </div>

              <div className="trip-transport-row">
                <div className="travel-vault-badge">
                  <ShotMaterialIcon name="flight_land" />
                </div>
                <div className="trip-module-copy">
                  <div className="trip-module-topline">
                    <strong>Flight · return</strong>
                    <span className="vault-tag vault-tag-blue">Flight</span>
                  </div>
                  <span>British Airways BA268</span>
                  <span>DPS → LHR</span>
                  <small>20 Apr, 23:10</small>
                </div>
              </div>
            </div>
          </section>

          <section className="app-section">
            <div className="white-card trip-module-card">
              <div className="trip-module-header">
                <div>
                  <h2>Hotel info</h2>
                  <p>Search or enter the stay address, then keep the details and image together.</p>
                </div>
                <button className="mini-button">Add</button>
              </div>

              <div className="hotel-row-shot">
                <div className="hotel-thumb-shot" />
                <div className="trip-module-copy">
                  <strong>The Uluwatu Bay Resort</strong>
                  <span>Jalan Pantai Balangan, Pecatu, Bali</span>
                  <small>12 Apr to 20 Apr</small>
                </div>
              </div>
            </div>
          </section>
        </div>

        <footer className="trip-footer-shot">
          <a className="trip-footer-item" href="#">
            <ShotMaterialIcon name="checkroom" />
            <span>Packing</span>
          </a>
          <a className="trip-footer-item" href="#">
            <ShotMaterialIcon name="explore" />
            <span>Vibes</span>
          </a>
          <a className="trip-footer-item trip-footer-item-active" href="#">
            <ShotMaterialIcon name="flight" />
            <span>Flight</span>
          </a>
          <a className="trip-footer-item" href="#">
            <ShotMaterialIcon name="hotel" />
            <span>Hotel</span>
          </a>
        </footer>
      </div>
    </AppScreenshotShell>
  );
}
