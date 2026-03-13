import { parseISO } from 'date-fns';

import type { AppDataSnapshot, Document, PackingItem, Traveller } from '@/types/models';
import { daysLeft, daysUntil, isDateWithinDays } from './date';

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
  };
}

export function getUpcomingTrip(snapshot: AppDataSnapshot) {
  const now = new Date();
  return snapshot.trips.find((trip) => parseISO(trip.endDate) >= now) ?? snapshot.trips[0] ?? null;
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

export function getDocumentExpiryWarnings(documents: Document[]) {
  return documents
    .filter((document) => document.expiryDate && isDateWithinDays(document.expiryDate, 60))
    .sort((left, right) => (left.expiryDate && right.expiryDate ? left.expiryDate.localeCompare(right.expiryDate) : 0));
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
          subtitle: `${item.departureAirport} to ${item.arrivalAirport}`,
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
