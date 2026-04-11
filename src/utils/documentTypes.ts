import type { Document, DocumentDraft, DocumentType, Traveller } from '@/types/models';

export const documentLabels: Record<DocumentType, string> = {
  passport: 'Passport',
  ghic: 'GHIC / EHIC',
  insurance: 'Travel insurance',
  visa: 'Visa',
  driving_licence: 'Driving licence',
  payment_card: 'Payment card',
  id_card: 'ID card',
  boarding_pass: 'Boarding pass',
  hotel_booking: 'Hotel booking',
  excursion_ticket: 'Excursion ticket',
  hire_car_booking: 'Hire car booking',
  airport_lounge_pass: 'Airport lounge pass',
  loyalty_card: 'Airline loyalty card',
  rail_ticket: 'Rail ticket',
  custom: 'Custom',
};

export const airlineLoyaltyPresets = [
  {
    id: 'british-airways-club',
    title: 'The British Airways Club',
    issuer: 'British Airways',
    accent: '#D5A43B',
    background: '#11224E',
    border: '#26427A',
  },
  {
    id: 'virgin-atlantic-flying-club',
    title: 'Flying Club',
    issuer: 'Virgin Atlantic',
    accent: '#FF6688',
    background: '#73001A',
    border: '#A41235',
  },
  {
    id: 'flying-blue',
    title: 'Flying Blue',
    issuer: 'Air France KLM',
    accent: '#89D7FF',
    background: '#104AA8',
    border: '#2C6DDA',
  },
  {
    id: 'emirates-skywards',
    title: 'Skywards',
    issuer: 'Emirates',
    accent: '#E1C36D',
    background: '#7D0619',
    border: '#A91F30',
  },
  {
    id: 'miles-and-more',
    title: 'Miles & More',
    issuer: 'Lufthansa Group',
    accent: '#87CBFF',
    background: '#0C2747',
    border: '#24466E',
  },
] as const;

export const manualTravelDocumentTypes: DocumentType[] = [
  'insurance',
  'visa',
  'boarding_pass',
  'hotel_booking',
  'excursion_ticket',
  'hire_car_booking',
  'airport_lounge_pass',
  'loyalty_card',
  'rail_ticket',
  'custom',
];

export type FormalDocumentTheme = {
  background: string;
  border: string;
  accent: string;
  ink: string;
  muted: string;
  label: string;
  icon: 'folder-open' | 'flight' | 'hotel' | 'directions-car' | 'airline-seat-recline-extra' | 'loyalty' | 'train';
};

export function findAirlineLoyaltyPreset(document: Pick<Document | DocumentDraft, 'documentType' | 'formalDocumentData'>) {
  if (document.documentType !== 'loyalty_card') {
    return null;
  }

  const haystack = `${document.formalDocumentData?.title ?? ''} ${document.formalDocumentData?.issuer ?? ''}`.toLowerCase();
  return (
    airlineLoyaltyPresets.find((preset) => {
      const title = preset.title.toLowerCase();
      const issuer = preset.issuer.toLowerCase();
      return haystack.includes(title) || haystack.includes(issuer);
    }) ?? null
  );
}

export function getFormalDocumentTheme(document: Pick<Document | DocumentDraft, 'documentType' | 'formalDocumentData'>): FormalDocumentTheme {
  const loyaltyPreset = findAirlineLoyaltyPreset(document);
  if (loyaltyPreset) {
    return {
      background: loyaltyPreset.background,
      border: loyaltyPreset.border,
      accent: loyaltyPreset.accent,
      ink: '#FFFFFF',
      muted: 'rgba(255,255,255,0.82)',
      label: 'Frequent flyer',
      icon: 'loyalty',
    };
  }

  switch (document.documentType) {
    case 'boarding_pass':
      return {
        background: '#113B68',
        border: '#2A6098',
        accent: '#7FD4FF',
        ink: '#FFFFFF',
        muted: '#D9EBFF',
        label: 'Boarding pass',
        icon: 'flight',
      };
    case 'hotel_booking':
      return {
        background: '#5A3B2E',
        border: '#8A654A',
        accent: '#F2D39B',
        ink: '#FFFFFF',
        muted: '#F1E2D1',
        label: 'Hotel stay',
        icon: 'hotel',
      };
    case 'hire_car_booking':
      return {
        background: '#16324F',
        border: '#2F597E',
        accent: '#8AD3FF',
        ink: '#FFFFFF',
        muted: '#DCEFFF',
        label: 'Hire car',
        icon: 'directions-car',
      };
    case 'airport_lounge_pass':
      return {
        background: '#1F2634',
        border: '#3B475D',
        accent: '#E8D39A',
        ink: '#FFFFFF',
        muted: '#E6E7EE',
        label: 'Lounge access',
        icon: 'airline-seat-recline-extra',
      };
    case 'rail_ticket':
      return {
        background: '#F8A647',
        border: '#E07F1E',
        accent: '#7A3E00',
        ink: '#3E2300',
        muted: '#6C3B04',
        label: 'National Rail style',
        icon: 'train',
      };
    default:
      return {
        background: '#8F5E3B',
        border: '#A8754F',
        accent: '#E0C58F',
        ink: '#FFFFFF',
        muted: '#F1E2D1',
        label: 'Official record',
        icon: 'folder-open',
      };
  }
}

export function getFormalDocumentDateLabels(documentType: DocumentType) {
  switch (documentType) {
    case 'hire_car_booking':
      return { startLabel: 'Pickup', endLabel: 'Drop-off' };
    case 'airport_lounge_pass':
      return { startLabel: 'Access starts', endLabel: 'Access ends' };
    case 'rail_ticket':
      return { startLabel: 'Departure', endLabel: 'Arrival / valid until' };
    default:
      return { startLabel: 'Issue date', endLabel: 'Expiry / renewal' };
  }
}

export function buildRailTicketQrPayload(document: Pick<Document, 'holderName' | 'documentNumber' | 'issueDate' | 'expiryDate' | 'formalDocumentData'>, traveller?: Traveller | null) {
  return JSON.stringify({
    format: 'pineapple-rail-ticket',
    holder: document.holderName || traveller?.fullName || '',
    reference: document.formalDocumentData?.referenceCode || document.documentNumber,
    route: document.formalDocumentData?.title || '',
    operator: document.formalDocumentData?.issuer || '',
    departureAt: document.issueDate,
    arrivalAt: document.expiryDate,
    seat: document.formalDocumentData?.location || '',
    fare: document.formalDocumentData?.status || '',
    notes: document.formalDocumentData?.summary || '',
  });
}
