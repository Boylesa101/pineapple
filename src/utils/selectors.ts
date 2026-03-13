import { parseISO } from 'date-fns';

import type { AppDataSnapshot } from '@/types/models';

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
  };
}

export function getUpcomingTrip(snapshot: AppDataSnapshot) {
  const now = new Date();
  return (
    snapshot.trips.find((trip) => parseISO(trip.endDate) >= now) ??
    snapshot.trips[0] ??
    null
  );
}

export function getNextFlight(snapshot: AppDataSnapshot, tripId?: string | null) {
  const now = new Date();
  return snapshot.travelSegments.find((segment) => {
    if (tripId && segment.tripId !== tripId) return false;
    return parseISO(segment.departureTime) >= now;
  }) ?? null;
}

export function getNextHotel(snapshot: AppDataSnapshot, tripId?: string | null) {
  const now = new Date();
  return snapshot.hotelStays.find((hotel) => {
    if (tripId && hotel.tripId !== tripId) return false;
    return parseISO(hotel.checkIn) >= now;
  }) ?? null;
}

export function getNextEvent(snapshot: AppDataSnapshot, tripId?: string | null) {
  const now = new Date();
  return snapshot.itineraryEvents.find((event) => {
    if (tripId && event.tripId !== tripId) return false;
    return parseISO(event.dateTime) >= now;
  }) ?? null;
}

export function getPackingProgress(snapshot: AppDataSnapshot, tripId?: string | null) {
  const items = snapshot.packingItems.filter((item) => !tripId || item.tripId === tripId);
  const packed = items.filter((item) => item.isPacked).length;
  return { items, packed, total: items.length };
}
