import { del, get, set } from 'idb-keyval';

import { createId } from '@/utils/ids';
import type {
  AppDataSnapshot,
  AppPreferences,
  AppPreferencesDraft,
  DocumentDraft,
  EmergencyInfoDraft,
  HotelStayDraft,
  ItineraryEventDraft,
  PackingItemDraft,
  ReminderSettingDraft,
  SharedTripStateDraft,
  SyncConflictDraft,
  TravelSegmentDraft,
  TravellerDraft,
  TripDraft,
  TripInviteDraft,
  TripParticipantDraft,
} from '@/types/models';

const SNAPSHOT_KEY = 'pineapple.snapshot';

function now() {
  return new Date().toISOString();
}

function defaultAppPreferences(timestamp = now()): AppPreferences {
  return {
    id: 'app',
    notificationsEnabled: false,
    syncEnabled: false,
    syncMode: 'manual_share',
    syncStatus: 'local_only',
    lastSyncAt: null,
    privacyMaskingMode: 'always',
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function emptySnapshot(timestamp = now()): AppDataSnapshot {
  return {
    trips: [],
    travellers: [],
    documents: [],
    packingItems: [],
    travelSegments: [],
    hotelStays: [],
    itineraryEvents: [],
    emergencyInfos: [],
    reminderSettings: [],
    appPreferences: defaultAppPreferences(timestamp),
    tripParticipants: [],
    tripInvites: [],
    sharedTripStates: [],
    syncConflicts: [],
  };
}

async function readSnapshot() {
  return (await get<AppDataSnapshot>(SNAPSHOT_KEY)) ?? emptySnapshot();
}

async function writeSnapshot(snapshot: AppDataSnapshot) {
  await set(SNAPSHOT_KEY, snapshot);
}

function withUpsert<T extends { id: string }>(items: T[], nextItem: T) {
  return [...items.filter((item) => item.id !== nextItem.id), nextItem];
}

function withTripUpsert<T extends { tripId: string }>(items: T[], nextItem: T) {
  return [...items.filter((item) => item.tripId !== nextItem.tripId), nextItem];
}

export async function loadSnapshot(): Promise<AppDataSnapshot> {
  return readSnapshot();
}

export async function upsertTrip(input: TripDraft) {
  const snapshot = await readSnapshot();
  const timestamp = now();
  const id = input.id ?? createId('trip');
  await writeSnapshot({
    ...snapshot,
    trips: withUpsert(snapshot.trips, {
      ...input,
      id,
      createdAt: snapshot.trips.find((trip) => trip.id === id)?.createdAt ?? timestamp,
      updatedAt: timestamp,
    }),
    tripParticipants: snapshot.tripParticipants.some((participant) => participant.tripId === id)
      ? snapshot.tripParticipants
      : [
          ...snapshot.tripParticipants,
          {
            id: `participant_${id}`,
            tripId: id,
            displayName: 'You',
            email: '',
            role: 'owner',
            avatarColor: '#F4B400',
            inviteCode: `PINE-${id.slice(-6).toUpperCase()}`,
            isLocalProfile: true,
            createdAt: timestamp,
            updatedAt: timestamp,
          },
        ],
    sharedTripStates: snapshot.sharedTripStates.some((state) => state.tripId === id)
      ? snapshot.sharedTripStates
      : [
          ...snapshot.sharedTripStates,
          {
            tripId: id,
            shareCode: `PINE-${id.slice(-6).toUpperCase()}`,
            syncEnabled: false,
            syncStatus: 'local_only',
            lastSyncAt: null,
            lastExportedAt: null,
            lastImportedAt: null,
            lastKnownRemoteUpdatedAt: null,
            createdAt: timestamp,
            updatedAt: timestamp,
          },
        ],
  });
  return id;
}

export async function upsertTraveller(input: TravellerDraft) {
  const snapshot = await readSnapshot();
  const timestamp = now();
  const id = input.id ?? createId('traveller');
  await writeSnapshot({
    ...snapshot,
    travellers: withUpsert(snapshot.travellers, {
      ...input,
      id,
      createdAt: snapshot.travellers.find((item) => item.id === id)?.createdAt ?? timestamp,
      updatedAt: timestamp,
    }),
  });
  return id;
}

export async function upsertDocument(input: DocumentDraft) {
  const snapshot = await readSnapshot();
  const timestamp = now();
  const id = input.id ?? createId('document');
  await writeSnapshot({
    ...snapshot,
    documents: withUpsert(snapshot.documents, {
      ...input,
      id,
      createdAt: snapshot.documents.find((item) => item.id === id)?.createdAt ?? timestamp,
      updatedAt: timestamp,
    }),
  });
  return id;
}

export async function upsertPackingItem(input: PackingItemDraft) {
  const snapshot = await readSnapshot();
  const timestamp = now();
  const id = input.id ?? createId('packing');
  await writeSnapshot({
    ...snapshot,
    packingItems: withUpsert(snapshot.packingItems, {
      ...input,
      id,
      createdAt: snapshot.packingItems.find((item) => item.id === id)?.createdAt ?? timestamp,
      updatedAt: timestamp,
    }),
  });
  return id;
}

export async function upsertTravelSegment(input: TravelSegmentDraft) {
  const snapshot = await readSnapshot();
  const timestamp = now();
  const id = input.id ?? createId('segment');
  await writeSnapshot({
    ...snapshot,
    travelSegments: withUpsert(snapshot.travelSegments, {
      ...input,
      id,
      createdAt: snapshot.travelSegments.find((item) => item.id === id)?.createdAt ?? timestamp,
      updatedAt: timestamp,
    }),
  });
  return id;
}

export async function upsertHotelStay(input: HotelStayDraft) {
  const snapshot = await readSnapshot();
  const timestamp = now();
  const id = input.id ?? createId('hotel');
  await writeSnapshot({
    ...snapshot,
    hotelStays: withUpsert(snapshot.hotelStays, {
      ...input,
      id,
      createdAt: snapshot.hotelStays.find((item) => item.id === id)?.createdAt ?? timestamp,
      updatedAt: timestamp,
    }),
  });
  return id;
}

export async function upsertItineraryEvent(input: ItineraryEventDraft) {
  const snapshot = await readSnapshot();
  const timestamp = now();
  const id = input.id ?? createId('event');
  await writeSnapshot({
    ...snapshot,
    itineraryEvents: withUpsert(snapshot.itineraryEvents, {
      ...input,
      id,
      createdAt: snapshot.itineraryEvents.find((item) => item.id === id)?.createdAt ?? timestamp,
      updatedAt: timestamp,
    }),
  });
  return id;
}

export async function upsertEmergencyInfo(input: EmergencyInfoDraft) {
  const snapshot = await readSnapshot();
  const timestamp = now();
  const id = input.id ?? createId('emergency');
  await writeSnapshot({
    ...snapshot,
    emergencyInfos: withTripUpsert(snapshot.emergencyInfos, {
      ...input,
      id,
      createdAt: snapshot.emergencyInfos.find((item) => item.tripId === input.tripId)?.createdAt ?? timestamp,
      updatedAt: timestamp,
    }),
  });
  return id;
}

export async function upsertReminderSetting(input: ReminderSettingDraft) {
  const snapshot = await readSnapshot();
  const timestamp = now();
  const id = input.id ?? createId('reminder');
  await writeSnapshot({
    ...snapshot,
    reminderSettings: withUpsert(snapshot.reminderSettings, {
      ...input,
      id,
      createdAt: snapshot.reminderSettings.find((item) => item.id === id)?.createdAt ?? timestamp,
      updatedAt: timestamp,
    }),
  });
  return id;
}

export async function upsertAppPreferences(input: AppPreferencesDraft) {
  const snapshot = await readSnapshot();
  await writeSnapshot({
    ...snapshot,
    appPreferences: {
      ...snapshot.appPreferences,
      ...input,
      id: 'app',
      createdAt: snapshot.appPreferences.createdAt,
      updatedAt: now(),
    },
  });
  return 'app';
}

export async function upsertTripParticipant(input: TripParticipantDraft) {
  const snapshot = await readSnapshot();
  const timestamp = now();
  const id = input.id ?? createId('participant');
  await writeSnapshot({
    ...snapshot,
    tripParticipants: withUpsert(snapshot.tripParticipants, {
      ...input,
      id,
      createdAt: snapshot.tripParticipants.find((item) => item.id === id)?.createdAt ?? timestamp,
      updatedAt: timestamp,
    }),
  });
  return id;
}

export async function upsertTripInvite(input: TripInviteDraft) {
  const snapshot = await readSnapshot();
  const timestamp = now();
  const id = input.id ?? createId('invite');
  await writeSnapshot({
    ...snapshot,
    tripInvites: withUpsert(snapshot.tripInvites, {
      ...input,
      id,
      createdAt: snapshot.tripInvites.find((item) => item.id === id)?.createdAt ?? timestamp,
      updatedAt: timestamp,
    }),
  });
  return id;
}

export async function upsertSharedTripState(input: SharedTripStateDraft) {
  const snapshot = await readSnapshot();
  await writeSnapshot({
    ...snapshot,
    sharedTripStates: withTripUpsert(snapshot.sharedTripStates, {
      ...snapshot.sharedTripStates.find((item) => item.tripId === input.tripId),
      ...input,
      tripId: input.tripId,
      createdAt: snapshot.sharedTripStates.find((item) => item.tripId === input.tripId)?.createdAt ?? now(),
      updatedAt: now(),
    }),
  });
  return input.tripId;
}

export async function upsertSyncConflict(input: SyncConflictDraft) {
  const snapshot = await readSnapshot();
  const timestamp = now();
  const id = input.id ?? createId('conflict');
  await writeSnapshot({
    ...snapshot,
    syncConflicts: withUpsert(snapshot.syncConflicts, {
      ...input,
      id,
      createdAt: snapshot.syncConflicts.find((item) => item.id === id)?.createdAt ?? timestamp,
      updatedAt: timestamp,
    }),
  });
  return id;
}

export async function deleteById(table: string, id: string) {
  const snapshot = await readSnapshot();
  const next = { ...snapshot };

  switch (table) {
    case 'trips':
      next.trips = snapshot.trips.filter((item) => item.id !== id);
      next.travellers = snapshot.travellers.filter((item) => item.tripId !== id);
      next.documents = snapshot.documents.filter((item) => item.tripId !== id);
      next.packingItems = snapshot.packingItems.filter((item) => item.tripId !== id);
      next.travelSegments = snapshot.travelSegments.filter((item) => item.tripId !== id);
      next.hotelStays = snapshot.hotelStays.filter((item) => item.tripId !== id);
      next.itineraryEvents = snapshot.itineraryEvents.filter((item) => item.tripId !== id);
      next.emergencyInfos = snapshot.emergencyInfos.filter((item) => item.tripId !== id);
      next.reminderSettings = snapshot.reminderSettings.filter((item) => item.tripId !== id);
      next.tripParticipants = snapshot.tripParticipants.filter((item) => item.tripId !== id);
      next.tripInvites = snapshot.tripInvites.filter((item) => item.tripId !== id);
      next.sharedTripStates = snapshot.sharedTripStates.filter((item) => item.tripId !== id);
      next.syncConflicts = snapshot.syncConflicts.filter((item) => item.tripId !== id);
      break;
    case 'travellers':
      next.travellers = snapshot.travellers.filter((item) => item.id !== id);
      next.documents = snapshot.documents.map((item) => (item.travellerId === id ? { ...item, travellerId: null } : item));
      next.packingItems = snapshot.packingItems.map((item) =>
        item.travellerIds.includes(id) ? { ...item, travellerIds: item.travellerIds.filter((travellerId) => travellerId !== id) } : item
      );
      break;
    case 'documents':
      next.documents = snapshot.documents.filter((item) => item.id !== id);
      break;
    case 'packing_items':
      next.packingItems = snapshot.packingItems.filter((item) => item.id !== id);
      break;
    case 'travel_segments':
      next.travelSegments = snapshot.travelSegments.filter((item) => item.id !== id);
      break;
    case 'hotel_stays':
      next.hotelStays = snapshot.hotelStays.filter((item) => item.id !== id);
      break;
    case 'itinerary_events':
      next.itineraryEvents = snapshot.itineraryEvents.filter((item) => item.id !== id);
      break;
    case 'emergency_infos':
      next.emergencyInfos = snapshot.emergencyInfos.filter((item) => item.id !== id);
      break;
    case 'trip_participants':
      next.tripParticipants = snapshot.tripParticipants.filter((item) => item.id !== id);
      break;
    case 'trip_invites':
      next.tripInvites = snapshot.tripInvites.filter((item) => item.id !== id);
      break;
    case 'sync_conflicts':
      next.syncConflicts = snapshot.syncConflicts.filter((item) => item.id !== id);
      break;
    default:
      break;
  }

  await writeSnapshot(next);
}

export async function clearAllData() {
  await del(SNAPSHOT_KEY);
  await writeSnapshot(emptySnapshot());
}

export async function persistSnapshot(snapshot: AppDataSnapshot) {
  await writeSnapshot(snapshot);
}

export async function replaceAllData(snapshot: AppDataSnapshot) {
  await writeSnapshot(snapshot);
}
