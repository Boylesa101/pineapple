import type { Trip } from '@/types/models';
import { isPersonalDocumentsTripId } from '@/constants/vault';

export function isVisibleTrip(trip: Pick<Trip, 'id'>) {
  return !isPersonalDocumentsTripId(trip.id);
}

export function filterVisibleTrips<T extends Pick<Trip, 'id'>>(trips: T[]) {
  return trips.filter(isVisibleTrip);
}
