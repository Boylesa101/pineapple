import { AppStateStatus } from 'react-native';
import Constants from 'expo-constants';

import { create } from 'zustand';

import { buildPackingTemplateItems, type PackingTemplateId } from '@/data/packingTemplates';
import { createDemoSnapshot } from '@/data/demo';
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
  upsertSharedTripState,
  upsertTravelSegment,
  upsertTraveller,
  upsertTrip,
  upsertTripInvite,
  upsertTripParticipant,
} from '@/db/repositories';
import { exportEncryptedBackup, restoreEncryptedBackup } from '@/services/backup';
import { protectStoredFilesAtRest } from '@/services/documentProtection';
import { resolveTripHeroImage } from '@/services/destinationImageService';
import { queueNotificationRefresh } from '@/services/notifications';
import { exportTripPdf } from '@/services/pdfExport';
import { protectStructuredDataAtRest } from '@/services/structuredDataProtection';
import { exportSharedTripPacket, importSharedTripPacket, parseSharedTripPacket, resolveConflict } from '@/services/sync';
import {
  authenticateBiometrics,
  canUseBiometrics,
  clearSecurityConfig,
  createPinConfig,
  defaultSecurityConfig,
  loadSecurityConfig,
  persistSecurityConfig,
  verifyPin,
} from '@/utils/security';
import { defaultAppExpiryPreferences } from '@/utils/documentExpiry';
import { resolveDestinationType } from '@/utils/destinationImage';
import { clearMaterializedSecureFiles } from '@/utils/fileStorage';
import { loadOnboardingComplete, persistOnboardingComplete } from '@/utils/onboarding';
import { deriveOnboardingCompletionStatus } from '@/utils/onboardingState';
import { normalizeDestinationLabel } from '@/utils/trips';
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
  StoredSecurityConfig,
  TravelSegmentDraft,
  TravellerDraft,
  TripDraft,
  TripInviteDraft,
  TripParticipantDraft,
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
  appPreferences: {
    id: 'app',
    notificationsEnabled: false,
    ...defaultAppExpiryPreferences(),
    syncEnabled: false,
    syncMode: 'manual_share',
    syncStatus: 'local_only',
    lastSyncAt: null,
    lastBackupAt: null,
    privacyMaskingMode: 'always',
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
  unlockWithBiometrics: (scope?: 'app' | 'vault') => Promise<boolean>;
  lockApp: () => void;
  unlockVault: (seconds?: number) => void;
  updateSecurityPreferences: (updates: Partial<Pick<StoredSecurityConfig, 'biometricEnabled' | 'autoLockSeconds'>>) => Promise<void>;
  saveAppPreferences: (updates: Partial<AppDataSnapshot['appPreferences']>) => Promise<void>;
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
  if (state.activeTripId && snapshot.trips.some((trip) => trip.id === state.activeTripId)) {
    return state.activeTripId;
  }

  return snapshot.trips[0]?.id ?? null;
}

function logStoreError(context: string, error: unknown) {
  if (__DEV__) {
    console.error(context, error);
  }
}

function destinationNeedsHeroRefresh(current: TripDraft, previous?: { destination: string; coverImageUri: string | null } | null) {
  const nextDestination = normalizeDestinationLabel(current.destination);
  const previousDestination = normalizeDestinationLabel(previous?.destination ?? '');
  return nextDestination !== previousDestination || !previous?.coverImageUri;
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
      let security = loadedSecurity;
      const shouldResetStaleExpoGoPin =
        Boolean(Constants.expoGoConfig) &&
        onboardingStatus === null &&
        initialData.trips.length === 0 &&
        loadedSecurity.pinConfigured;

      if (shouldResetStaleExpoGoPin) {
        await clearSecurityConfig();
        security = defaultSecurityConfig;
      }

      const protectionResult = await protectStoredFilesAtRest(data);
      data = protectionResult.snapshot;
      const structuredProtectionResult = await protectStructuredDataAtRest(data);
      data = structuredProtectionResult.snapshot;

      const hasCompletedOnboarding = deriveOnboardingCompletionStatus(onboardingStatus, {
        pinConfigured: security.pinConfigured,
        tripCount: data.trips.length,
      });
      if (onboardingStatus === null && hasCompletedOnboarding) {
        await persistOnboardingComplete(true);
      }
      set({
        security,
        data,
        hasCompletedOnboarding,
        activeTripId: data.trips[0]?.id ?? null,
        isUnlocked: false,
        isBootstrapped: true,
        isBusy: false,
        bootError: null,
        lastInteractionAt: Date.now(),
      });
      if (__DEV__) {
        console.log('[auth] bootstrap complete', {
          pinConfigured: security.pinConfigured,
          tripCount: data.trips.length,
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
        set({
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
        const failedUnlockAttempts = state.failedUnlockAttempts + 1;
        const shouldBlock = failedUnlockAttempts >= 5;
        set({
          failedUnlockAttempts,
          unlockBlockedUntil: shouldBlock ? Date.now() + 30_000 : null,
        });
        if (__DEV__) {
          console.log('[auth] pin unlock rejected', {
            failedUnlockAttempts,
            blocked: shouldBlock,
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
        set({
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
  saveTrip: async (draft) => {
    const existingTrip = draft.id ? get().data.trips.find((trip) => trip.id === draft.id) ?? null : null;
    const nextDestinationType = resolveDestinationType(draft.destination);
    const shouldRefreshHero = destinationNeedsHeroRefresh(draft, existingTrip);
    const preparedDraft: TripDraft = {
      ...draft,
      destinationType: nextDestinationType,
      heroImageRemoteUrl: shouldRefreshHero ? null : draft.heroImageRemoteUrl ?? existingTrip?.heroImageRemoteUrl ?? null,
      heroImageStatus: shouldRefreshHero ? 'loading' : draft.heroImageStatus ?? existingTrip?.heroImageStatus ?? 'idle',
      coverImageUri: shouldRefreshHero ? null : draft.coverImageUri ?? existingTrip?.coverImageUri ?? null,
      transferSummary: draft.transferSummary ?? existingTrip?.transferSummary ?? '',
    };

    const id = await upsertTrip(preparedDraft);
    await get().refreshData();
    set({ activeTripId: id });

    if (shouldRefreshHero) {
      void (async () => {
        const resolved = await resolveTripHeroImage(draft.destination);
        const latestTrip = get().data.trips.find((trip) => trip.id === id);
        if (!latestTrip || normalizeDestinationLabel(latestTrip.destination) !== normalizeDestinationLabel(draft.destination)) {
          return;
        }

        await upsertTrip({
          ...latestTrip,
          destinationType: resolved.destinationType,
          heroImageRemoteUrl: resolved.heroImageRemoteUrl,
          heroImageStatus: resolved.heroImageStatus,
          coverImageUri: resolved.coverImageUri,
        });
        await get().refreshData();
      })().catch((error) => {
        logStoreError('resolveTripHeroImage failed', error);
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
    const id = await upsertTravelSegment(draft);
    await get().refreshData();
    return id;
  },
  saveHotelStay: async (draft) => {
    const id = await upsertHotelStay(draft);
    await get().refreshData();
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
    const nextSecurity = { ...get().security, autoLockSeconds: restoredSettings.autoLockSeconds };
    await persistSecurityConfig(nextSecurity);
    await get().refreshData();
    set({ security: nextSecurity });
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
    await persistSnapshot(createDemoSnapshot());
    await get().refreshData();
  },
}));
