import { AppStateStatus } from 'react-native';

import Constants from 'expo-constants';
import { create } from 'zustand';

import { buildPackingTemplateItems, type PackingTemplateId } from '@/data/packingTemplates';
import { createDemoSnapshot } from '@/data/demo';
import { isNotificationProofBuildVersion, withNotificationProofTrip } from '@/data/notificationProofBuild';
import { PERSONAL_DOCUMENTS_LABEL, PERSONAL_DOCUMENTS_TRIP_ID, isPersonalDocumentsTripId } from '@/constants/vault';
import {
  clearAllData,
  deleteById,
  loadSnapshot,
  persistSnapshot,
  replaceAllData,
  upsertAppPreferences,
  upsertDocument,
  upsertEmergencyInfo,
  upsertHotelStay,
  upsertItineraryEvent,
  upsertPackingItem,
  upsertReminderSetting,
  upsertSavedVibe,
  upsertSharedTripState,
  upsertTravelSegment,
  upsertTraveller,
  upsertTrip,
  upsertTripInvite,
  upsertTripParticipant,
  upsertVibeCacheEntry,
} from '@/db/repositories';
import { exportEncryptedBackup, restoreEncryptedBackup } from '@/services/backup';
import { protectStoredFilesAtRest } from '@/services/documentProtection';
import { resolveDestinationImage } from '@/services/destinationImageService';
import { resolveHotelImage } from '@/services/hotelImageService';
import { queueNotificationRefresh } from '@/services/notifications';
import { exportTripPdf } from '@/services/pdfExport';
import { protectStructuredDataAtRest } from '@/services/structuredDataProtection';
import { exportSharedTripPacket, importSharedTripPacket, parseSharedTripPacket, resolveConflict } from '@/services/sync';
import {
  authenticateBiometrics,
  canUseBiometrics,
  clearUnlockLockout,
  clearSecurityConfig,
  createPinConfig,
  defaultSecurityConfig,
  getUnlockCooldownMs,
  loadSecurityConfig,
  persistSecurityConfig,
  registerFailedUnlock,
  verifyPin,
} from '@/utils/security';
import { defaultAppExpiryPreferences } from '@/utils/documentExpiry';
import { resolveDestinationType } from '@/utils/destinationImage';
import { createId } from '@/utils/ids';
import { clearMaterializedSecureFiles } from '@/utils/fileStorage';
import { loadOnboardingComplete, persistOnboardingComplete } from '@/utils/onboarding';
import { deriveOnboardingCompletionStatus } from '@/utils/onboardingState';
import { normalizeDestinationLabel } from '@/utils/trips';
import { filterVisibleTrips } from '@/utils/tripVisibility';
import { createShareCode, isLegacyShareCode } from '@/utils/shareCodes';
import type {
  AppDataSnapshot,
  ConflictStatus,
  DocumentDraft,
  EmergencyInfoDraft,
  HotelStayDraft,
  ItineraryEventDraft,
  PackingItemDraft,
  PdfExportOptions,
  ReminderSettingDraft,
  SavedVibeDraft,
  StoredSecurityConfig,
  TravelSegmentDraft,
  TravellerDraft,
  TripDraft,
  TripInviteDraft,
  TripParticipantDraft,
  VibeCacheEntryDraft,
} from '@/types/models';

