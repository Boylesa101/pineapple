import { AnimatePresence, motion } from 'framer-motion'
import type { LabPage } from '../../data/pages'
import {
  mockAlerts,
  mockDocuments,
  mockSupportTopics,
  mockTransfer,
  mockTravellers,
  mockTrips,
} from '../../data/mockData'
import styles from './ScreenRenderer.module.css'

type Props = {
  page: LabPage
  onNavigate: (slug: string) => void
}

type Action = {
  label: string
  targetSlug: string
  icon?: string
}

const navItems = [
  { label: 'Home', icon: 'home', targetSlug: 'home-dashboard' },
  { label: 'Vault', icon: 'folder_managed', targetSlug: 'vault-documents-home' },
  { label: 'Trips', icon: 'luggage', targetSlug: 'trip-list-page' },
  { label: 'Account', icon: 'person', targetSlug: 'account-page' },
  { label: 'SOS', icon: 'sos', targetSlug: 'sos-page' },
] as const

const qrPattern = [
  1, 1, 1, 0, 1, 1, 1,
  1, 0, 1, 0, 1, 0, 1,
  1, 1, 1, 0, 1, 1, 1,
  0, 0, 1, 1, 1, 0, 0,
  1, 1, 0, 1, 0, 1, 1,
  1, 0, 1, 0, 1, 0, 1,
  1, 1, 1, 0, 1, 1, 1,
] as const

function icon(name: string) {
  return <span className="material-symbols-rounded">{name}</span>
}

function StatusBar() {
  return (
    <div className={styles.statusBar}>
      <span>9:41</span>
      <span>Private Design Lab</span>
      <span>100%</span>
    </div>
  )
}

function Header({
  title,
  onBack,
  actionIcon,
  onAction,
  alert,
}: {
  title: string
  onBack?: () => void
  actionIcon?: string
  onAction?: () => void
  alert?: boolean
}) {
  return (
    <div className={styles.header}>
      <div className={styles.headerBack}>
        {onBack ? (
          <button className={styles.iconButton} onClick={onBack}>
            {icon('arrow_back')}
          </button>
        ) : null}
        <div className={styles.headerTitle}>{title}</div>
      </div>
      {actionIcon && onAction ? (
        <div style={{ position: 'relative' }}>
          <button className={styles.iconButton} onClick={onAction}>
            {icon(actionIcon)}
          </button>
          {alert ? <span className={styles.alertDot} /> : null}
        </div>
      ) : null}
    </div>
  )
}

function BottomNav({
  activeSlug,
  onNavigate,
}: {
  activeSlug: string
  onNavigate: (slug: string) => void
}) {
  return (
    <div className={styles.bottomNav}>
      {navItems.map((item) => {
        const active = item.targetSlug === activeSlug
        return (
          <button
            key={item.label}
            className={`${styles.navItem} ${active ? styles.navItemActive : ''}`}
            onClick={() => onNavigate(item.targetSlug)}
          >
            {icon(item.icon)}
            <span>{item.label}</span>
          </button>
        )
      })}
    </div>
  )
}

function ActionList({
  actions,
  onNavigate,
}: {
  actions: Action[]
  onNavigate: (slug: string) => void
}) {
  return (
    <div className={styles.stack}>
      {actions.map((action) => (
        <button
          key={`${action.label}-${action.targetSlug}`}
          className={styles.listButton}
          onClick={() => onNavigate(action.targetSlug)}
        >
          <div className={styles.listMeta}>
            <strong>{action.label}</strong>
          </div>
          <div className={styles.listIcon} style={{ background: 'rgba(255,255,255,0.1)' }}>
            {icon(action.icon ?? 'arrow_forward')}
          </div>
        </button>
      ))}
    </div>
  )
}

