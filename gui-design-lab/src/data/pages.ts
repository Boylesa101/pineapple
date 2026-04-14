export type ScreenTemplate =
  | 'launch'
  | 'welcome'
  | 'pin'
  | 'privacy'
  | 'profile'
  | 'travellers'
  | 'trip-builder'
  | 'permission'
  | 'completion'
  | 'home'
  | 'trip-list'
  | 'trip-overview'
  | 'vault'
  | 'account'
  | 'sos'
  | 'timeline'
  | 'transport-detail'
  | 'accommodation'
  | 'destination'
  | 'weather'
  | 'setoff'
  | 'itinerary'
  | 'packing'
  | 'notes'
  | 'quick-facts'
  | 'documents'
  | 'passport'
  | 'licence'
  | 'ticket'
  | 'document'
  | 'expiry'
  | 'alerts'
  | 'alert-detail'
  | 'notification-settings'
  | 'profile-detail'
  | 'traveller-list'
  | 'traveller-detail'
  | 'transfer'
  | 'qr-export'
  | 'qr-import'
  | 'settings'
  | 'privacy-settings'
  | 'data-storage'
  | 'security'
  | 'permissions'
  | 'appearance'
  | 'about'
  | 'support'
  | 'empty'
  | 'error'
  | 'loading'
  | 'modal'

export type LabPage = {
  id: number
  slug: string
  name: string
  shortDescription: string
  category: 'New User Flow' | 'Core User / Main App' | 'Trip Pages' | 'Document / Vault Pages' | 'Alerts' | 'Account / People / Transfer' | 'Settings / System' | 'Utility States'
  recommendedOrder?: number
  template: ScreenTemplate
  mockNotes?: string
}

