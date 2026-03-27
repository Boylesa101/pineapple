import { MaterialIcons } from '@expo/vector-icons';

import type { TransportType, TravelSegment } from '@/types/models';
import { compareIsoDates } from './date';

export type TransportDisplay = {
  label: string;
  shortLabel: string;
  providerLabel: string;
  providerPlaceholder: string;
  providerHelper: string;
  serviceNumberLabel: string;
  departureLabel: string;
  arrivalLabel: string;
  terminalLabel: string;
  gateLabel: string;
  departureIcon: keyof typeof MaterialIcons.glyphMap;
  arrivalIcon: keyof typeof MaterialIcons.glyphMap;
  cardIcon: keyof typeof MaterialIcons.glyphMap;
  detailIcon: keyof typeof MaterialIcons.glyphMap;
  directionOtherLabel: string;
};

const DISPLAY_BY_TRANSPORT: Record<TransportType, TransportDisplay> = {
  flight: {
    label: 'Flight',
    shortLabel: 'Flight',
    providerLabel: 'Airline',
    providerPlaceholder: 'Search airline',
    providerHelper: 'Pick an airline to keep the code and logo tidy.',
    serviceNumberLabel: 'Flight number',
    departureLabel: 'Departure airport',
    arrivalLabel: 'Arrival airport',
    terminalLabel: 'Terminal',
    gateLabel: 'Gate',
    departureIcon: 'flight-takeoff',
    arrivalIcon: 'flight-land',
    cardIcon: 'flight',
    detailIcon: 'flight',
    directionOtherLabel: 'Connection',
  },
  private_flight: {
    label: 'Private flight',
    shortLabel: 'Private',
    providerLabel: 'Operator',
    providerPlaceholder: 'Search operator or type manually',
    providerHelper: 'Add the charter operator or type the tail operator manually.',
    serviceNumberLabel: 'Tail / service number',
    departureLabel: 'Departure airport',
    arrivalLabel: 'Arrival airport',
    terminalLabel: 'Terminal / FBO',
    gateLabel: 'Stand / note',
    departureIcon: 'flight-takeoff',
    arrivalIcon: 'flight-land',
    cardIcon: 'flight-class',
    detailIcon: 'flight-class',
    directionOtherLabel: 'Connection',
  },
  train: {
    label: 'Train',
    shortLabel: 'Train',
    providerLabel: 'Train operator',
    providerPlaceholder: 'Search train operator',
    providerHelper: 'Pick a train operator or type one manually.',
    serviceNumberLabel: 'Service number',
    departureLabel: 'Departure station',
    arrivalLabel: 'Arrival station',
    terminalLabel: 'Platform / carriage',
    gateLabel: 'Seat / platform note',
    departureIcon: 'train',
    arrivalIcon: 'train',
    cardIcon: 'train',
    detailIcon: 'train',
    directionOtherLabel: 'Other',
  },
  ferry: {
    label: 'Ferry',
    shortLabel: 'Ferry',
    providerLabel: 'Ferry operator',
    providerPlaceholder: 'Add ferry operator',
    providerHelper: 'Add the ferry line or a manual operator note.',
    serviceNumberLabel: 'Sailing / booking ref',
    departureLabel: 'Departure port',
    arrivalLabel: 'Arrival port',
    terminalLabel: 'Terminal / boarding note',
    gateLabel: 'Lane / gate note',
    departureIcon: 'directions-boat',
    arrivalIcon: 'directions-boat',
    cardIcon: 'directions-boat',
    detailIcon: 'directions-boat',
    directionOtherLabel: 'Other',
  },
  eurotunnel: {
    label: 'Eurotunnel',
    shortLabel: 'Tunnel',
    providerLabel: 'Operator',
    providerPlaceholder: 'Add Eurotunnel booking or operator',
    providerHelper: 'Use LeShuttle or add a manual booking note.',
    serviceNumberLabel: 'Booking / crossing ref',
    departureLabel: 'Departure terminal',
    arrivalLabel: 'Arrival terminal',
    terminalLabel: 'Lane / check-in',
    gateLabel: 'Vehicle / boarding note',
    departureIcon: 'commute',
    arrivalIcon: 'commute',
    cardIcon: 'commute',
    detailIcon: 'commute',
    directionOtherLabel: 'Other',
  },
  car: {
    label: 'Driving holiday',
    shortLabel: 'Drive',
    providerLabel: 'Car hire / provider',
    providerPlaceholder: 'Add rental company or driver',
    providerHelper: 'Add the rental company or leave a manual note.',
    serviceNumberLabel: 'Booking / route ref',
    departureLabel: 'Departure point',
    arrivalLabel: 'Arrival point',
    terminalLabel: 'Pickup details',
    gateLabel: 'Vehicle / parking note',
    departureIcon: 'directions-car',
    arrivalIcon: 'location-on',
    cardIcon: 'directions-car',
    detailIcon: 'directions-car',
    directionOtherLabel: 'Other',
  },
  taxi: {
    label: 'Taxi / ride',
    shortLabel: 'Taxi',
    providerLabel: 'Taxi / ride service',
    providerPlaceholder: 'Add taxi company or app',
    providerHelper: 'Use the taxi firm, Uber, Bolt, or a manual note.',
    serviceNumberLabel: 'Booking / ride ref',
    departureLabel: 'Pickup point',
    arrivalLabel: 'Drop-off point',
    terminalLabel: 'Pickup note',
    gateLabel: 'Driver / vehicle note',
    departureIcon: 'local-taxi',
    arrivalIcon: 'location-on',
    cardIcon: 'local-taxi',
    detailIcon: 'local-taxi',
    directionOtherLabel: 'Other',
  },
};

export function normalizeTransportType(value: string | null | undefined): TransportType {
  if (
    value === 'private_flight' ||
    value === 'train' ||
    value === 'ferry' ||
    value === 'eurotunnel' ||
    value === 'car' ||
    value === 'taxi'
  ) {
    return value;
  }

  return 'flight';
}

export function getTransportDisplay(type: TransportType): TransportDisplay {
  return DISPLAY_BY_TRANSPORT[type] ?? DISPLAY_BY_TRANSPORT.flight;
}

export function isAirTransportType(type: TransportType) {
  return type === 'flight' || type === 'private_flight';
}

export function supportsAirportFields(type: TransportType) {
  return isAirTransportType(type);
}

export function supportsProviderSuggestions(type: TransportType) {
  return type === 'flight' || type === 'private_flight' || type === 'train';
}

export function getPrimaryTransportType(travelSegments: TravelSegment[]): TransportType | null {
  if (!travelSegments.length) {
    return null;
  }

  const outbound = [...travelSegments]
    .filter((segment) => segment.travelDirection === 'outbound')
    .sort((left, right) => compareIsoDates(left.departureTime, right.departureTime))[0];

  if (outbound) {
    return normalizeTransportType(outbound.transportType);
  }

  return normalizeTransportType(
    [...travelSegments].sort((left, right) => compareIsoDates(left.departureTime, right.departureTime))[0]?.transportType ?? null
  );
}