const emptySnapshot: AppDataSnapshot = {
  trips: [],
  travellers: [],
  documents: [],
  packingItems: [],
  travelSegments: [],
  hotelStays: [],
  itineraryEvents: [],
  emergencyInfos: [],
  reminderSettings: [],
  savedVibes: [],
  vibeCacheEntries: [],
  appPreferences: {
    id: 'app',
    notificationsEnabled: false,
    ...defaultAppExpiryPreferences(),
    profileName: '',
    profilePhotoUri: null,
    syncEnabled: false,
    syncMode: 'manual_share',
    syncStatus: 'local_only',
    lastSyncAt: null,
    lastBackupAt: null,
    privacyMaskingMode: 'always',
    vibesIntroSeenAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  tripParticipants: [],
  tripInvites: [],
  sharedTripStates: [],
  syncConflicts: [],
};

type StoreState = {
  isBootstrapped: boolean;
  isBusy: boolean;
  bootError: string | null;
  isUnlocked: boolean;
  hasCompletedOnboarding: boolean;
  privacyOverlayVisible: boolean;
  activeTripId: string | null;
  lastInteractionAt: number;
  backgroundedAt: number | null;
  vaultUnlockedUntil: number | null;
  failedUnlockAttempts: number;
  unlockBlockedUntil: number | null;
  security: StoredSecurityConfig;
  data: AppDataSnapshot;
  bootstrap: () => Promise<void>;
  refreshData: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
  setActiveTrip: (tripId: string | null) => void;
  noteInteraction: () => void;
  enforceInactivityLock: () => void;
  handleAppStateChange: (state: AppStateStatus) => void;
  createPin: (
    pin: string,
    pinLength: number,
    options?: Partial<Pick<StoredSecurityConfig, 'biometricEnabled' | 'autoLockSeconds'>>
  ) => Promise<void>;
  unlockWithPin: (pin: string) => Promise<boolean>;
  confirmPin: (pin: string) => Promise<boolean>;
  unlockVaultWithPin: (pin: string) => Promise<boolean>;
  unlockWithBiometrics: (scope?: 'app' | 'vault') => Promise<boolean>;
  lockApp: () => void;
  unlockVault: (seconds?: number) => void;
  updateSecurityPreferences: (updates: Partial<Pick<StoredSecurityConfig, 'biometricEnabled' | 'autoLockSeconds'>>) => Promise<void>;
  saveAppPreferences: (updates: Partial<AppDataSnapshot['appPreferences']>) => Promise<void>;
  ensurePersonalDocumentsTrip: () => Promise<string>;
  saveTrip: (draft: TripDraft) => Promise<string>;
  saveTraveller: (draft: TravellerDraft) => Promise<string>;
  saveTripParticipant: (draft: TripParticipantDraft) => Promise<string>;
  saveTripInvite: (draft: TripInviteDraft) => Promise<string>;
  saveDocument: (draft: DocumentDraft) => Promise<string>;
  savePackingItem: (draft: PackingItemDraft) => Promise<string>;
  duplicatePackingItem: (itemId: string) => Promise<void>;
  applyPackingTemplate: (tripId: string, templateId: PackingTemplateId) => Promise<void>;
  saveTravelSegment: (draft: TravelSegmentDraft) => Promise<string>;
  saveHotelStay: (draft: HotelStayDraft) => Promise<string>;
  saveItineraryEvent: (draft: ItineraryEventDraft) => Promise<string>;
  saveEmergencyInfo: (draft: EmergencyInfoDraft) => Promise<string>;
  saveReminderSetting: (draft: ReminderSettingDraft) => Promise<string>;
  saveSavedVibe: (draft: SavedVibeDraft) => Promise<string>;
  saveVibeCacheEntry: (draft: VibeCacheEntryDraft) => Promise<string>;
  exportTripPdfFile: (tripId: string, options: PdfExportOptions) => Promise<string>;
  exportBackupFile: (password: string) => Promise<{ uri: string; exportedAt: string; attachmentCount: number; skippedAttachmentCount: number }>;
  importBackupFile: (encryptedContents: string, password: string) => Promise<void>;
  exportSharedTripFile: (tripId: string) => Promise<string>;
  importSharedTripFile: (contents: string) => Promise<{ mode: 'created' | 'updated' | 'conflict'; tripId?: string }>;
  resolveSyncConflictChoice: (conflictId: string, resolution: ConflictStatus) => Promise<void>;
  deleteRecord: (table: string, id: string) => Promise<void>;
  resetWithDemoData: () => Promise<void>;
};

function nextActiveTripId(state: StoreState, snapshot: AppDataSnapshot) {
  if (
    state.activeTripId &&
    (isPersonalDocumentsTripId(state.activeTripId) || snapshot.trips.some((trip) => trip.id === state.activeTripId && !isPersonalDocumentsTripId(trip.id)))
  ) {
    return state.activeTripId;
  }

  return filterVisibleTrips(snapshot.trips)[0]?.id ?? null;
}

function logStoreError(context: string, error: unknown) {
  if (__DEV__) {
    console.error(context, error);
  }
}

function runtimeAppVersion() {
  return Constants.expoConfig?.version ?? Constants.nativeAppVersion ?? null;
}

function prepareSnapshotForCurrentBuild(snapshot: AppDataSnapshot) {
  if (!isNotificationProofBuildVersion(runtimeAppVersion())) {
    return { snapshot, changed: false };
  }

  return withNotificationProofTrip(snapshot, new Date());
}

function destinationNeedsHeroRefresh(
  current: TripDraft,
  previous?:
    | {
        destination: string;
        coverImageUri: string | null;
        destinationImageLocalPath?: string | null;
      }
    | null
) {
  const nextDestination = normalizeDestinationLabel(current.destination);
  const previousDestination = normalizeDestinationLabel(previous?.destination ?? '');
  return nextDestination !== previousDestination || !(previous?.destinationImageLocalPath ?? previous?.coverImageUri);
}

function rotateLegacyShareCodes(snapshot: AppDataSnapshot) {
  const shareCodeByTrip = new Map<string, string>();
  let changed = false;
  const timestamp = new Date().toISOString();

  const nextSharedTripStates = snapshot.sharedTripStates.map((state) => {
    const nextShareCode = isLegacyShareCode(state.shareCode) ? createShareCode() : state.shareCode;
    shareCodeByTrip.set(state.tripId, nextShareCode);
    if (nextShareCode !== state.shareCode) {
      changed = true;
      return { ...state, shareCode: nextShareCode, updatedAt: timestamp };
    }
    return state;
  });

  const nextTripParticipants = snapshot.tripParticipants.map((participant) => {
    const mappedShareCode = shareCodeByTrip.get(participant.tripId) ?? createShareCode();
    shareCodeByTrip.set(participant.tripId, mappedShareCode);
    if (!isLegacyShareCode(participant.inviteCode)) {
      return participant;
    }

    changed = true;
    return { ...participant, inviteCode: mappedShareCode, updatedAt: timestamp };
  });

  const nextTripInvites = snapshot.tripInvites.map((invite) => {
    const mappedShareCode = shareCodeByTrip.get(invite.tripId) ?? createShareCode();
    shareCodeByTrip.set(invite.tripId, mappedShareCode);
    if (!isLegacyShareCode(invite.inviteCode)) {
      return invite;
    }

    changed = true;
    return { ...invite, inviteCode: mappedShareCode, updatedAt: timestamp };
  });

  const nextSyncConflicts = snapshot.syncConflicts.map((conflict) => {
    const mappedShareCode = shareCodeByTrip.get(conflict.tripId);
    if (!mappedShareCode || !isLegacyShareCode(conflict.shareCode)) {
      return conflict;
    }

    changed = true;
    return { ...conflict, shareCode: mappedShareCode, updatedAt: timestamp };
  });

  if (!changed) {
    return { snapshot, changed: false };
  }

  return {
    changed: true,
    snapshot: {
      ...snapshot,
      sharedTripStates: nextSharedTripStates,
      tripParticipants: nextTripParticipants,
      tripInvites: nextTripInvites,
      syncConflicts: nextSyncConflicts,
    },
  };
}

export const useAppStore = create<StoreState>((set, get) => ({
  isBootstrapped: false,
  isBusy: false,
  bootError: null,
  isUnlocked: false,
  hasCompletedOnboarding: false,
  privacyOverlayVisible: false,
  activeTripId: null,
  lastInteractionAt: Date.now(),
  backgroundedAt: null,
  vaultUnlockedUntil: null,
  failedUnlockAttempts: 0,
  unlockBlockedUntil: null,
  security: defaultSecurityConfig,
  data: emptySnapshot,
  bootstrap: async () => {
    if (get().isBootstrapped || get().isBusy) {
      return;
    }

    set({ isBusy: true, bootError: null });
    try {
      await clearMaterializedSecureFiles();
      const [loadedSecurity, initialData, onboardingStatus] = await Promise.all([
        loadSecurityConfig(),
        loadSnapshot(),
        loadOnboardingComplete(),
      ]);
      let data = initialData;
      const security = loadedSecurity;

      const protectionResult = await protectStoredFilesAtRest(data);
      data = protectionResult.snapshot;
      const structuredProtectionResult = await protectStructuredDataAtRest(data);
      data = structuredProtectionResult.snapshot;
      const shareCodeRotationResult = rotateLegacyShareCodes(data);
      if (shareCodeRotationResult.changed) {
        data = shareCodeRotationResult.snapshot;
        await replaceAllData(data);
      }
      const proofBuildResult = prepareSnapshotForCurrentBuild(data);
      if (proofBuildResult.changed) {
        data = proofBuildResult.snapshot;
        await replaceAllData(data);
      }

      const visibleTrips = filterVisibleTrips(data.trips);
      const hasCompletedOnboarding = deriveOnboardingCompletionStatus(onboardingStatus, {
        pinConfigured: security.pinConfigured,
        tripCount: visibleTrips.length,
      });
      if (onboardingStatus === null && hasCompletedOnboarding) {
        await persistOnboardingComplete(true);
      }
      set({
        security,
        data,
        hasCompletedOnboarding,
        activeTripId: visibleTrips[0]?.id ?? null,
        isUnlocked: false,
        isBootstrapped: true,
        isBusy: false,
        bootError: null,
        lastInteractionAt: Date.now(),
        failedUnlockAttempts: security.failedUnlockAttempts,
        unlockBlockedUntil: security.unlockBlockedUntil,
      });
      if (__DEV__) {
        console.log('[auth] bootstrap complete', {
          pinConfigured: security.pinConfigured,
          tripCount: visibleTrips.length,
          hasCompletedOnboarding,
        });
      }
      if (!security.pinConfigured) {
        queueNotificationRefresh(data, { requestPermissions: false, delayMs: 300 });
      }
    } catch (error) {
      logStoreError('bootstrap failed', error);
      set({
        isBusy: false,
        isBootstrapped: false,
        bootError: 'Pineapple could not finish loading local data. Try again in a moment.',
      });
    }
  },
  refreshData: async () => {
    const snapshot = await loadSnapshot();
    set((state) => ({
      data: snapshot,
      activeTripId: nextActiveTripId(state, snapshot),
    }));
    queueNotificationRefresh(snapshot, { requestPermissions: false });
  },
  completeOnboarding: async () => {
    await persistOnboardingComplete(true);
    set({ hasCompletedOnboarding: true });
  },
  setActiveTrip: (tripId) => set({ activeTripId: tripId }),
  noteInteraction: () => set({ lastInteractionAt: Date.now() }),
  enforceInactivityLock: () => {
    const state = get();
    if (!state.security.pinConfigured || !state.isUnlocked) {
      return;
    }

    if (Date.now() - state.lastInteractionAt > state.security.autoLockSeconds * 1000) {
      set({ isUnlocked: false, vaultUnlockedUntil: null, privacyOverlayVisible: true });
      clearMaterializedSecureFiles().catch(() => undefined);
    }
  },
  handleAppStateChange: (state) => {
    if (state === 'inactive' || state === 'background') {
      set({ privacyOverlayVisible: true, backgroundedAt: Date.now() });
      clearMaterializedSecureFiles().catch(() => undefined);
      return;
    }

    if (state === 'active') {
      const current = get();
      const shouldLock =
        current.security.pinConfigured &&
        current.backgroundedAt !== null &&
        Date.now() - current.backgroundedAt > current.security.autoLockSeconds * 1000;

      set({
        backgroundedAt: null,
        privacyOverlayVisible: shouldLock ? true : false,
        isUnlocked: shouldLock ? false : current.isUnlocked,
        vaultUnlockedUntil: shouldLock ? null : current.vaultUnlockedUntil,
        lastInteractionAt: Date.now(),
      });
    }
  },
  createPin: async (pin, pinLength, options) => {
    if (pin.length < 4) {
      throw new Error('PIN must be at least 4 digits long.');
    }

    try {
      const security = { ...(await createPinConfig(pin, pinLength)), ...options };
      await persistSecurityConfig(security);
      set({
        security,
        isUnlocked: true,
        privacyOverlayVisible: false,
        lastInteractionAt: Date.now(),
        failedUnlockAttempts: 0,
        unlockBlockedUntil: null,
      });
      queueNotificationRefresh(get().data, { requestPermissions: false, delayMs: 900 });
      if (__DEV__) {
        console.log('[auth] pin created', {
          pinLength,
          biometricEnabled: security.biometricEnabled,
        });
      }
    } catch (error) {
      logStoreError('createPin failed', error);
      throw error;
    }
  },
  unlockWithPin: async (pin) => {
    const state = get();
    if (state.unlockBlockedUntil && state.unlockBlockedUntil > Date.now()) {
      return false;
    }

    try {
      const valid = await verifyPin(pin, state.security);
      if (valid) {
        let nextSecurity = clearUnlockLockout(state.security);
        if (state.security.hashVersion !== 4) {
          nextSecurity = {
            ...(await createPinConfig(pin, state.security.pinLength)),
            biometricEnabled: state.security.biometricEnabled,
            autoLockSeconds: state.security.autoLockSeconds,
          };
        }
        await persistSecurityConfig(nextSecurity);
        set({
          security: nextSecurity,
          isUnlocked: true,
          privacyOverlayVisible: false,
          lastInteractionAt: Date.now(),
          failedUnlockAttempts: 0,
          unlockBlockedUntil: null,
        });
        queueNotificationRefresh(get().data, { requestPermissions: false, delayMs: 900 });
        if (__DEV__) {
          console.log('[auth] pin unlock success');
        }
      } else {
        const nextSecurity = registerFailedUnlock(state.security);
        await persistSecurityConfig(nextSecurity);
        const cooldownMs =
          nextSecurity.unlockBlockedUntil && nextSecurity.unlockBlockedUntil > Date.now()
            ? nextSecurity.unlockBlockedUntil - Date.now()
            : 0;
        set({
          security: nextSecurity,
          failedUnlockAttempts: nextSecurity.failedUnlockAttempts,
          unlockBlockedUntil: nextSecurity.unlockBlockedUntil,
        });
        if (__DEV__) {
          console.log('[auth] pin unlock rejected', {
            failedUnlockAttempts: nextSecurity.failedUnlockAttempts,
            cooldownMs,
          });
        }
      }
      return valid;
    } catch (error) {
      logStoreError('unlockWithPin failed', error);
      throw error;
    }
  },
  confirmPin: async (pin) => verifyPin(pin, get().security),
  unlockVaultWithPin: async (pin) => {
    const unlocked = await get().unlockWithPin(pin);
    if (unlocked) {
      get().unlockVault();
    }
    return unlocked;
  },
  unlockWithBiometrics: async (scope = 'app') => {
    try {
      const enabled = await canUseBiometrics();
      if (!enabled) {
        return false;
      }

      const result = await authenticateBiometrics();
      if (!result.success) {
        return false;
      }

      if (scope === 'vault') {
        get().unlockVault();
      } else {
        const nextSecurity = clearUnlockLockout(get().security);
        await persistSecurityConfig(nextSecurity);
        set({
          security: nextSecurity,
          isUnlocked: true,
          privacyOverlayVisible: false,
          lastInteractionAt: Date.now(),
          failedUnlockAttempts: 0,
          unlockBlockedUntil: null,
        });
        queueNotificationRefresh(get().data, { requestPermissions: false, delayMs: 900 });
        if (__DEV__) {
          console.log('[auth] biometric unlock success');
        }
      }

      return true;
    } catch (error) {
      logStoreError('unlockWithBiometrics failed', error);
      return false;
    }
  },
  lockApp: () => {
    clearMaterializedSecureFiles().catch(() => undefined);
    set({
      isUnlocked: false,
      vaultUnlockedUntil: null,
      privacyOverlayVisible: true,
    });
  },
  unlockVault: (seconds = 180) => set({ vaultUnlockedUntil: Date.now() + seconds * 1000 }),
  updateSecurityPreferences: async (updates) => {
    const next = { ...get().security, ...updates };
    await persistSecurityConfig(next);
    set({ security: next });
  },
  saveAppPreferences: async (updates) => {
    const current = get().data.appPreferences;
    await upsertAppPreferences({
      ...current,
      ...updates,
      id: 'app',
    });
    await get().refreshData();
  },
  ensurePersonalDocumentsTrip: async () => {
    const existing = get().data.trips.find((trip) => trip.id === PERSONAL_DOCUMENTS_TRIP_ID);
    if (existing) {
      return existing.id;
    }

    const now = new Date().toISOString();
    await upsertTrip({
      id: PERSONAL_DOCUMENTS_TRIP_ID,
      name: PERSONAL_DOCUMENTS_LABEL,
      destination: PERSONAL_DOCUMENTS_LABEL,
      destinationType: 'unknown',
      startDate: now,
      endDate: now,
      destinationImageLocalPath: null,
      destinationImageRemoteUrl: null,
      destinationImageSource: 'fallback',
      attributionText: 'Default Pineapple image',
      attributionMeta: { source: 'fallback', sourceLabel: 'Default Pineapple image' },
      coverImageUri: null,
      heroImageRemoteUrl: null,
      heroImageStatus: 'idle',
      notes: '',
      transferSummary: '',
      transferProvider: '',
      transferMethod: '',
      transferLocation: '',
      transferTime: null,
      airportTravelDurationMinutes: null,
      transferNotes: '',
      status: 'completed',
    });
    await get().refreshData();
    return PERSONAL_DOCUMENTS_TRIP_ID;
  },
  saveTrip: async (draft) => {
    const existingTrip = draft.id ? get().data.trips.find((trip) => trip.id === draft.id) ?? null : null;
    const normalizedDestination = normalizeDestinationLabel(draft.destination);
    const normalizedName = draft.name.trim() || normalizedDestination || existingTrip?.name || 'Trip';
    const nextDestinationType = resolveDestinationType(draft.destination);
    const shouldRefreshHero = destinationNeedsHeroRefresh(draft, existingTrip);
    const preservedLocalPath =
      draft.destinationImageLocalPath ??
      draft.coverImageUri ??
      existingTrip?.destinationImageLocalPath ??
      existingTrip?.coverImageUri ??
      null;
    const preservedRemoteUrl =
      draft.destinationImageRemoteUrl ??
      draft.heroImageRemoteUrl ??
      existingTrip?.destinationImageRemoteUrl ??
      existingTrip?.heroImageRemoteUrl ??
      null;
    const preservedAttribution =
      draft.attributionMeta ?? existingTrip?.attributionMeta ?? { source: 'fallback' as const, sourceLabel: 'Default Pineapple image' };
    const preservedAttributionText = draft.attributionText ?? existingTrip?.attributionText ?? 'Default Pineapple image';
    const preparedDraft: TripDraft = {
      ...draft,
      name: normalizedName,
      destination: normalizedDestination,
      destinationType: nextDestinationType,
      destinationImageLocalPath: shouldRefreshHero ? null : preservedLocalPath,
      destinationImageRemoteUrl: shouldRefreshHero ? null : preservedRemoteUrl,
      destinationImageSource: shouldRefreshHero ? 'fallback' : draft.destinationImageSource ?? existingTrip?.destinationImageSource ?? 'fallback',
      attributionText: shouldRefreshHero ? 'Default Pineapple image' : preservedAttributionText,
      attributionMeta: shouldRefreshHero ? { source: 'fallback', sourceLabel: 'Default Pineapple image' } : preservedAttribution,
      heroImageRemoteUrl: shouldRefreshHero ? null : preservedRemoteUrl,
      heroImageStatus: shouldRefreshHero ? 'loading' : draft.heroImageStatus ?? existingTrip?.heroImageStatus ?? 'idle',
      coverImageUri: shouldRefreshHero ? null : preservedLocalPath,
      transferSummary: draft.transferSummary ?? existingTrip?.transferSummary ?? '',
      transferProvider: draft.transferProvider ?? existingTrip?.transferProvider ?? '',
      transferMethod: draft.transferMethod ?? existingTrip?.transferMethod ?? '',
      transferLocation: draft.transferLocation ?? existingTrip?.transferLocation ?? '',
      transferTime: draft.transferTime ?? existingTrip?.transferTime ?? null,
      airportTravelDurationMinutes: draft.airportTravelDurationMinutes ?? existingTrip?.airportTravelDurationMinutes ?? null,
      transferNotes: draft.transferNotes ?? existingTrip?.transferNotes ?? '',
    };

    const id = await upsertTrip(preparedDraft);
    await get().refreshData();
    set({ activeTripId: id });

    if (shouldRefreshHero) {
      void (async () => {
        const resolved = await resolveDestinationImage(normalizedDestination, id);
        const latestTrip = get().data.trips.find((trip) => trip.id === id);
        if (!latestTrip || normalizeDestinationLabel(latestTrip.destination) !== normalizedDestination) {
          return;
        }

        await upsertTrip({
          ...latestTrip,
          destinationType: resolved.destinationType,
          destinationImageLocalPath: resolved.localPath,
          destinationImageRemoteUrl: resolved.remoteUrl,
          destinationImageSource: resolved.source,
          attributionText: resolved.attributionText,
          attributionMeta: resolved.attribution,
          heroImageRemoteUrl: resolved.remoteUrl,
          heroImageStatus: resolved.heroImageStatus,
          coverImageUri: resolved.localPath,
        });
        await get().refreshData();
      })().catch((error) => {
        logStoreError('resolveDestinationImage failed', error);
      });
    }

    return id;
  },
  saveTraveller: async (draft) => {
    const id = await upsertTraveller(draft);
    await get().refreshData();
    return id;
  },
  saveTripParticipant: async (draft) => {
    const id = await upsertTripParticipant(draft);
    await get().refreshData();
    return id;
  },
  saveTripInvite: async (draft) => {
    const id = await upsertTripInvite(draft);
    await get().refreshData();
    return id;
  },
  saveDocument: async (draft) => {
    const id = await upsertDocument(draft);
    await get().refreshData();
    return id;
  },
  savePackingItem: async (draft) => {
    const id = await upsertPackingItem(draft);
    await get().refreshData();
    return id;
  },
  duplicatePackingItem: async (itemId) => {
    const item = get().data.packingItems.find((current) => current.id === itemId);
    if (!item) return;
    await upsertPackingItem({
      ...item,
      id: undefined,
      title: `${item.title} copy`,
    });
    await get().refreshData();
  },
  applyPackingTemplate: async (tripId, templateId) => {
    const items = buildPackingTemplateItems(tripId, templateId);
    for (const item of items) {
      await upsertPackingItem(item);
    }
    await get().refreshData();
  },
  saveTravelSegment: async (draft) => {
    const id = await upsertTravelSegment({
      ...draft,
      transportType: draft.transportType ?? 'flight',
      travelDirection: draft.travelDirection ?? 'other',
      providerCode: draft.providerCode ?? '',
      providerLogoUrl: draft.providerLogoUrl ?? null,
      departureAirportCode: draft.departureAirportCode ?? '',
      arrivalAirportCode: draft.arrivalAirportCode ?? '',
    });
    await get().refreshData();
    return id;
  },
  saveHotelStay: async (draft) => {
    const existingHotel = draft.id ? get().data.hotelStays.find((hotel) => hotel.id === draft.id) ?? null : null;
    const id = draft.id ?? createId('hotel');
    const fallbackAttribution = { source: 'fallback' as const, sourceLabel: 'Default hotel background' };
    const preparedDraft = {
      ...draft,
      id,
      city: draft.city ?? existingHotel?.city ?? '',
      country: draft.country ?? existingHotel?.country ?? '',
      latitude: draft.latitude ?? existingHotel?.latitude ?? null,
      longitude: draft.longitude ?? existingHotel?.longitude ?? null,
      hotelImageLocalPath: existingHotel?.hotelImageLocalPath ?? draft.hotelImageLocalPath ?? null,
      hotelImageRemoteUrl: existingHotel?.hotelImageRemoteUrl ?? draft.hotelImageRemoteUrl ?? null,
      hotelImageSource: existingHotel?.hotelImageSource ?? draft.hotelImageSource ?? 'fallback',
      hotelImageAttributionText: existingHotel?.hotelImageAttributionText ?? draft.hotelImageAttributionText ?? 'Default hotel background',
      hotelImageAttributionMeta: existingHotel?.hotelImageAttributionMeta ?? draft.hotelImageAttributionMeta ?? fallbackAttribution,
      hotelImageStatus: existingHotel ? 'loading' : draft.hotelImageStatus ?? 'loading',
    };
    const imageInputsChanged =
      !existingHotel ||
      existingHotel.hotelName.trim() !== preparedDraft.hotelName.trim() ||
      existingHotel.address.trim() !== preparedDraft.address.trim();

    await upsertHotelStay(
      imageInputsChanged
        ? preparedDraft
        : {
            ...preparedDraft,
            hotelImageLocalPath: existingHotel.hotelImageLocalPath,
            hotelImageRemoteUrl: existingHotel.hotelImageRemoteUrl,
            hotelImageSource: existingHotel.hotelImageSource,
            hotelImageAttributionText: existingHotel.hotelImageAttributionText,
            hotelImageAttributionMeta: existingHotel.hotelImageAttributionMeta,
            hotelImageStatus: existingHotel.hotelImageStatus,
          }
    );
    await get().refreshData();

    if (imageInputsChanged) {
      void (async () => {
        const resolved = await resolveHotelImage(preparedDraft, id);
        const latestHotel = get().data.hotelStays.find((hotel) => hotel.id === id);
        if (
          !latestHotel ||
          latestHotel.hotelName.trim() !== preparedDraft.hotelName.trim() ||
          latestHotel.address.trim() !== preparedDraft.address.trim()
        ) {
          return;
        }

        await upsertHotelStay({
          ...latestHotel,
          hotelImageLocalPath: resolved.localPath,
          hotelImageRemoteUrl: resolved.remoteUrl,
          hotelImageSource: resolved.source,
          hotelImageAttributionText: resolved.attributionText,
          hotelImageAttributionMeta: resolved.attribution,
          hotelImageStatus: resolved.status,
        });
        await get().refreshData();
      })().catch((error) => {
        logStoreError('resolveHotelImage failed', error);
      });
    }

    return id;
  },
  saveItineraryEvent: async (draft) => {
    const id = await upsertItineraryEvent(draft);
    await get().refreshData();
    return id;
  },
  saveEmergencyInfo: async (draft) => {
    const id = await upsertEmergencyInfo(draft);
    await get().refreshData();
    return id;
  },
  saveReminderSetting: async (draft) => {
    const id = await upsertReminderSetting(draft);
    await get().refreshData();
    return id;
  },
  saveSavedVibe: async (draft) => {
    const id = await upsertSavedVibe(draft);
    await get().refreshData();
    return id;
  },
  saveVibeCacheEntry: async (draft) => {
    const id = await upsertVibeCacheEntry(draft);
    await get().refreshData();
    return id;
  },
  exportTripPdfFile: async (tripId, options) => {
    return exportTripPdf(get().data, tripId, options);
  },
  exportBackupFile: async (password) => {
    const result = await exportEncryptedBackup({ data: get().data, security: get().security, password });
    await upsertAppPreferences({
      ...get().data.appPreferences,
      lastBackupAt: result.exportedAt,
    });
    await get().refreshData();
    return result;
  },
  importBackupFile: async (encryptedContents, password) => {
    const restoredSettings = await restoreEncryptedBackup({ encryptedContents, password });
    const nextSecurity = clearUnlockLockout({
      ...get().security,
      autoLockSeconds: restoredSettings.autoLockSeconds,
    });
    await persistSecurityConfig(nextSecurity);
    await clearMaterializedSecureFiles();
    await get().refreshData();
    set({
      security: nextSecurity,
      isUnlocked: false,
      privacyOverlayVisible: true,
      vaultUnlockedUntil: null,
      failedUnlockAttempts: 0,
      unlockBlockedUntil: null,
      lastInteractionAt: Date.now(),
    });
  },
  exportSharedTripFile: async (tripId) => {
    const { uri, packet } = await exportSharedTripPacket(get().data, tripId);
    const currentState = get().data.sharedTripStates.find((item) => item.tripId === tripId);
    await upsertSharedTripState({
      tripId,
      shareCode: currentState?.shareCode ?? packet.shareCode,
      syncEnabled: get().data.appPreferences.syncEnabled,
      syncStatus: get().data.appPreferences.syncEnabled ? 'pending_import' : 'local_only',
      lastSyncAt: get().data.appPreferences.syncEnabled ? new Date().toISOString() : currentState?.lastSyncAt ?? null,
      lastExportedAt: new Date().toISOString(),
      lastImportedAt: currentState?.lastImportedAt ?? null,
      lastKnownRemoteUpdatedAt: currentState?.lastKnownRemoteUpdatedAt ?? null,
    });
    await get().refreshData();
    return uri;
  },
  importSharedTripFile: async (contents) => {
    const packet = parseSharedTripPacket(contents);
    const result = importSharedTripPacket(get().data, packet);
    await replaceAllData(result.snapshot);
    await get().refreshData();
    return {
      mode: result.mode,
      tripId: 'tripId' in result ? result.tripId : undefined,
    };
  },
  resolveSyncConflictChoice: async (conflictId, resolution) => {
    const nextSnapshot = resolveConflict(get().data, conflictId, resolution);
    await replaceAllData(nextSnapshot);
    await get().refreshData();
  },
  deleteRecord: async (table, id) => {
    await deleteById(table, id);
    await get().refreshData();
  },
  resetWithDemoData: async () => {
    await clearAllData();
    const demoSnapshot = prepareSnapshotForCurrentBuild(createDemoSnapshot()).snapshot;
    await persistSnapshot(demoSnapshot);
    await get().refreshData();
  },
}));