function HomeDashboard({ onNavigate }: { onNavigate: (slug: string) => void }) {
  const trip = mockTrips[0]

  return (
    <>
      <StatusBar />
      <div className={styles.content}>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32 }}
          className={styles.header}
        >
          <div className={styles.brand}>
            <div className={styles.brandOrb} />
            <strong>Pineapple</strong>
          </div>
          <div style={{ position: 'relative' }}>
            <button className={styles.iconButton} onClick={() => onNavigate('alerts-centre')}>
              {icon('notifications')}
            </button>
            <span className={styles.alertDot} />
          </div>
        </motion.div>

        <motion.button
          className={styles.heroCard}
          onClick={() => onNavigate('trip-overview-page')}
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.08 }}
          style={{ border: 0, color: 'inherit', textAlign: 'left' }}
        >
          <div className={styles.heroEyebrow}>
            {icon('flight_takeoff')}
            Current trip
          </div>
          <h2 className={styles.heroTitle}>{trip.name}</h2>
          <div className={styles.heroSubtitle}>{trip.destination}</div>
          <div className={styles.heroMeta}>
            <div>{trip.travelWindow}</div>
            <div>{trip.countdown}</div>
          </div>
        </motion.button>

        <motion.div
          className={styles.gridTwo}
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.06, delayChildren: 0.16 } },
          }}
        >
          <motion.button
            className={styles.sectionCard}
            style={{ border: 0, color: 'inherit', textAlign: 'left' }}
            variants={{ hidden: { opacity: 0, y: 14 }, visible: { opacity: 1, y: 0 } }}
            onClick={() => onNavigate('weather-detail-page')}
          >
            <div className={styles.cardTitle}>Weather Snapshot</div>
            <div className={styles.cardMetric}>{trip.weather.temperature}</div>
            <div>{trip.weather.city}</div>
            <div className={styles.subtleText}>
              {trip.weather.condition} · {trip.weather.highLow}
            </div>
          </motion.button>
          <motion.button
            className={styles.sectionCard}
            style={{ border: 0, color: 'inherit', textAlign: 'left' }}
            variants={{ hidden: { opacity: 0, y: 14 }, visible: { opacity: 1, y: 0 } }}
            onClick={() => onNavigate('quick-facts-page')}
          >
            <div className={styles.cardTitle}>Quick Facts</div>
            <div className={styles.factsGrid}>
              {trip.quickFacts.map((fact) => (
                <div key={fact.label} className={styles.factItem}>
                  <span className={styles.factLabel}>{fact.label}</span>
                  <strong>{fact.value}</strong>
                </div>
              ))}
            </div>
          </motion.button>
        </motion.div>

        <motion.button
          className={styles.sectionCard}
          style={{ border: 0, color: 'inherit', textAlign: 'left' }}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.36, delay: 0.22 }}
          onClick={() => onNavigate('set-off-time-page')}
        >
          <div className={styles.cardTitle}>Travel Set-Off Time</div>
          <div className={styles.cardMetric} style={{ fontSize: '1.45rem' }}>
            Leave for airport at 14:10
          </div>
          <div className={styles.subtleText}>Recommended departure in 3h 25m with Heathrow buffer included.</div>
        </motion.button>

        <motion.div
          className={styles.stack}
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.05, delayChildren: 0.28 } },
          }}
        >
          {trip.timeline.map((item) => (
            <motion.button
              key={item.label}
              className={styles.listButton}
              variants={{ hidden: { opacity: 0, y: 14 }, visible: { opacity: 1, y: 0 } }}
              onClick={() => onNavigate(item.targetSlug)}
            >
              <div className={styles.listMeta}>
                <strong>{item.label}</strong>
                <span className={styles.listDetail}>{item.detail}</span>
              </div>
              <div className={styles.listIcon} style={{ background: item.accent }}>
                <span className="material-symbols-rounded" style={{ color: '#092945' }}>
                  {item.icon}
                </span>
              </div>
            </motion.button>
          ))}
        </motion.div>
      </div>
      <BottomNav activeSlug="home-dashboard" onNavigate={onNavigate} />
    </>
  )
}

function GenericHub({
  title,
  subtitle,
  actions,
  onNavigate,
  activeNav,
}: {
  title: string
  subtitle: string
  actions: Action[]
  onNavigate: (slug: string) => void
  activeNav?: string
}) {
  return (
    <>
      <StatusBar />
      <div className={styles.content}>
        <Header title={title} actionIcon="tune" onAction={() => onNavigate('settings-home')} />
        <section className={styles.card}>
          <div className={styles.cardTitle}>{subtitle}</div>
          <p className={styles.subtleText} style={{ marginBottom: 0 }}>
            Premium mock screen for design review with believable content density and tap targets.
          </p>
        </section>
        <ActionList actions={actions} onNavigate={onNavigate} />
      </div>
      {activeNav ? <BottomNav activeSlug={activeNav} onNavigate={onNavigate} /> : null}
    </>
  )
}

function TicketQr() {
  return (
    <div className={styles.qr}>
      {qrPattern.map((cell, index) => (
        <div key={index} className={cell ? styles.qrCellDark : styles.qrCellLight} />
      ))}
    </div>
  )
}

