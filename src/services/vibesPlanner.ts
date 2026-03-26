import type { ItineraryEventDraft, Trip, VibeCategory } from '@/types/models';
import type { VibeItem } from '@/services/tripadvisorVibesService';

export function mapVibeCategoryToItineraryType(category: VibeCategory): ItineraryEventDraft['type'] {
  return category === 'eat' || category === 'drink' ? 'meal' : 'excursion';
}

export function buildVibeItineraryDraft(trip: Trip, item: VibeItem): ItineraryEventDraft {
  const slot = new Date(trip.startDate);
  if (Number.isNaN(slot.getTime())) {
    slot.setTime(Date.now());
  }
  slot.setHours(item.category === 'eat' || item.category === 'drink' ? 19 : 10, 0, 0, 0);

  const primaryUrl = item.websiteUrl ?? item.tripadvisorUrl;

  return {
    tripId: trip.id,
    title: item.name,
    type: mapVibeCategoryToItineraryType(item.category),
    dateTime: slot.toISOString(),
    location: item.address,
    confirmationNumber: '',
    notes: `Added from Vibes · Source: Tripadvisor${primaryUrl ? ` · ${primaryUrl}` : ''}`,
  };
}
