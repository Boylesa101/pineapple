export const mockTrips = [
  {
    id: 'trip-rome',
    name: 'Rome Escape',
    destination: 'Rome, Italy',
    travelWindow: '14 May - 20 May',
    countdown: '12 days to go',
    weather: { city: 'Rome', temperature: '22°C', condition: 'Sunny', highLow: 'H 24° / L 15°' },
    quickFacts: [
      { label: 'Currency', value: 'EUR' },
      { label: 'Language', value: 'Italian' },
      { label: 'Plug', value: 'Type C / F' },
      { label: 'Timezone', value: 'CET' },
    ],
    timeline: [
      { label: 'Flight to Rome', detail: '18:20 Heathrow T5', icon: 'flight', targetSlug: 'transport-detail-page', accent: '#93d5ff' },
      { label: 'Airport Taxi', detail: '14:10 pickup', icon: 'local_taxi', targetSlug: 'set-off-time-page', accent: '#f8c15d' },
      { label: 'Hotel Check-in', detail: '21:15', icon: 'hotel', targetSlug: 'accommodation-detail-page', accent: '#9cf0d0' },
      { label: 'Passport + Boarding Pass', detail: 'Travel documents ready', icon: 'badge', targetSlug: 'passport-viewer', accent: '#f9a9d0' },
      { label: 'Packing List', detail: '5 items still open', icon: 'checklist', targetSlug: 'packing-list-page', accent: '#ffdd8d' },
      { label: 'Itinerary', detail: 'Colosseum, Trastevere, Vatican', icon: 'map', targetSlug: 'itinerary-page', accent: '#adc8ff' },
    ],
  },
  {
    id: 'trip-copenhagen',
    name: 'Nordic Weekend',
    destination: 'Copenhagen, Denmark',
    travelWindow: '02 Jun - 05 Jun',
    countdown: '31 days to go',
  },
  {
    id: 'trip-kyoto',
    name: 'Kyoto Autumn',
    destination: 'Kyoto, Japan',
    travelWindow: '10 Oct - 18 Oct',
    countdown: '151 days to go',
  },
] as const

export const mockTravellers = [
  { id: 'trav-1', name: 'Andrew Boyle', role: 'Lead traveller', passport: 'GBR • ending 4821' },
  { id: 'trav-2', name: 'Mila Hart', role: 'Companion', passport: 'GBR • ending 9310' },
] as const

export const mockDocuments = [
  { id: 'doc-1', title: 'Passport', type: 'Identity', status: 'Valid', targetSlug: 'passport-viewer' },
  { id: 'doc-2', title: 'BA Boarding Pass', type: 'Travel', status: 'Ready', targetSlug: 'travel-ticket-booking-viewer' },
  { id: 'doc-3', title: 'Hilton Booking', type: 'Stay', status: 'Checked in 21:15', targetSlug: 'general-document-viewer' },
  { id: 'doc-4', title: 'Rail Ticket', type: 'Ground', status: 'Local QR available', targetSlug: 'travel-ticket-booking-viewer' },
] as const

export const mockAlerts = [
  { id: 'alert-1', title: 'Passport expires in 4 months', severity: 'warning', targetSlug: 'document-expiry-status-page' },
  { id: 'alert-2', title: 'Check Italy entry guidance before travel', severity: 'info', targetSlug: 'alert-detail-page' },
  { id: 'alert-3', title: 'Packing list still missing adapters', severity: 'reminder', targetSlug: 'packing-list-page' },
] as const

export const mockSupportTopics = [
  'Review screens page by page',
  'Test navigation inside the phone shell',
  'Iterate visual hierarchy and copy',
  'Bump version and capture changes',
] as const

export const mockTransfer = {
  tripName: 'Rome Escape',
  mode: 'Encrypted QR hand-off',
  status: 'Transfer code required on receiving device',
  hint: 'For larger trips, use encrypted file share instead.',
} as const