const pageDefinitions: LabPage[] = [
  { id: 1, slug: 'splash-launch-screen', name: 'Splash / Launch Screen', shortDescription: 'Branded app launch moment with calm loading state.', category: 'New User Flow', template: 'launch' },
  { id: 2, slug: 'welcome-login-screen', name: 'Welcome / Login Screen', shortDescription: 'First-touch welcome and returning-user entry point.', category: 'New User Flow', template: 'welcome' },
  { id: 3, slug: 'pin-setup-screen', name: 'PIN Setup Screen', shortDescription: 'Create a four-digit local PIN for secure access.', category: 'New User Flow', template: 'pin' },
  { id: 4, slug: 'confirm-pin-screen', name: 'Confirm PIN Screen', shortDescription: 'Confirm the new PIN before continuing into setup.', category: 'New User Flow', template: 'pin' },
  { id: 5, slug: 'local-data-promise-privacy-intro', name: 'Local Data Promise / Privacy Intro', shortDescription: 'Explain that data stays local and under traveller control.', category: 'New User Flow', template: 'privacy' },
  { id: 6, slug: 'profile-setup-screen', name: 'Profile Setup Screen', shortDescription: 'Collect the main traveller name and language tone.', category: 'New User Flow', template: 'profile' },
  { id: 7, slug: 'add-travellers-screen', name: 'Add Travellers Screen', shortDescription: 'Invite or add travel companions during first-run.', category: 'New User Flow', template: 'travellers' },
  { id: 8, slug: 'first-trip-prompt-screen', name: 'First Trip Prompt Screen', shortDescription: 'Warm first prompt to create the first journey.', category: 'New User Flow', template: 'trip-builder' },
  { id: 9, slug: 'create-trip-basic-info', name: 'Create Trip - Basic Info', shortDescription: 'Destination, dates, travellers, and trip intent.', category: 'New User Flow', template: 'trip-builder' },
  { id: 10, slug: 'create-trip-transport-details', name: 'Create Trip - Transport Details', shortDescription: 'Capture flights, rail, taxi, and set-off details.', category: 'New User Flow', template: 'trip-builder' },
  { id: 11, slug: 'create-trip-accommodation-details', name: 'Create Trip - Accommodation Details', shortDescription: 'Add stay details and check-in structure.', category: 'New User Flow', template: 'trip-builder' },
  { id: 12, slug: 'create-trip-documents-setup', name: 'Create Trip - Documents Setup', shortDescription: 'Prompt for documents and secure storage categories.', category: 'New User Flow', template: 'trip-builder' },
  { id: 13, slug: 'notification-permission-screen', name: 'Notification Permission Screen', shortDescription: 'Explain useful reminders and alert timing.', category: 'New User Flow', template: 'permission' },
  { id: 14, slug: 'location-permission-screen', name: 'Location Permission Screen', shortDescription: 'Optional location support for set-off guidance.', category: 'New User Flow', template: 'permission' },
  { id: 15, slug: 'setup-complete-enter-app', name: 'Setup Complete / Enter App', shortDescription: 'Celebrate completion and launch into the app.', category: 'New User Flow', template: 'completion' },
  { id: 16, slug: 'home-dashboard', name: 'Home Dashboard', shortDescription: 'Main app overview showing the current trip, weather, quick facts, set-off time, and stacked next items.', category: 'Core User / Main App', recommendedOrder: 1, template: 'home', mockNotes: 'Flagship v1.1 screen with the most complete polish and card-standard coverage.' },
  { id: 17, slug: 'trip-list-page', name: 'Trip List Page', shortDescription: 'Browse active, upcoming, and archived trips.', category: 'Core User / Main App', template: 'trip-list' },
  { id: 18, slug: 'trip-overview-page', name: 'Trip Overview Page', shortDescription: 'Simplified trip page with a master trip card, weather, quick info, and set-off timing.', category: 'Core User / Main App', recommendedOrder: 2, template: 'trip-overview' },
  { id: 19, slug: 'vault-documents-home', name: 'Vault / Documents Home', shortDescription: 'Secure document home with categories and trip-linked records.', category: 'Core User / Main App', recommendedOrder: 5, template: 'vault' },
  { id: 20, slug: 'account-page', name: 'Account Page', shortDescription: 'Profile, travellers, security, and review controls.', category: 'Core User / Main App', recommendedOrder: 8, template: 'account' },
  { id: 21, slug: 'sos-page', name: 'SOS Page', shortDescription: 'Emergency contacts and key assistance tools.', category: 'Core User / Main App', template: 'sos' },
  { id: 22, slug: 'trip-summary-card-view', name: 'Trip Summary Card View', shortDescription: 'Condensed trip card with key scan points.', category: 'Trip Pages', template: 'trip-overview' },
  { id: 23, slug: 'travel-timeline-transport-stack', name: 'Travel Timeline / Transport Stack', shortDescription: 'Chronological journey flow across transport and stay moments.', category: 'Trip Pages', recommendedOrder: 3, template: 'timeline' },
  { id: 24, slug: 'transport-detail-page', name: 'Transport Detail Page', shortDescription: 'Deep view for flight, rail, car, bus, and local transit segments.', category: 'Trip Pages', template: 'transport-detail' },
  { id: 25, slug: 'accommodation-detail-page', name: 'Accommodation Detail Page', shortDescription: 'Reservation overview, address, and arrival status.', category: 'Trip Pages', recommendedOrder: 4, template: 'accommodation' },
  { id: 26, slug: 'place-destination-info-page', name: 'Place / Destination Info Page', shortDescription: 'Destination guide snippets and local context.', category: 'Trip Pages', template: 'destination' },
  { id: 27, slug: 'weather-detail-page', name: 'Weather Detail Page', shortDescription: 'Travel weather outlook and packing prompts.', category: 'Trip Pages', template: 'weather' },
  { id: 28, slug: 'set-off-time-page', name: 'Set-Off Time Page', shortDescription: 'Leave-now timing with transport buffer guidance.', category: 'Trip Pages', template: 'setoff' },
  { id: 29, slug: 'itinerary-page', name: 'Itinerary Page', shortDescription: 'Daily plans, bookings, and moments worth keeping close.', category: 'Trip Pages', template: 'itinerary' },
  { id: 30, slug: 'packing-list-page', name: 'Packing List Page', shortDescription: 'Structured packing lists with completion tracking.', category: 'Trip Pages', template: 'packing' },
  { id: 31, slug: 'notes-page', name: 'Notes Page', shortDescription: 'Trip notes, reminders, and useful saved snippets.', category: 'Trip Pages', template: 'notes' },
  { id: 32, slug: 'quick-facts-page', name: 'Quick Facts Page', shortDescription: 'Timezone, plug, language, and local essentials.', category: 'Trip Pages', template: 'quick-facts' },
  { id: 33, slug: 'documents-by-trip-page', name: 'Documents by Trip Page', shortDescription: 'Trip-scoped vault view for relevant records.', category: 'Document / Vault Pages', template: 'documents' },
  { id: 34, slug: 'document-categories-page', name: 'Document Categories Page', shortDescription: 'Browse document collections by type and urgency.', category: 'Document / Vault Pages', template: 'documents' },
  { id: 35, slug: 'passport-viewer', name: 'Passport Viewer', shortDescription: 'Premium passport-style presentation for travel identity.', category: 'Document / Vault Pages', recommendedOrder: 6, template: 'passport' },
  { id: 36, slug: 'driving-licence-viewer', name: 'Driving Licence Viewer', shortDescription: 'Licence overview with expiry and category highlights.', category: 'Document / Vault Pages', template: 'licence' },
  { id: 37, slug: 'travel-ticket-booking-viewer', name: 'Travel Ticket / Booking Viewer', shortDescription: 'Ticket or booking card with local QR rendering.', category: 'Document / Vault Pages', template: 'ticket' },
  { id: 38, slug: 'general-document-viewer', name: 'General Document Viewer', shortDescription: 'Reusable document preview for uploads and scans.', category: 'Document / Vault Pages', template: 'document' },
  { id: 39, slug: 'add-document-page', name: 'Add Document Page', shortDescription: 'Flow to add travel docs, scans, or records.', category: 'Document / Vault Pages', template: 'documents' },
  { id: 40, slug: 'document-expiry-status-page', name: 'Document Expiry / Status Page', shortDescription: 'Status board for expiry windows and readiness.', category: 'Document / Vault Pages', template: 'expiry' },
  { id: 41, slug: 'alerts-centre', name: 'Alerts Centre', shortDescription: 'Central feed for reminders, warnings, and check prompts.', category: 'Alerts', recommendedOrder: 7, template: 'alerts' },
  { id: 42, slug: 'alert-detail-page', name: 'Alert Detail Page', shortDescription: 'Focused alert view with context and next action.', category: 'Alerts', template: 'alert-detail' },
  { id: 43, slug: 'notification-settings-page', name: 'Notification Settings Page', shortDescription: 'Tune alerts, lead times, and quiet windows.', category: 'Alerts', template: 'notification-settings' },
  { id: 44, slug: 'my-profile-page', name: 'My Profile Page', shortDescription: 'Personal profile summary and identity preferences.', category: 'Account / People / Transfer', template: 'profile-detail' },
  { id: 45, slug: 'edit-profile-page', name: 'Edit Profile Page', shortDescription: 'Editable profile details and display choices.', category: 'Account / People / Transfer', template: 'profile-detail' },
  { id: 46, slug: 'traveller-list-page', name: 'Traveller List Page', shortDescription: 'People travelling with you across upcoming trips.', category: 'Account / People / Transfer', template: 'traveller-list' },
  { id: 47, slug: 'traveller-detail-page', name: 'Traveller Detail Page', shortDescription: 'Traveller profile with notes and travel role.', category: 'Account / People / Transfer', template: 'traveller-detail' },
  { id: 48, slug: 'add-traveller-page', name: 'Add Traveller Page', shortDescription: 'Add a new traveller with role and document readiness.', category: 'Account / People / Transfer', template: 'traveller-detail' },
  { id: 49, slug: 'edit-traveller-page', name: 'Edit Traveller Page', shortDescription: 'Adjust traveller info and trip participation.', category: 'Account / People / Transfer', template: 'traveller-detail' },
  { id: 50, slug: 'trip-transfer-page', name: 'Trip Transfer Page', shortDescription: 'Choose secure file share or QR hand-off for a trip.', category: 'Account / People / Transfer', template: 'transfer' },
  { id: 51, slug: 'qr-export-page', name: 'QR Export Page', shortDescription: 'Show encrypted QR transfer for another device.', category: 'Account / People / Transfer', template: 'qr-export' },
  { id: 52, slug: 'qr-import-scan-page', name: 'QR Import / Scan Page', shortDescription: 'Scan secure transfer and enter the separate code.', category: 'Account / People / Transfer', template: 'qr-import' },
  { id: 53, slug: 'settings-home', name: 'Settings Home', shortDescription: 'Top-level settings hub for privacy, security, and UI.', category: 'Settings / System', recommendedOrder: 9, template: 'settings' },
  { id: 54, slug: 'privacy-local-storage-page', name: 'Privacy & Local Storage Page', shortDescription: 'Explain device-local data handling and deletion controls.', category: 'Settings / System', template: 'privacy-settings' },
  { id: 55, slug: 'data-storage-page', name: 'Data & Storage Page', shortDescription: 'Backups, storage use, and encrypted transfer history.', category: 'Settings / System', template: 'data-storage' },
  { id: 56, slug: 'security-page', name: 'Security Page', shortDescription: 'PIN, biometrics, vault lock, and session boundaries.', category: 'Settings / System', template: 'security' },
  { id: 57, slug: 'permissions-page', name: 'Permissions Page', shortDescription: 'Manage reminders and optional location access.', category: 'Settings / System', template: 'permissions' },
  { id: 58, slug: 'appearance-ui-settings-page', name: 'Appearance / UI Settings Page', shortDescription: 'Language, card density, and visual preference controls.', category: 'Settings / System', template: 'appearance' },
  { id: 59, slug: 'about-pineapple-page', name: 'About Pineapple Page', shortDescription: 'Product summary, version, and design-lab context.', category: 'Settings / System', template: 'about' },
  { id: 60, slug: 'help-support-page', name: 'Help / Support Page', shortDescription: 'Private review guidance, notes, and change process.', category: 'Settings / System', template: 'support' },
  { id: 61, slug: 'empty-state-no-trips', name: 'Empty State - No Trips', shortDescription: 'Warm empty state when no trips exist yet.', category: 'Utility States', template: 'empty' },
  { id: 62, slug: 'empty-state-no-documents', name: 'Empty State - No Documents', shortDescription: 'Empty-state vault with document prompts.', category: 'Utility States', template: 'empty' },
  { id: 63, slug: 'empty-state-no-alerts', name: 'Empty State - No Alerts', shortDescription: 'Clear state when nothing needs attention.', category: 'Utility States', template: 'empty' },
  { id: 64, slug: 'error-state-page', name: 'Error State Page', shortDescription: 'Branded error handling for failures or unsupported actions.', category: 'Utility States', template: 'error' },
  { id: 65, slug: 'permission-denied-state', name: 'Permission Denied State', shortDescription: 'Guide the user when a requested permission is denied.', category: 'Utility States', template: 'error' },
  { id: 66, slug: 'loading-processing-overlay', name: 'Loading / Processing Overlay', shortDescription: 'Polished loading overlay for secure or heavy actions.', category: 'Utility States', template: 'loading' },
  { id: 67, slug: 'delete-confirmation-modal', name: 'Delete Confirmation Modal', shortDescription: 'Destructive confirmation with clear consequences.', category: 'Utility States', template: 'modal' },
  { id: 68, slug: 'success-confirmation-modal', name: 'Success Confirmation Modal', shortDescription: 'Positive confirmation after secure or complete actions.', category: 'Utility States', template: 'modal' },
]

export const pages = pageDefinitions

export const pageMap = new Map(pageDefinitions.map((page) => [page.slug, page]))

export const recommendedPages = pageDefinitions
  .filter((page) => page.recommendedOrder)
  .sort((left, right) => (left.recommendedOrder ?? 999) - (right.recommendedOrder ?? 999))