export function ScreenRenderer({ page, onNavigate }: Props) {
  const actions: Record<string, Action[]> = {
    default: [
      { label: 'Open related detail', targetSlug: 'trip-overview-page', icon: 'arrow_forward' },
      { label: 'Open secure document flow', targetSlug: 'vault-documents-home', icon: 'shield_lock' },
    ],
    trip: [
      { label: 'Travel Timeline', targetSlug: 'travel-timeline-transport-stack', icon: 'timeline' },
      { label: 'Accommodation', targetSlug: 'accommodation-detail-page', icon: 'hotel' },
      { label: 'Packing List', targetSlug: 'packing-list-page', icon: 'checklist' },
    ],
  }

  const renderContent = () => {
    switch (page.template) {
      case 'launch':
        return (
          <div className={styles.centerBlock}>
            <div className={styles.launchCard}>
              <div className={styles.loadingOrb} />
              <h2>Pineapple</h2>
              <p className={styles.subtleText}>Launch moment for the premium travel companion.</p>
            </div>
          </div>
        )
      case 'welcome':
        return (
          <>
            <StatusBar />
            <div className={styles.content}>
              <section className={styles.heroCard} style={{ minHeight: 220 }}>
                <div className={styles.heroEyebrow}>Welcome back</div>
                <h2 className={styles.heroTitle}>Travel calmer, keep everything close.</h2>
                <p className={styles.heroSubtitle}>A warm entry point for login, review, or first-run continuation.</p>
              </section>
              <div className={styles.sectionCard}>
                <strong>Preview paths</strong>
                <div className={styles.buttonRow}>
                  <button className={styles.primaryButton} onClick={() => onNavigate('pin-setup-screen')}>
                    New user flow
                  </button>
                  <button className={styles.secondaryButton} onClick={() => onNavigate('home-dashboard')}>
                    Returning traveller
                  </button>
                </div>
              </div>
            </div>
          </>
        )
      case 'pin':
        return (
          <>
            <StatusBar />
            <div className={styles.content}>
              <Header title={page.name} onBack={() => onNavigate('welcome-login-screen')} />
              <section className={styles.card}>
                <div className={styles.cardTitle}>Set your local PIN</div>
                <p className={styles.subtleText}>Simple keypad-focused setup with a secure but calm tone.</p>
              </section>
              <div className={styles.pillRow}>
                {[...'1234567890'].map((digit) => (
                  <div key={digit} className={styles.pill}>
                    {digit}
                  </div>
                ))}
              </div>
              <button className={styles.primaryButton} onClick={() => onNavigate('local-data-promise-privacy-intro')}>
                Continue
              </button>
            </div>
          </>
        )
      case 'privacy':
        return (
          <GenericHub
            title="Your data stays local"
            subtitle="Privacy intro"
            actions={[
              { label: 'Continue to profile setup', targetSlug: 'profile-setup-screen', icon: 'person' },
              { label: 'Open privacy settings preview', targetSlug: 'privacy-local-storage-page', icon: 'privacy_tip' },
            ]}
            onNavigate={onNavigate}
          />
        )
      case 'profile':
        return (
          <GenericHub
            title="Profile setup"
            subtitle="Collect name, language tone, and display identity."
            actions={[
              { label: 'Add travellers next', targetSlug: 'add-travellers-screen', icon: 'group_add' },
              { label: 'Preview account page', targetSlug: 'account-page', icon: 'manage_accounts' },
            ]}
            onNavigate={onNavigate}
          />
        )
      case 'travellers':
        return (
          <GenericHub
            title="Travellers"
            subtitle={`${mockTravellers.length} companions shown with role and passport hinting.`}
            actions={[
              { label: 'First trip prompt', targetSlug: 'first-trip-prompt-screen', icon: 'luggage' },
              { label: 'Traveller list page', targetSlug: 'traveller-list-page', icon: 'groups' },
            ]}
            onNavigate={onNavigate}
          />
        )
      case 'trip-builder':
        return (
          <GenericHub
            title={page.name}
            subtitle="Multi-step trip creation with travel, stay, and document setup."
            actions={[
              { label: 'Open trip overview', targetSlug: 'trip-overview-page', icon: 'travel_explore' },
              { label: 'Jump to setup complete', targetSlug: 'setup-complete-enter-app', icon: 'task_alt' },
            ]}
            onNavigate={onNavigate}
          />
        )
      case 'permission':
        return (
          <GenericHub
            title={page.name}
            subtitle="Permission rationale with plain-English trust cues."
            actions={[
              { label: 'Continue setup', targetSlug: page.slug === 'notification-permission-screen' ? 'location-permission-screen' : 'setup-complete-enter-app', icon: 'arrow_forward' },
              { label: 'Open permissions settings', targetSlug: 'permissions-page', icon: 'settings' },
            ]}
            onNavigate={onNavigate}
          />
        )
      case 'completion':
        return (
          <>
            <StatusBar />
            <div className={styles.centerBlock}>
              <div className={styles.launchCard}>
                <div className={styles.loadingOrb} />
                <h2>Setup complete</h2>
                <p className={styles.subtleText}>A celebratory, low-noise hand-off into the main experience.</p>
                <div className={styles.buttonRow} style={{ justifyContent: 'center', marginTop: 18 }}>
                  <button className={styles.primaryButton} onClick={() => onNavigate('home-dashboard')}>
                    Enter app
                  </button>
                </div>
              </div>
            </div>
          </>
        )
      case 'home':
        return <HomeDashboard onNavigate={onNavigate} />
      case 'trip-list':
        return (
          <>
            <StatusBar />
            <div className={styles.content}>
              <Header title="Trips" actionIcon="add" onAction={() => onNavigate('create-trip-basic-info')} />
              <div className={styles.stack}>
                {mockTrips.map((trip) => (
                  <button key={trip.id} className={styles.listButton} onClick={() => onNavigate('trip-overview-page')}>
                    <div className={styles.listMeta}>
                      <strong>{trip.name}</strong>
                      <span className={styles.listDetail}>
                        {trip.destination} · {trip.travelWindow}
                      </span>
                    </div>
                    <div className={styles.listIcon} style={{ background: 'rgba(132, 215, 255, 0.22)' }}>
                      {icon('arrow_outward')}
                    </div>
                  </button>
                ))}
              </div>
            </div>
            <BottomNav activeSlug="trip-list-page" onNavigate={onNavigate} />
          </>
        )
      case 'trip-overview':
        return (
          <>
            <StatusBar />
            <div className={styles.content}>
              <Header title="Rome Escape" onBack={() => onNavigate('home-dashboard')} actionIcon="share" onAction={() => onNavigate('trip-transfer-page')} />
              <section className={styles.card}>
                <div className={styles.cardTitle}>Trip overview</div>
                <p className={styles.subtleText}>Your central trip hub for timeline, stay, documents, and traveller status.</p>
              </section>
              <ActionList actions={actions.trip} onNavigate={onNavigate} />
            </div>
            <BottomNav activeSlug="trip-list-page" onNavigate={onNavigate} />
          </>
        )
      case 'vault':
        return (
          <>
            <StatusBar />
            <div className={styles.content}>
              <Header title="Vault" actionIcon="add" onAction={() => onNavigate('add-document-page')} />
              <div className={styles.pillRow}>
                {['Passport', 'Bookings', 'Loyalty', 'Rail QR'].map((item) => (
                  <div key={item} className={styles.pill}>{item}</div>
                ))}
              </div>
              <div className={styles.stack}>
                {mockDocuments.map((document) => (
                  <button key={document.id} className={styles.listButton} onClick={() => onNavigate(document.targetSlug)}>
                    <div className={styles.listMeta}>
                      <strong>{document.title}</strong>
                      <span className={styles.listDetail}>{document.type} · {document.status}</span>
                    </div>
                    <div className={styles.listIcon} style={{ background: 'rgba(255,255,255,0.1)' }}>
                      {icon('description')}
                    </div>
                  </button>
                ))}
              </div>
            </div>
            <BottomNav activeSlug="vault-documents-home" onNavigate={onNavigate} />
          </>
        )
      case 'account':
        return (
          <GenericHub
            title="Account"
            subtitle="Profile, travellers, support, and secure review controls."
            actions={[
              { label: 'My profile', targetSlug: 'my-profile-page', icon: 'person' },
              { label: 'Traveller list', targetSlug: 'traveller-list-page', icon: 'group' },
              { label: 'Settings home', targetSlug: 'settings-home', icon: 'settings' },
            ]}
            onNavigate={onNavigate}
            activeNav="account-page"
          />
        )
      case 'sos':
        return (
          <GenericHub
            title="SOS"
            subtitle="Emergency support and local assistance tools."
            actions={[
              { label: 'Embassy contact mock', targetSlug: 'help-support-page', icon: 'support_agent' },
              { label: 'Alert centre', targetSlug: 'alerts-centre', icon: 'warning' },
            ]}
            onNavigate={onNavigate}
            activeNav="sos-page"
          />
        )
      case 'timeline':
        return (
          <GenericHub
            title="Travel Timeline"
            subtitle="Chronological stack of transport, accommodation, and checklist states."
            actions={mockTrips[0].timeline.map((item) => ({ label: item.label, targetSlug: item.targetSlug, icon: item.icon }))}
            onNavigate={onNavigate}
          />
        )
      case 'transport-detail':
        return (
          <GenericHub
            title="Transport Detail"
            subtitle="Flights, rail, hire car, bus, underground, and metro styling in one reusable shell."
            actions={[
              { label: 'Travel ticket viewer', targetSlug: 'travel-ticket-booking-viewer', icon: 'confirmation_number' },
              { label: 'Set-off timing', targetSlug: 'set-off-time-page', icon: 'departure_board' },
            ]}
            onNavigate={onNavigate}
          />
        )
      case 'accommodation':
        return (
          <GenericHub
            title="Accommodation"
            subtitle="Reservation status, check-in timing, maps, and room details."
            actions={[
              { label: 'Open destination info', targetSlug: 'place-destination-info-page', icon: 'location_on' },
              { label: 'Back to timeline', targetSlug: 'travel-timeline-transport-stack', icon: 'timeline' },
            ]}
            onNavigate={onNavigate}
          />
        )
      case 'destination':
        return (
          <GenericHub
            title="Destination Info"
            subtitle="Weather, local notes, quick facts, and nearby saved places."
            actions={[
              { label: 'Quick facts', targetSlug: 'quick-facts-page', icon: 'bolt' },
              { label: 'Weather detail', targetSlug: 'weather-detail-page', icon: 'sunny' },
            ]}
            onNavigate={onNavigate}
          />
        )
      case 'weather':
        return (
          <GenericHub
            title="Weather"
            subtitle="Detailed forecast, conditions, and packing prompts for the Rome trip."
            actions={[
              { label: 'Packing list', targetSlug: 'packing-list-page', icon: 'checkroom' },
              { label: 'Quick facts', targetSlug: 'quick-facts-page', icon: 'travel_explore' },
            ]}
            onNavigate={onNavigate}
          />
        )
      case 'setoff':
        return (
          <GenericHub
            title="Set-Off Time"
            subtitle="Departure planning with airport buffer, taxi pickup, and backup timing."
            actions={[
              { label: 'Transport detail', targetSlug: 'transport-detail-page', icon: 'flight_takeoff' },
              { label: 'Timeline', targetSlug: 'travel-timeline-transport-stack', icon: 'schedule' },
            ]}
            onNavigate={onNavigate}
          />
        )
      case 'itinerary':
        return (
          <GenericHub
            title="Itinerary"
            subtitle="Daily plan cards with bookings, times, and saved moments."
            actions={[
              { label: 'Notes', targetSlug: 'notes-page', icon: 'edit_note' },
              { label: 'Destination info', targetSlug: 'place-destination-info-page', icon: 'map' },
            ]}
            onNavigate={onNavigate}
          />
        )
      case 'packing':
        return (
          <GenericHub
            title="Packing"
            subtitle="Smart list with travel essentials, weather prompts, and completion state."
            actions={[
              { label: 'Weather detail', targetSlug: 'weather-detail-page', icon: 'partly_cloudy_day' },
              { label: 'Alerts centre', targetSlug: 'alerts-centre', icon: 'notification_important' },
            ]}
            onNavigate={onNavigate}
          />
        )
      case 'notes':
        return (
          <GenericHub
            title="Notes"
            subtitle="Saved snippets, contacts, addresses, and travel reminders."
            actions={[
              { label: 'Trip overview', targetSlug: 'trip-overview-page', icon: 'travel' },
              { label: 'Destination info', targetSlug: 'place-destination-info-page', icon: 'pin_drop' },
            ]}
            onNavigate={onNavigate}
          />
        )
      case 'quick-facts':
        return (
          <GenericHub
            title="Quick Facts"
            subtitle="Country essentials and travel-ready facts at a glance."
            actions={[
              { label: 'Weather detail', targetSlug: 'weather-detail-page', icon: 'wb_sunny' },
              { label: 'Alerts centre', targetSlug: 'alerts-centre', icon: 'campaign' },
            ]}
            onNavigate={onNavigate}
          />
        )
      case 'documents':
        return (
          <GenericHub
            title={page.name}
            subtitle="Document collection browsing with categories, vault actions, and add flow."
            actions={[
              { label: 'Passport viewer', targetSlug: 'passport-viewer', icon: 'badge' },
              { label: 'Add document', targetSlug: 'add-document-page', icon: 'add_card' },
            ]}
            onNavigate={onNavigate}
          />
        )
      case 'passport':
        return (
          <>
            <StatusBar />
            <div className={styles.content}>
              <Header title="Passport" onBack={() => onNavigate('vault-documents-home')} />
              <section className={`${styles.passportCard} ${styles.sectionCard}`}>
                <div className={styles.heroEyebrow}>Identity document</div>
                <div className={styles.cardMetric}>Andrew Boyle</div>
                <div className={styles.subtleText}>GBR · Expires 24 Aug 2032</div>
                <div className={styles.buttonRow}>
                  <button className={styles.secondaryButton} onClick={() => onNavigate('document-expiry-status-page')}>
                    Readiness status
                  </button>
                </div>
              </section>
            </div>
          </>
        )
      case 'licence':
        return (
          <GenericHub
            title="Driving Licence"
            subtitle="Licence categories, status, and local identity styling."
            actions={[
              { label: 'General document viewer', targetSlug: 'general-document-viewer', icon: 'description' },
              { label: 'Account page', targetSlug: 'account-page', icon: 'person' },
            ]}
            onNavigate={onNavigate}
          />
        )
      case 'ticket':
        return (
          <>
            <StatusBar />
            <div className={styles.content}>
              <Header title="Travel Ticket" onBack={() => onNavigate('vault-documents-home')} />
              <section className={`${styles.ticketCard} ${styles.sectionCard}`}>
                <div className={styles.heroEyebrow}>Locally generated travel record</div>
                <div className={styles.cardMetric}>BA 554 · 18:20</div>
                <div className={styles.subtleText}>Heathrow T5 to Rome Fiumicino</div>
                <TicketQr />
                <div className={styles.subtleText}>Design note: QR is a local mock record, not an official issued rail or airline ticket.</div>
              </section>
            </div>
          </>
        )
      case 'document':
        return (
          <GenericHub
            title="Document Viewer"
            subtitle="Reusable image and PDF treatment with clean document actions."
            actions={[
              { label: 'Passport viewer', targetSlug: 'passport-viewer', icon: 'badge' },
              { label: 'Ticket viewer', targetSlug: 'travel-ticket-booking-viewer', icon: 'qr_code' },
            ]}
            onNavigate={onNavigate}
          />
        )
      case 'expiry':
        return (
          <GenericHub
            title="Document Status"
            subtitle="Expiry board, warning thresholds, and ready-state chips."
            actions={[
              { label: 'Alerts centre', targetSlug: 'alerts-centre', icon: 'warning' },
              { label: 'Passport viewer', targetSlug: 'passport-viewer', icon: 'badge' },
            ]}
            onNavigate={onNavigate}
          />
        )
      case 'alerts':
        return (
          <>
            <StatusBar />
            <div className={styles.content}>
              <Header title="Alerts" actionIcon="settings" onAction={() => onNavigate('notification-settings-page')} />
              <div className={styles.stack}>
                {mockAlerts.map((alert) => (
                  <button key={alert.id} className={styles.listButton} onClick={() => onNavigate(alert.targetSlug)}>
                    <div className={styles.listMeta}>
                      <strong>{alert.title}</strong>
                      <span className={styles.listDetail}>{alert.severity}</span>
                    </div>
                    <div className={styles.listIcon} style={{ background: 'rgba(255, 196, 83, 0.24)' }}>
                      {icon('notification_important')}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </>
        )
      case 'alert-detail':
        return (
          <GenericHub
            title="Alert Detail"
            subtitle="Focused warning or check prompt with a clear next action."
            actions={[
              { label: 'Back to alerts', targetSlug: 'alerts-centre', icon: 'notifications' },
              { label: 'Open trip overview', targetSlug: 'trip-overview-page', icon: 'travel' },
            ]}
            onNavigate={onNavigate}
          />
        )
      case 'notification-settings':
        return (
          <GenericHub
            title="Notification Settings"
            subtitle="Reminder lead times, quiet hours, and channel tuning."
            actions={[
              { label: 'Permissions', targetSlug: 'permissions-page', icon: 'notifications_active' },
              { label: 'Alerts centre', targetSlug: 'alerts-centre', icon: 'warning' },
            ]}
            onNavigate={onNavigate}
          />
        )
      case 'profile-detail':
        return (
          <GenericHub
            title={page.name}
            subtitle="Profile styling with editable traveller identity and travel context."
            actions={[
              { label: 'Traveller list', targetSlug: 'traveller-list-page', icon: 'group' },
              { label: 'Account page', targetSlug: 'account-page', icon: 'person' },
            ]}
            onNavigate={onNavigate}
          />
        )
      case 'traveller-list':
        return (
          <>
            <StatusBar />
            <div className={styles.content}>
              <Header title="Travellers" actionIcon="person_add" onAction={() => onNavigate('add-traveller-page')} />
              <div className={styles.stack}>
                {mockTravellers.map((traveller) => (
                  <button key={traveller.id} className={styles.listButton} onClick={() => onNavigate('traveller-detail-page')}>
                    <div className={styles.listMeta}>
                      <strong>{traveller.name}</strong>
                      <span className={styles.listDetail}>{traveller.role} · {traveller.passport}</span>
                    </div>
                    <div className={styles.listIcon} style={{ background: 'rgba(156, 240, 208, 0.22)' }}>
                      {icon('person')}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </>
        )
      case 'traveller-detail':
        return (
          <GenericHub
            title={page.name}
            subtitle="Traveller detail and edit surfaces with clear identity cues."
            actions={[
              { label: 'Traveller list', targetSlug: 'traveller-list-page', icon: 'group' },
              { label: 'Trip overview', targetSlug: 'trip-overview-page', icon: 'flight' },
            ]}
            onNavigate={onNavigate}
          />
        )
      case 'transfer':
        return (
          <GenericHub
            title="Trip Transfer"
            subtitle={`${mockTransfer.mode}. ${mockTransfer.status}`}
            actions={[
              { label: 'Show QR export', targetSlug: 'qr-export-page', icon: 'qr_code_2' },
              { label: 'Open import scan', targetSlug: 'qr-import-scan-page', icon: 'qr_code_scanner' },
            ]}
            onNavigate={onNavigate}
          />
        )
      case 'qr-export':
        return (
          <>
            <StatusBar />
            <div className={styles.content}>
              <Header title="QR Export" onBack={() => onNavigate('trip-transfer-page')} />
              <section className={styles.sectionCard} style={{ alignItems: 'center', textAlign: 'center' }}>
                <TicketQr />
                <strong>Encrypted transfer envelope</strong>
                <div className={styles.subtleText}>Share the separate transfer code outside the QR channel.</div>
              </section>
            </div>
          </>
        )
      case 'qr-import':
        return (
          <GenericHub
            title="QR Import"
            subtitle="Scan the encrypted envelope, then enter the separate transfer code."
            actions={[
              { label: 'Back to transfer', targetSlug: 'trip-transfer-page', icon: 'arrow_back' },
              { label: 'Support note', targetSlug: 'help-support-page', icon: 'help' },
            ]}
            onNavigate={onNavigate}
          />
        )
      case 'settings':
        return (
          <GenericHub
            title="Settings"
            subtitle="Modern settings hub for privacy, security, language, and support."
            actions={[
              { label: 'Appearance', targetSlug: 'appearance-ui-settings-page', icon: 'palette' },
              { label: 'Security', targetSlug: 'security-page', icon: 'lock' },
              { label: 'About Pineapple', targetSlug: 'about-pineapple-page', icon: 'info' },
            ]}
            onNavigate={onNavigate}
          />
        )
      case 'privacy-settings':
        return (
          <GenericHub
            title="Privacy & Local Storage"
            subtitle="Explain what stays on-device and what this mock review environment is for."
            actions={[
              { label: 'Data & storage', targetSlug: 'data-storage-page', icon: 'database' },
              { label: 'Security', targetSlug: 'security-page', icon: 'shield_lock' },
            ]}
            onNavigate={onNavigate}
          />
        )
      case 'data-storage':
        return (
          <GenericHub
            title="Data & Storage"
            subtitle="Backups, encrypted transfer history, and storage footprint."
            actions={[
              { label: 'Trip transfer', targetSlug: 'trip-transfer-page', icon: 'encrypted' },
              { label: 'Privacy & local storage', targetSlug: 'privacy-local-storage-page', icon: 'hard_drive' },
            ]}
            onNavigate={onNavigate}
          />
        )
      case 'security':
        return (
          <GenericHub
            title="Security"
            subtitle="PIN, biometrics, and vault-boundary patterns for review."
            actions={[
              { label: 'Permissions', targetSlug: 'permissions-page', icon: 'verified_user' },
              { label: 'Privacy & local storage', targetSlug: 'privacy-local-storage-page', icon: 'privacy_tip' },
            ]}
            onNavigate={onNavigate}
          />
        )
      case 'permissions':
        return (
          <GenericHub
            title="Permissions"
            subtitle="Reminders and optional location use with clear boundaries."
            actions={[
              { label: 'Notification settings', targetSlug: 'notification-settings-page', icon: 'notifications' },
              { label: 'Settings home', targetSlug: 'settings-home', icon: 'settings' },
            ]}
            onNavigate={onNavigate}
          />
        )
      case 'appearance':
        return (
          <GenericHub
            title="Appearance"
            subtitle="Language selector, density, and future UI experiments."
            actions={[
              { label: 'Settings home', targetSlug: 'settings-home', icon: 'settings' },
              { label: 'About Pineapple', targetSlug: 'about-pineapple-page', icon: 'view_quilt' },
            ]}
            onNavigate={onNavigate}
          />
        )
      case 'about':
        return (
          <GenericHub
            title="About Pineapple"
            subtitle="Product snapshot, version info, and design-lab framing."
            actions={[
              { label: 'Help & support', targetSlug: 'help-support-page', icon: 'help' },
              { label: 'Settings home', targetSlug: 'settings-home', icon: 'settings' },
            ]}
            onNavigate={onNavigate}
          />
        )
      case 'support':
        return (
          <>
            <StatusBar />
            <div className={styles.content}>
              <Header title="Help & Support" onBack={() => onNavigate('settings-home')} />
              <section className={styles.card}>
                <div className={styles.cardTitle}>How this lab is used</div>
                <div className={styles.stack} style={{ marginTop: 10 }}>
                  {mockSupportTopics.map((topic) => (
                    <div key={topic} className={styles.factItem}>
                      {topic}
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </>
        )
      case 'empty':
        return (
          <>
            <StatusBar />
            <div className={styles.centerBlock}>
              <div className={styles.launchCard}>
                <h2>{page.name}</h2>
                <p className={styles.subtleText}>{page.shortDescription}</p>
                <button className={styles.primaryButton} onClick={() => onNavigate('home-dashboard')}>
                  Return home
                </button>
              </div>
            </div>
          </>
        )
      case 'error':
        return (
          <>
            <StatusBar />
            <div className={styles.centerBlock}>
              <div className={styles.launchCard}>
                <div className={styles.loadingOrb} style={{ background: 'linear-gradient(160deg, #ffd1d1, #ff6f7f 52%, #c73d58)' }} />
                <h2>{page.name}</h2>
                <p className={styles.subtleText}>Helpful recovery state with next-step guidance and support tone.</p>
                <div className={styles.buttonRow} style={{ justifyContent: 'center' }}>
                  <button className={styles.secondaryButton} onClick={() => onNavigate('help-support-page')}>
                    Get guidance
                  </button>
                </div>
              </div>
            </div>
          </>
        )
      case 'loading':
        return (
          <>
            <StatusBar />
            <div className={styles.centerBlock}>
              <div className={styles.launchCard}>
                <div className={styles.loadingOrb} />
                <h2>Processing securely</h2>
                <p className={styles.subtleText}>Use this overlay for import, decrypt, or scan handling moments.</p>
              </div>
            </div>
          </>
        )
      case 'modal':
        return (
          <>
            <StatusBar />
            <div className={styles.content}>
              <section className={styles.card}>
                <div className={styles.cardTitle}>Underlying page context</div>
                <p className={styles.subtleText}>Mock base content remains visible beneath the confirmation modal.</p>
              </section>
            </div>
            <div className={styles.modalWrap}>
              <div className={styles.modal}>
                <strong>{page.name}</strong>
                <p className={styles.subtleText}>{page.shortDescription}</p>
                <div className={styles.buttonRow}>
                  <button className={styles.ghostButton} onClick={() => onNavigate('home-dashboard')}>
                    Cancel
                  </button>
                  <button className={styles.primaryButton} onClick={() => onNavigate('success-confirmation-modal')}>
                    Confirm
                  </button>
                </div>
              </div>
            </div>
          </>
        )
      default:
        return (
          <GenericHub
            title={page.name}
            subtitle={page.shortDescription}
            actions={actions.default}
            onNavigate={onNavigate}
          />
        )
    }
  }

  return (
    <div className={styles.screen}>
      <AnimatePresence mode="wait">
        <motion.div
          key={page.slug}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.28, ease: 'easeOut' }}
          style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
        >
          {renderContent()}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
