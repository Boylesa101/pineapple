import { parseISO } from 'date-fns';

import type { AppDataSnapshot, Document, PackingItem, Traveller } from '@/types/models';
import { getTripDocumentWarningSummary } from '@/services/documentWarnings';
import { formatAirportDisplay } from './airports';
import { daysLeft, daysUntil } from './date';
import { getDocumentExpiryRelativeLabel } from './documentExpiry';

const documentTypeLabels = {
  passport: 'passport',
  ghic: 'GHIC / EHIC',
  insurance: 'insurance document',
  visa: 'visa',
  driving_licence: 'driving licence',
  payment_card: 'payment card',
  id_card: 'ID card',
  custom: 'document',
} as const;

function possessiveOwner(ownerLabel: string) {
  return ownerLabel === 'Trip-wide' ? 'Trip-wide' : `${ownerLabel}'s`;
}

export function getTripById(snapshot: AppDataSnapshot, tripId: string | null | undefined) {
  return snapshot.trips.find((trip) => trip.id === tripId) ?? null;
}

export function getTripBundle(snapshot: AppDataSnapshot, tripId: string | null | undefined) {
  return {
    trip: getTripById(snapshot, tripId),
    travellers: snapshot.travellers.filter((item) => item.tripId === tripId),
    documents: snapshot.documents.filter((item) => item.tripId === tripId),
    packingItems: snapshot.packingItems.filter((item) => item.tripId === tripId),
    travelSegments: snapshot.travelSegments.filter((item) => item.tripId === tripId),
    hotelStays: snapshot.hotelStays.filter((item) => item.tripId === tripId),
    itineraryEvents: snapshot.itineraryEvents.filter((item) => item.tripId === tripId),
    emergencyInfo: snapshot.emergencyInfos.find((item) => item.tripId === tripId) ?? null,
    reminderSettings: snapshot.reminderSettings.filter((item) => item.tripId === tripId || item.tripId === null),
    participants: snapshot.tripParticipants.filter((item) => item.tripId === tripId),
    invites: snapshot.tripInvites.filter((item) => item.tripId === tripId),
    sharedTripState: snapshot.sharedTripStates.find((item) => item.tripId === tripId) ?? null,
    conflicts: snapshot.syncConflicts.filter((item) => item.tripId === tripId),
  };
}

export function getDashboardTrip(snapshot: AppDataSnapshot) {
  const now = new Date();
  const activeTrips = snapshot.trips
    .filter((trip) => trip.status === 'active' || (parseISO(trip.startDate) <= now && parseISO(trip.endDate) >= now))
    .sort((left, right) => left.startDate.localeCompare(right.startDate));
  if (activeTrips.length) {
    return activeTrips[0];
  }

  const upcomingTrips = snapshot.trips
    .filter((trip) => parseISO(trip.startDate) > now || trip.status === 'upcoming')
    .sort((left, right) => left.startDate.localeCompare(right.startDate));
  if (upcomingTrips.length) {
    return upcomingTrips[0];
  }

  const completedTrips = snapshot.trips
    .filter((trip) => trip.status === 'completed' || parseISO(trip.endDate) < now)
    .sort((left, right) => right.endDate.localeCompare(left.endDate));
  return completedTrips[0] ?? null;
}

export function getUpcomingTrip(snapshot: AppDataSnapshot) {
  return getDashboardTrip(snapshot);
}

export function getNextFlight(snapshot: AppDataSnapshot, tripId?: string | null) {
  const now = new Date();
  return (
    snapshot.travelSegments.find((segment) => {
      if (tripId && segment.tripId !== tripId) return false;
      return parseISO(segment.departureTime) >= now;
    }) ?? null
  );
}

export function getNextHotel(snapshot: AppDataSnapshot, tripId?: string | null) {
  const now = new Date();
  return (
    snapshot.hotelStays.find((hotel) => {
      if (tripId && hotel.tripId !== tripId) return false;
      return parseISO(hotel.checkIn) >= now;
    }) ?? null
  );
}

export function getNextEvent(snapshot: AppDataSnapshot, tripId?: string | null) {
  const now = new Date();
  return (
    snapshot.itineraryEvents.find((event) => {
      if (tripId && event.tripId !== tripId) return false;
      return parseISO(event.dateTime) >= now;
    }) ?? null
  );
}

export function getPackingProgress(snapshot: AppDataSnapshot, tripId?: string | null) {
  const items = snapshot.packingItems.filter((item) => !tripId || item.tripId === tripId);
  const packed = items.filter((item) => item.isPacked).length;
  return { items, packed, total: items.length };
}

export function getPackingProgressByTraveller(items: PackingItem[], travellers: Traveller[]) {
  return travellers.map((traveller) => {
    const assigned = items.filter(
      (item) => item.assignmentScope === 'trip' || item.travellerIds.includes(traveller.id)
    );
    const packed = assigned.filter((item) => item.isPacked).length;
    return {
      traveller,
      packed,
      total: assigned.length,
    };
  });
}

export function getDocumentExpiryWarnings(documents: Document[], travellers: Traveller[] = []) {
  return getTripDocumentWarningSummary(documents, travellers).warningItems;
}

export function getDocumentExpiryOverview(snapshot: AppDataSnapshot, tripId?: string | null) {
  const bundle = getTripBundle(snapshot, tripId);
  const summary = getTripDocumentWarningSummary(bundle.documents, bundle.travellers);
  return {
    expiredCount: summary.expiredCount,
    expiringCount: summary.expiringCount,
  };
}

