import * as Sharing from 'expo-sharing';

import type {
  AppDataSnapshot,
  ConflictStatus,
  SharedTripPacket,
  SharedTripPacketData,
  SyncConflict,
} from '@/types/models';
import { createId } from '@/utils/ids';
import { writeUtf8File } from '@/utils/fileStorage';
import { createShareCode } from '@/utils/shareCodes';
import { getTripBundle, getTripById } from '@/utils/selectors';

function cloneSnapshot<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function now() {
  return new Date().toISOString();
}

function buildSharedPacketData(snapshot: AppDataSnapshot, tripId: string): SharedTripPacketData {
  const trip = getTripById(snapshot, tripId);
  const bundle = getTripBundle(snapshot, tripId);

  if (!trip) {
    throw new Error('Trip not found.');
  }

  return {
    trip,
    travellers: bundle.travellers,
    packingItems: bundle.packingItems,
    travelSegments: bundle.travelSegments,
    hotelStays: bundle.hotelStays,
    itineraryEvents: bundle.itineraryEvents,
    emergencyInfo: bundle.emergencyInfo,
    reminderSettings: bundle.reminderSettings.filter((setting) => setting.tripId === tripId),
    participants: bundle.participants,
    invites: bundle.invites,
  };
}

export function createSharedTripPacket(snapshot: AppDataSnapshot, tripId: string): SharedTripPacket {
  const trip = getTripById(snapshot, tripId);
  const bundle = getTripBundle(snapshot, tripId);
  const senderLabel =
    bundle.participants.find((participant) => participant.role === 'owner' && participant.isLocalProfile)?.displayName ??
    bundle.participants[0]?.displayName ??
    'Pineapple user';
  const shareCode = bundle.sharedTripState?.shareCode ?? createShareCode();

  if (!trip) {
    throw new Error('Trip not found.');
  }

  return {
    format: 'pineapple-shared-trip',
    version: 1,
    shareCode,
    generatedAt: now(),
    senderLabel,
    data: buildSharedPacketData(snapshot, tripId),
  };
}

export async function exportSharedTripPacket(snapshot: AppDataSnapshot, tripId: string) {
  const packet = createSharedTripPacket(snapshot, tripId);
  const uri = await writeUtf8File(
    'exports',
    `pineapple-share-${packet.data.trip.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'trip'}.pineappleshare.json`,
    JSON.stringify(packet, null, 2)
  );

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/json',
      dialogTitle: `${packet.data.trip.name} · Nearby / Quick Share`,
    });
  }

  return { packet, uri };
}

export function parseSharedTripPacket(contents: string) {
  const packet = JSON.parse(contents) as SharedTripPacket;
  if (packet.format !== 'pineapple-shared-trip' || packet.version !== 1) {
    throw new Error('This shared trip file is not recognised.');
  }
  if (!packet.data?.trip?.id) {
    throw new Error('This shared trip file is incomplete.');
  }
  return packet;
}

function replaceTripCollections(snapshot: AppDataSnapshot, packet: SharedTripPacket, tripId: string) {
  const next = cloneSnapshot(snapshot);
  const tripIdsToRemove = new Set([tripId]);

  next.trips = [...next.trips.filter((trip) => !tripIdsToRemove.has(trip.id)), packet.data.trip];
  next.travellers = [...next.travellers.filter((item) => item.tripId !== tripId), ...packet.data.travellers];
  next.packingItems = [...next.packingItems.filter((item) => item.tripId !== tripId), ...packet.data.packingItems];
  next.travelSegments = [...next.travelSegments.filter((item) => item.tripId !== tripId), ...packet.data.travelSegments];
  next.hotelStays = [...next.hotelStays.filter((item) => item.tripId !== tripId), ...packet.data.hotelStays];
  next.itineraryEvents = [...next.itineraryEvents.filter((item) => item.tripId !== tripId), ...packet.data.itineraryEvents];
  next.emergencyInfos = [
    ...next.emergencyInfos.filter((item) => item.tripId !== tripId),
    ...(packet.data.emergencyInfo ? [packet.data.emergencyInfo] : []),
  ];
  next.reminderSettings = [
    ...next.reminderSettings.filter((item) => item.tripId !== tripId),
    ...packet.data.reminderSettings,
  ];
  next.tripParticipants = [...next.tripParticipants.filter((item) => item.tripId !== tripId), ...packet.data.participants];
  next.tripInvites = [...next.tripInvites.filter((item) => item.tripId !== tripId), ...packet.data.invites];
  next.sharedTripStates = [
    ...next.sharedTripStates.filter((item) => item.tripId !== tripId),
    {
      tripId,
      shareCode: packet.shareCode,
      syncEnabled: true,
      syncStatus: 'ready',
      lastSyncAt: now(),
      lastExportedAt: null,
      lastImportedAt: now(),
      lastKnownRemoteUpdatedAt: packet.data.trip.updatedAt,
      createdAt: packet.data.trip.createdAt,
      updatedAt: now(),
    },
  ];

  return next;
}

