import { AppStateStatus } from 'react-native';

import { create } from 'zustand';

import { clearAllData, deleteById, loadSnapshot, upsertDocument, upsertEmergencyInfo, upsertHotelStay, upsertItineraryEvent, upsertPackingItem, upsertTravelSegment, upsertTraveller, upsertTrip } from '@/db/repositories';
import { createDemoSnapshot } from '@/data/demo';
import { ensureAppDirectories } from '@/utils/fileStorage';
import { createPinConfig, defaultSecurityConfig, authenticateBiometrics, canUseBiometrics, loadSecurityConfig, persistSecurityConfig, verifyPin } from '@/utils/security';
import type {
  AppDataSnapshot,
  DocumentDraft,
  EmergencyInfoDraft,
  HotelStayDraft,
  ItineraryEventDraft,
  PackingItemDraft,
  StoredSecurityConfig,
  TravelSegmentDraft,
  TravellerDraft,
  TripDraft,
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
};

type StoreState = {
  isBootstrapped: boolean;
  isBusy: boolean;
  isUnlocked: boolean;
  privacyOverlayVisible: boolean;
  activeTripId: string | null;
  lastInteractionAt: number;
  backgroundedAt: number | null;
  vaultUnlockedUntil: number | null;
  security: StoredSecurityConfig;
  data: AppDataSnapshot;
  bootstrap: () => Promise<void>;
  refreshData: () => Promise<void>;
  setActiveTrip: (tripId: string | null) => void;
  noteInteraction: () => void;
  enforceInactivityLock: () => void;
  handleAppStateChange: (state: AppStateStatus) => void;
  createPin: (pin: string, pinLength: 4 | 6) => Promise<void>;
  unlockWithPin: (pin: string) => Promise<boolean>;
  confirmPin: (pin: string) => Promise<boolean>;
  unlockWithBiometrics: (scope?: 'app' | 'vault') => Promise<boolean>;
  lockApp: () => void;
  unlockVault: (seconds?: number) => void;
  updateSecurityPreferences: (updates: Partial<Pick<StoredSecurityConfig, 'biometricEnabled' | 'autoLockSeconds'>>) => Promise<void>;
  saveTrip: (draft: TripDraft) => Promise<string>;
  saveTraveller: (draft: TravellerDraft) => Promise<string>;
  saveDocument: (draft: DocumentDraft) => Promise<string>;
  savePackingItem: (draft: PackingItemDraft) => Promise<string>;
  saveTravelSegment: (draft: TravelSegmentDraft) => Promise<string>;
  saveHotelStay: (draft: HotelStayDraft) => Promise<string>;
  saveItineraryEvent: (draft: ItineraryEventDraft) => Promise<string>;
  saveEmergencyInfo: (draft: EmergencyInfoDraft) => Promise<string>;
  deleteRecord: (table: string, id: string) => Promise<void>;
  resetWithDemoData: () => Promise<void>;
};

async function persistSnapshot(snapshot: AppDataSnapshot) {
  for (const trip of snapshot.trips) await upsertTrip(trip);
  for (const traveller of snapshot.travellers) await upsertTraveller(traveller);
  for (const document of snapshot.documents) await upsertDocument(document);
  for (const item of snapshot.packingItems) await upsertPackingItem(item);
  for (const segment of snapshot.travelSegments) await upsertTravelSegment(segment);
  for (const hotel of snapshot.hotelStays) await upsertHotelStay(hotel);
  for (const event of snapshot.itineraryEvents) await upsertItineraryEvent(event);
  for (const emergency of snapshot.emergencyInfos) await upsertEmergencyInfo(emergency);
}

function nextActiveTripId(state: StoreState, snapshot: AppDataSnapshot) {
  if (state.activeTripId && snapshot.trips.some((trip) => trip.id === state.activeTripId)) {
    return state.activeTripId;
  }

  return snapshot.trips[0]?.id ?? null;
}

export const useAppStore = create<StoreState>((set, get) => ({
  isBootstrapped: false,
  isBusy: false,
  isUnlocked: false,
  privacyOverlayVisible: false,
  activeTripId: null,
  lastInteractionAt: Date.now(),
  backgroundedAt: null,
  vaultUnlockedUntil: null,
  security: defaultSecurityConfig,
  data: emptySnapshot,
  bootstrap: async () => {
    if (get().isBootstrapped || get().isBusy) {
      return;
    }

    set({ isBusy: true });
    await ensureAppDirectories();
    const [security, data] = await Promise.all([loadSecurityConfig(), loadSnapshot()]);
    set({
      security,
      data,
      activeTripId: data.trips[0]?.id ?? null,
      isUnlocked: false,
      isBootstrapped: true,
      isBusy: false,
      lastInteractionAt: Date.now(),
    });
  },
  refreshData: async () => {
    const snapshot = await loadSnapshot();
    set((state) => ({
      data: snapshot,
      activeTripId: nextActiveTripId(state, snapshot),
    }));
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
    }
  },
  handleAppStateChange: (state) => {
    if (state === 'inactive' || state === 'background') {
      set({ privacyOverlayVisible: true, backgroundedAt: Date.now() });
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
  createPin: async (pin, pinLength) => {
    const security = await createPinConfig(pin, pinLength);
    await persistSecurityConfig(security);
    set({
      security,
      isUnlocked: true,
      privacyOverlayVisible: false,
      lastInteractionAt: Date.now(),
    });
  },
  unlockWithPin: async (pin) => {
    const state = get();
    const valid = await verifyPin(pin, state.security);
    if (valid) {
      set({
        isUnlocked: true,
        privacyOverlayVisible: false,
        lastInteractionAt: Date.now(),
      });
    }
    return valid;
  },
  confirmPin: async (pin) => {
    return verifyPin(pin, get().security);
  },
  unlockWithBiometrics: async (scope = 'app') => {
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
      set({ isUnlocked: true, privacyOverlayVisible: false, lastInteractionAt: Date.now() });
    }

    return true;
  },
  lockApp: () => set({ isUnlocked: false, vaultUnlockedUntil: null, privacyOverlayVisible: true }),
  unlockVault: (seconds = 180) => set({ vaultUnlockedUntil: Date.now() + seconds * 1000 }),
  updateSecurityPreferences: async (updates) => {
    const next = { ...get().security, ...updates };
    await persistSecurityConfig(next);
    set({ security: next });
  },
  saveTrip: async (draft) => {
    const id = await upsertTrip(draft);
    await get().refreshData();
    set({ activeTripId: id });
    return id;
  },
  saveTraveller: async (draft) => {
    const id = await upsertTraveller(draft);
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