export function getMissingInfoPrompts(snapshot: AppDataSnapshot, tripId: string | null | undefined) {
  const bundle = getTripBundle(snapshot, tripId);
  const prompts: string[] = [];
  if (!bundle.travellers.length) prompts.push('Add travellers for family and traveller-specific organisation.');
  if (!bundle.documents.some((document) => document.documentType === 'passport')) prompts.push('Passport details are missing.');
  if (!bundle.documents.some((document) => document.documentType === 'insurance')) prompts.push('Insurance documents are missing.');
  if (!bundle.hotelStays.length) prompts.push('No hotel details saved yet.');
  if (!bundle.emergencyInfo?.emergencyContacts && !bundle.emergencyInfo?.insurerEmergencyNumber) prompts.push('No emergency contact details saved.');
  return prompts;
}

export function getDashboardAlerts(snapshot: AppDataSnapshot, tripId: string | null | undefined) {
  const bundle = getTripBundle(snapshot, tripId);
  const alerts: Array<{ title: string; subtitle: string; tone: 'gold' | 'coral' | 'danger' }> = [];
  const documentSummary = getTripDocumentWarningSummary(bundle.documents, bundle.travellers);

  for (const item of documentSummary.warningItems.slice(0, 3)) {
    const noun = documentTypeLabels[item.document.documentType as keyof typeof documentTypeLabels] ?? 'document';
    if (item.info.isExpired) {
      alerts.push({
        title: 'Expired document',
        subtitle: `${possessiveOwner(item.ownerLabel)} ${noun} has expired.`,
        tone: 'danger',
      });
      continue;
    }

    if (item.info.needsExpiryPrompt) {
      alerts.push({
        title: 'Add expiry date',
        subtitle: `Add an expiry date for ${possessiveOwner(item.ownerLabel)} ${noun}.`,
        tone: 'gold',
      });
      continue;
    }

    alerts.push({
      title: item.info.passportSixMonthWarning ? 'Passport six-month warning' : `${noun[0].toUpperCase()}${noun.slice(1)} expiring soon`,
      subtitle: `${possessiveOwner(item.ownerLabel)} ${noun} ${getDocumentExpiryRelativeLabel(item.document.expiryDate).toLowerCase()}.`,
      tone:
        item.info.passportSixMonthWarning
          ? 'danger'
          : item.info.bucket === 'within_1_day' || item.info.bucket === 'within_7_days' || item.info.bucket === 'within_14_days' || item.info.bucket === 'within_30_days'
            ? 'coral'
            : 'gold',
    });
  }

  if (documentSummary.missingInsuranceTravellers.length) {
    alerts.push({
      title: 'Insurance missing',
      subtitle:
        documentSummary.missingInsuranceTravellers.length === 1
          ? `${documentSummary.missingInsuranceTravellers[0].fullName} has no insurance document.`
          : `${documentSummary.missingInsuranceTravellers.length} travellers have no insurance document.`,
      tone: 'coral',
    });
  } else if (!bundle.travellers.length && !bundle.documents.some((document) => document.documentType === 'insurance')) {
    alerts.push({
      title: 'Insurance missing',
      subtitle: 'Add insurance details before departure.',
      tone: 'coral',
    });
  }

  if (!bundle.hotelStays.length) {
    alerts.push({
      title: 'Hotel not added',
      subtitle: 'Save your stay details for quick access.',
      tone: 'gold',
    });
  }

  if (!bundle.emergencyInfo?.emergencyContacts && !bundle.emergencyInfo?.insurerEmergencyNumber) {
    alerts.push({
      title: 'Emergency contact missing',
      subtitle: 'Add local emergency contacts or insurer support.',
      tone: 'gold',
    });
  }

  const trip = bundle.trip;
  if (trip) {
    const packing = getPackingProgress(snapshot, trip.id);
    if (daysUntil(trip.startDate) <= 3 && packing.total > 0 && packing.packed < packing.total) {
      alerts.push({
        title: 'Packing incomplete',
        subtitle: `${packing.packed} of ${packing.total} items packed with departure close.`,
        tone: 'coral',
      });
    }
  }

  return alerts.slice(0, 6);
}

export function getTripStatusChips(startDate: string, endDate: string) {
  return {
    daysUntilDeparture: daysUntil(startDate),
    daysLeft: daysLeft(endDate),
  };
}

export function getUpcomingTimeline(snapshot: AppDataSnapshot, tripId: string | null | undefined) {
  const flight = getNextFlight(snapshot, tripId);
  const event = getNextEvent(snapshot, tripId);
  const hotel = getNextHotel(snapshot, tripId);

  return [flight, event, hotel]
    .filter(Boolean)
    .map((item) => {
      if (!item) return null;
      if ('departureTime' in item) {
        return {
          id: item.id,
          title: `${item.airline} ${item.flightNumber}`.trim(),
          dateTime: item.departureTime,
          subtitle: `${formatAirportDisplay(item.departureAirport, item.departureAirportCode)} to ${formatAirportDisplay(item.arrivalAirport, item.arrivalAirportCode)}`,
        };
      }
      if ('checkIn' in item) {
        return {
          id: item.id,
          title: item.hotelName,
          dateTime: item.checkIn,
          subtitle: 'Hotel check-in',
        };
      }
      return {
        id: item.id,
        title: item.title,
        dateTime: item.dateTime,
        subtitle: item.location || item.type,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .sort((a, b) => a.dateTime.localeCompare(b.dateTime));
}
