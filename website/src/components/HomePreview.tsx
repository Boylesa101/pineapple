export function HomePreview() {
  return (
    <div className="preview-shell" aria-hidden="true">
      <div className="preview-card preview-card-primary">
        <div className="preview-badge-row">
          <span className="preview-pill">Current trip</span>
          <span className="preview-pill preview-pill-soft">4 days</span>
        </div>
        <h3>PALMA</h3>
        <p>Passport, hotel, transfer, and itinerary details ready to open.</p>
      </div>
      <div className="preview-stack">
        <div className="preview-card preview-card-secondary">
          <strong>Vault</strong>
          <span>Passport</span>
          <span>Health card</span>
          <span>Insurance</span>
        </div>
        <div className="preview-card preview-card-secondary">
          <strong>Reminders</strong>
          <span>Passport expires in 90 days</span>
          <span>Hotel check-in today</span>
        </div>
      </div>
    </div>
  );
}