function buildConflict(packet: SharedTripPacket, tripId: string, localUpdatedAt: string): SyncConflict {
  const timestamp = now();
  return {
    id: createId('conflict'),
    tripId,
    shareCode: packet.shareCode,
    summary: `Manual sync conflict for ${packet.data.trip.name}`,
    localUpdatedAt,
    incomingUpdatedAt: packet.data.trip.updatedAt,
    incomingPayload: JSON.stringify(packet),
    status: 'open',
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function importSharedTripPacket(snapshot: AppDataSnapshot, packet: SharedTripPacket) {
  const next = cloneSnapshot(snapshot);
  const existingState = snapshot.sharedTripStates.find((state) => state.shareCode === packet.shareCode) ?? null;
  const targetTripId = existingState?.tripId ?? packet.data.trip.id;
  const localTrip = snapshot.trips.find((trip) => trip.id === targetTripId) ?? null;
  const lastKnownRemoteUpdatedAt = existingState?.lastKnownRemoteUpdatedAt;

  if (
    localTrip &&
    lastKnownRemoteUpdatedAt &&
    localTrip.updatedAt > lastKnownRemoteUpdatedAt &&
    packet.data.trip.updatedAt > lastKnownRemoteUpdatedAt &&
    localTrip.updatedAt !== packet.data.trip.updatedAt
  ) {
    const conflict = buildConflict(packet, targetTripId, localTrip.updatedAt);
    next.syncConflicts = [conflict, ...next.syncConflicts];
    next.appPreferences = {
      ...next.appPreferences,
      syncStatus: 'conflict',
      updatedAt: now(),
    };
    next.sharedTripStates = next.sharedTripStates.map((state) =>
      state.tripId === targetTripId
        ? { ...state, syncStatus: 'conflict', updatedAt: now() }
        : state
    );
    return { mode: 'conflict' as const, snapshot: next, conflict };
  }

  const applied = replaceTripCollections(next, packet, targetTripId);
  applied.appPreferences = {
    ...applied.appPreferences,
    syncStatus: applied.appPreferences.syncEnabled ? 'ready' : applied.appPreferences.syncStatus,
    lastSyncAt: now(),
    updatedAt: now(),
  };
  applied.syncConflicts = applied.syncConflicts.filter((conflict) => conflict.tripId !== targetTripId || conflict.status !== 'open');
  return { mode: localTrip ? ('updated' as const) : ('created' as const), snapshot: applied, tripId: targetTripId };
}

export function resolveConflict(snapshot: AppDataSnapshot, conflictId: string, resolution: ConflictStatus) {
  const conflict = snapshot.syncConflicts.find((item) => item.id === conflictId);
  if (!conflict) {
    throw new Error('Conflict not found.');
  }

  const timestamp = now();
  let next = cloneSnapshot(snapshot);

  if (resolution === 'resolved_use_incoming') {
    const packet = parseSharedTripPacket(conflict.incomingPayload);
    next = replaceTripCollections(next, packet, conflict.tripId);
  }

  next.syncConflicts = next.syncConflicts.map((item) =>
    item.id === conflictId ? { ...item, status: resolution, updatedAt: timestamp } : item
  );
  next.sharedTripStates = next.sharedTripStates.map((state) =>
    state.tripId === conflict.tripId
      ? {
          ...state,
          syncStatus: next.syncConflicts.some((item) => item.tripId === conflict.tripId && item.status === 'open')
            ? 'conflict'
            : 'ready',
          lastImportedAt: resolution === 'resolved_use_incoming' ? timestamp : state.lastImportedAt,
          lastKnownRemoteUpdatedAt:
            resolution === 'resolved_use_incoming' ? conflict.incomingUpdatedAt : state.lastKnownRemoteUpdatedAt,
          updatedAt: timestamp,
        }
      : state
  );
  next.appPreferences = {
    ...next.appPreferences,
    syncStatus: next.syncConflicts.some((item) => item.status === 'open') ? 'conflict' : next.appPreferences.syncEnabled ? 'ready' : 'local_only',
    updatedAt: timestamp,
  };
  return next;
}
