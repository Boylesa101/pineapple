import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { LinearGradient } from 'expo-linear-gradient';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppModal } from '@/components/AppModal';
import { AppScreen } from '@/components/AppScreen';
import { AppTextField } from '@/components/AppTextField';
import { AirportSearchField } from '@/components/AirportSearchField';
import { AvatarBadge } from '@/components/AvatarBadge';
import { ChoiceChips } from '@/components/ChoiceChips';
import { DateTimeField } from '@/components/DateTimeField';
import { EmptyState } from '@/components/EmptyState';
import { HotelAddressSearchField } from '@/components/HotelAddressSearchField';
import { ManagedFileImage } from '@/components/ManagedFileImage';
import { ProviderLogoBadge } from '@/components/ProviderLogoBadge';
import { TransportProviderSearchField } from '@/components/TransportProviderSearchField';
import { TypedDateField } from '@/components/TypedDateField';
import { QRCodeImage } from '@/components/ui/QRCodeImage';
import { TransportStackSection } from '@/components/transport-stack';
import { colors, spacing } from '@/constants/theme';
import {
  getAirportSetOffInfo,
  getDestinationLocalTimeInfo,
  getDestinationQuickFacts,
  getDestinationWeatherForecast,
  type DestinationLocalTimeInfo,
  type DestinationQuickFacts,
  type DestinationWeatherForecast,
} from '@/services/tripInsightsService';
import { buildTripTransferQrPayload } from '@/services/tripTransfer';
import { getTransportItems, type TransportItem } from '@/services/transport';
import { relationshipOptions, travellerAvatarColors } from '@/data/travellerOptions';
import { findTransportProvider } from '@/data/transportProviders';
import { useAppStore } from '@/store/useAppStore';
import type {
  EmergencyInfoDraft,
  HotelStayDraft,
  ParticipantRole,
  PdfExportOptions,
  TransportType,
  TravelSegmentDraft,
  TripInviteDraft,
  TravellerDraft,
} from '@/types/models';
import { createShareCode } from '@/utils/shareCodes';
import { daysUntil, formatDateTime } from '@/utils/date';
import { formatAirportDisplay } from '@/utils/airports';
import { tripDateRange } from '@/utils/format';
import { getTripBundle } from '@/utils/selectors';
import { isWebCompanionPolicyActive, sensitiveWebSupportMessage } from '@/utils/platformPolicy';
import { getTransportDisplay, isAirTransportType } from '@/utils/transport';
import { toUserMessage } from '@/utils/userErrors';
import { validateEmergencyInfo, validateHotelStay, validateTravelSegment, validateTraveller } from '@/utils/validation';
import { chooseProfilePhoto } from '@/utils/profilePhotos';
import { deleteLocalFile } from '@/utils/fileStorage';

type ModalKind = 'traveller' | 'segment' | 'hotel' | 'transfer' | 'emergency' | 'export' | 'invite' | null;
type TransferDraft = {
  provider: string;
  method: string;
  location: string;
  time: string | null;
  airportTravelDurationMinutes: string;
  notes: string;
};

const defaultExportOptions: PdfExportOptions = {
  includeEmergencyNumbers: true,
  includeDocumentNumbers: false,
  includePackingList: true,
  includeDocumentReferences: true,
  hideSensitiveValues: true,
};

const participantRoleOptions: Array<{ label: string; value: ParticipantRole }> = [
  { label: 'Owner', value: 'owner' },
  { label: 'Editor', value: 'editor' },
  { label: 'Viewer', value: 'viewer' },
];

const documentTypeLabels = {
  passport: 'passport',
  ghic: 'GHIC / EHIC',
  insurance: 'insurance document',
  visa: 'visa',
  driving_licence: 'driving licence',
  payment_card: 'payment card',
  id_card: 'ID card',
  boarding_pass: 'boarding pass',
  hotel_booking: 'hotel booking',
  excursion_ticket: 'excursion ticket',
  hire_car_booking: 'hire car booking',
  airport_lounge_pass: 'airport lounge pass',
  loyalty_card: 'loyalty card',
  rail_ticket: 'rail ticket',
  custom: 'document',
} as const;

function tripHeroGradient(type: 'country' | 'place' | 'unknown'): readonly [string, string] {
  if (type === 'country') {
    return ['rgba(13, 59, 102, 0.18)', 'rgba(13, 110, 253, 0.08)'];
  }
  if (type === 'place') {
    return ['rgba(23, 74, 120, 0.2)', 'rgba(63, 140, 255, 0.08)'];
  }
  return ['rgba(13, 59, 102, 0.18)', 'rgba(74, 128, 200, 0.08)'];
}

function weatherIconName(weatherCode: number | null) {
  if (weatherCode === null) return 'cloud-off';
  if (weatherCode === 0) return 'wb-sunny';
  if (weatherCode === 1 || weatherCode === 2 || weatherCode === 3) return 'cloud';
  if (weatherCode === 45 || weatherCode === 48) return 'blur-on';
  if ((weatherCode >= 51 && weatherCode <= 67) || (weatherCode >= 80 && weatherCode <= 82)) return 'umbrella';
  if ((weatherCode >= 71 && weatherCode <= 77) || weatherCode === 85 || weatherCode === 86) return 'ac-unit';
  if (weatherCode >= 95) return 'bolt';
  return 'cloud';
}

function quickFactValue(value: string | null | undefined, fallback = 'Unavailable') {
  return value?.trim() || fallback;
}

function formatTemperatureRange(minimum: number | null, maximum: number | null) {
  if (minimum === null || maximum === null || minimum === undefined || maximum === undefined) {
    return 'High / low unavailable';
  }
  return `H ${Math.round(maximum)}° / L ${Math.round(minimum)}°`;
}

function createTravelSegmentDraft(
  tripId: string,
  currentCount: number,
  overrides: Partial<TravelSegmentDraft> = {}
): TravelSegmentDraft {
  const now = new Date().toISOString();

  return {
    tripId,
    transportType: 'flight',
    travelDirection: currentCount ? 'return' : 'outbound',
    airline: '',
    providerCode: '',
    providerLogoUrl: null,
    flightNumber: '',
    departureAirport: '',
    departureAirportCode: '',
    arrivalAirport: '',
    arrivalAirportCode: '',
    departureTime: now,
    departureTimeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/London',
    arrivalTime: now,
    terminal: '',
    gate: '',
    bookingRef: '',
    notificationSummary: '',
    scheduledNotificationIds: [],
    notes: '',
    ...overrides,
  };
}

function createConnectingFlightDraft(tripId: string, primaryDraft: TravelSegmentDraft): TravelSegmentDraft {
  return createTravelSegmentDraft(tripId, 1, {
    transportType: 'flight',
    travelDirection: 'other',
    airline: primaryDraft.airline,
    providerCode: primaryDraft.providerCode,
    providerLogoUrl: primaryDraft.providerLogoUrl,
    bookingRef: primaryDraft.bookingRef,
    departureAirport: primaryDraft.arrivalAirport,
    departureAirportCode: primaryDraft.arrivalAirportCode,
    departureTime: primaryDraft.arrivalTime,
    arrivalTime: primaryDraft.arrivalTime,
  });
}

function segmentDirectionLabel(direction: TravelSegmentDraft['travelDirection'], transportType: TransportType) {
  const display = getTransportDisplay(transportType);
  if (direction === 'other') {
    return display.directionOtherLabel.toLowerCase();
  }

  return direction;
}

function formatReminderLeadTimeLabel(leadTimeDays: number) {
  if (leadTimeDays === 0) {
    return 'On the day';
  }
  if (leadTimeDays === 1) {
    return '1 day before';
  }
  return `${leadTimeDays} days before`;
}

export default function TripDetailScreen() {
  const router = useRouter();
  const { tripId, focus, segmentId } = useLocalSearchParams<{ tripId: string; focus?: string; segmentId?: string }>();
  const {
    data,
    saveTrip,
    saveTraveller,
    saveTravelSegment,
    saveHotelStay,
    saveEmergencyInfo,
    exportTripPdfFile,
    saveTripInvite,
    exportSharedTripFile,
    prepareSharedTripTransfer,
    importSharedTripFile,
    resolveSyncConflictChoice,
    deleteRecord,
  } = useAppStore();
  const bundle = getTripBundle(data, tripId);
  const trip = bundle.trip;
  const [modalKind, setModalKind] = useState<ModalKind>(null);
  const [travellerDraft, setTravellerDraft] = useState<TravellerDraft | null>(null);
  const [segmentDraft, setSegmentDraft] = useState<TravelSegmentDraft | null>(null);
  const [hotelDraft, setHotelDraft] = useState<HotelStayDraft | null>(null);
  const [transferDraft, setTransferDraft] = useState<TransferDraft | null>(null);
  const [emergencyDraft, setEmergencyDraft] = useState<EmergencyInfoDraft | null>(null);
  const [exportOptions, setExportOptions] = useState<PdfExportOptions>(defaultExportOptions);
  const [inviteDraft, setInviteDraft] = useState<TripInviteDraft | null>(null);
  const [connectionSegmentDraft, setConnectionSegmentDraft] = useState<TravelSegmentDraft | null>(null);
  const [transferQrVisible, setTransferQrVisible] = useState(false);
  const [transferQrPackage, setTransferQrPackage] = useState<ReturnType<typeof buildTripTransferQrPayload> | null>(null);
  const [transferQrCode, setTransferQrCode] = useState<string | null>(null);
  const [sharedImportVisible, setSharedImportVisible] = useState(false);
  const [sharedImportContents, setSharedImportContents] = useState<string | null>(null);
  const [sharedImportCode, setSharedImportCode] = useState('');
  const [sharedImportSourceLabel, setSharedImportSourceLabel] = useState('shared trip');
  const [travellerPhotoBaselineUri, setTravellerPhotoBaselineUri] = useState<string | null>(null);
  const [destinationTimeInfo, setDestinationTimeInfo] = useState<DestinationLocalTimeInfo | null>(null);
  const [destinationWeather, setDestinationWeather] = useState<DestinationWeatherForecast | null>(null);
  const [destinationQuickFacts, setDestinationQuickFacts] = useState<DestinationQuickFacts | null>(null);
  const [selectedWeatherDate, setSelectedWeatherDate] = useState<string | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [transportItems, setTransportItems] = useState<TransportItem[]>([]);
  const tripScrollRef = useRef<ScrollView | null>(null);
  const handledFocusRef = useRef<string | null>(null);
  useEffect(() => {
    if (!trip) {
      return;
    }

    const focusKey = typeof focus === 'string' ? `${focus}:${typeof segmentId === 'string' ? segmentId : ''}` : null;
    if (focusKey && handledFocusRef.current !== focusKey) {
      handledFocusRef.current = focusKey;

      if (focus === 'travel') {
        const selectedSegment =
          typeof segmentId === 'string'
            ? bundle.travelSegments.find((segment) => segment.id === segmentId)
            : bundle.travelSegments[0];
        openSegmentEditor(selectedSegment);
        return;
      }

      if (focus === 'hotel') {
        openHotelEditor(bundle.hotelStays[0]);
        return;
      }

      if (focus === 'transfer') {
        openTransferEditor();
        return;
      }
    }
  }, [bundle.hotelStays, bundle.travelSegments, focus, segmentId, trip]);
  const departureDays = trip ? daysUntil(trip.startDate) : null;
  const airportSetOffInfo = useMemo(
    () =>
      trip
        ? getAirportSetOffInfo(bundle.travelSegments, trip.airportTravelDurationMinutes)
        : {
            status: 'unavailable' as const,
            timeLabel: 'Set-off time unavailable',
            helperLabel: 'Trip details are unavailable.',
          },
    [bundle.travelSegments, trip]
  );
  useEffect(() => {
    let cancelled = false;
    const destination = trip?.destination.trim() ?? '';

    if (!destination) {
      setDestinationTimeInfo(null);
      setDestinationWeather(null);
      setDestinationQuickFacts(null);
      setInsightsLoading(false);
      return () => {
        cancelled = true;
      };
    }

    setInsightsLoading(true);

    void Promise.all([getDestinationLocalTimeInfo(destination), getDestinationWeatherForecast(destination), getDestinationQuickFacts(destination)])
      .then(([timeInfo, weather, quickFacts]) => {
        if (cancelled) {
          return;
        }

        setDestinationTimeInfo(timeInfo);
        setDestinationWeather(weather);
        setDestinationQuickFacts(quickFacts);
      })
      .catch((error) => {
        if (__DEV__) {
          console.error('trip insights lookup failed', error);
        }
        if (!cancelled) {
          setDestinationTimeInfo(null);
          setDestinationWeather(null);
          setDestinationQuickFacts(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setInsightsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [trip?.destination]);

  useEffect(() => {
    if (!destinationWeather?.days.length) {
      setSelectedWeatherDate(null);
      return;
    }

    setSelectedWeatherDate((current) =>
      current && destinationWeather.days.some((day) => day.date === current) ? current : destinationWeather.days[0]?.date ?? null
    );
  }, [destinationWeather]);

  useEffect(() => {
    let cancelled = false;

    void getTransportItems({
      travelSegments: bundle.travelSegments,
      hotelStays: bundle.hotelStays,
      documents: bundle.documents,
      travellers: bundle.travellers,
    }).then((nextItems) => {
      if (!cancelled) {
        setTransportItems(nextItems.filter((item) => item.type !== 'hotel'));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [bundle.documents, bundle.hotelStays, bundle.travelSegments, bundle.travellers]);

  if (!trip) {
    return (
      <AppScreen title="Trip not found">
        <AppCard>
          <EmptyState
            title="This trip is missing"
            description="It may have been deleted locally. Return to Trips to continue."
          />
          <AppButton label="Back to trips" onPress={() => router.replace('/trips')} />
        </AppCard>
      </AppScreen>
    );
  }
  const currentTrip = trip;
  const selectedWeatherDay =
    destinationWeather?.days.find((day) => day.date === selectedWeatherDate) ?? destinationWeather?.days[0] ?? null;

  function openTravellerEditor(current?: TravellerDraft) {
    setTravellerPhotoBaselineUri(current?.photoUri ?? null);
    setTravellerDraft(
      current ?? {
        tripId,
        fullName: '',
        photoUri: null,
        dateOfBirth: null,
        passportNationality: '',
        passportNumber: '',
        ghicNumber: '',
        medicalNote: '',
        notes: '',
        avatarColor: travellerAvatarColors[0],
        relationshipType: 'adult',
      }
    );
    setModalKind('traveller');
  }

  async function handleTravellerPhotoSelection() {
    if (!travellerDraft) {
      return;
    }

    const nextUri = await chooseProfilePhoto(travellerDraft.photoUri, {
      replaceExisting: Boolean(travellerDraft.photoUri && travellerDraft.photoUri !== travellerPhotoBaselineUri),
    });
    if (nextUri) {
      setTravellerDraft((current) => (current ? { ...current, photoUri: nextUri } : current));
    }
  }

  async function handleTravellerPhotoRemoval() {
    const draftPhotoUri = travellerDraft?.photoUri ?? null;
    if (draftPhotoUri && draftPhotoUri !== travellerPhotoBaselineUri) {
      await deleteLocalFile(draftPhotoUri);
    }
    setTravellerDraft((current) => (current ? { ...current, photoUri: null } : current));
  }

  function openSegmentEditor(current?: TravelSegmentDraft) {
    setSegmentDraft(current ?? createTravelSegmentDraft(tripId, bundle.travelSegments.length));
    setConnectionSegmentDraft(null);
    setModalKind('segment');
  }

  function closeModal(options?: { preserveTravellerPhoto?: boolean }) {
    if (modalKind === 'traveller' && !options?.preserveTravellerPhoto) {
      const draftPhotoUri = travellerDraft?.photoUri ?? null;
      if (draftPhotoUri && draftPhotoUri !== travellerPhotoBaselineUri) {
        void deleteLocalFile(draftPhotoUri);
      }
      setTravellerPhotoBaselineUri(null);
    }
    setModalKind(null);
    setConnectionSegmentDraft(null);
  }

  function openConnectingFlightEditor() {
    if (!segmentDraft) {
      return;
    }

    setConnectionSegmentDraft((current) => current ?? createConnectingFlightDraft(tripId, segmentDraft));
  }

  function removeConnectingFlightEditor() {
    setConnectionSegmentDraft(null);
  }

  function openHotelEditor(current?: HotelStayDraft) {
    setHotelDraft(
      current ?? {
        tripId,
        hotelName: '',
        address: '',
        city: '',
        country: '',
        latitude: null,
        longitude: null,
        hotelImageLocalPath: null,
        hotelImageRemoteUrl: null,
        hotelImageSource: 'fallback',
        hotelImageAttributionText: 'Default hotel background',
        hotelImageAttributionMeta: { source: 'fallback', sourceLabel: 'Default hotel background' },
        hotelImageStatus: 'idle',
        phone: '',
        bookingRef: '',
        checkIn: currentTrip.startDate,
        checkOut: currentTrip.endDate,
        notes: '',
      }
    );
    setModalKind('hotel');
  }

  function openTransferEditor() {
    setTransferDraft({
      provider: currentTrip.transferProvider,
      method: currentTrip.transferMethod,
      location: currentTrip.transferLocation,
      time: currentTrip.transferTime,
      airportTravelDurationMinutes:
        currentTrip.airportTravelDurationMinutes !== null ? String(currentTrip.airportTravelDurationMinutes) : '',
      notes: currentTrip.transferNotes || currentTrip.transferSummary,
    });
    setModalKind('transfer');
  }

  function openEmergencyEditor() {
    setEmergencyDraft(
      bundle.emergencyInfo ?? {
        tripId,
        insurerEmergencyNumber: '',
        hotelPhone: '',
        airlinePhone: '',
        localEmergencyNote: '',
        embassyConsulateNote: '',
        travellerMedicalNote: '',
        emergencyContacts: '',
      }
    );
    setModalKind('emergency');
  }

  function openInviteEditor() {
    setInviteDraft({
      tripId,
      email: '',
      inviteCode: bundle.sharedTripState?.shareCode ?? createShareCode(),
      role: 'editor',
      status: 'pending',
    });
    setModalKind('invite');
  }

  async function saveCurrentModal() {
    if (modalKind === 'traveller' && travellerDraft) {
      const errors = validateTraveller(travellerDraft);
      if (errors.length) {
        Alert.alert('Traveller needs attention', errors.join('\n'));
        return;
      }
      await saveTraveller(travellerDraft);
      setTravellerPhotoBaselineUri(travellerDraft.photoUri ?? null);
      closeModal({ preserveTravellerPhoto: true });
      return;
    }

    if (modalKind === 'segment' && segmentDraft) {
      const errors = validateTravelSegment(segmentDraft);
      const connectionErrors = connectionSegmentDraft ? validateTravelSegment(connectionSegmentDraft) : [];
      const transportDisplay = getTransportDisplay(segmentDraft.transportType);
      if (errors.length) {
        Alert.alert(`${transportDisplay.label} details need attention`, errors.join('\n'));
        return;
      }
      if (connectionErrors.length) {
        Alert.alert('Connecting flight needs attention', connectionErrors.join('\n'));
        return;
      }
      try {
        await saveTravelSegment(segmentDraft);
        if (connectionSegmentDraft) {
          await saveTravelSegment(connectionSegmentDraft);
        }
        closeModal();
      } catch (error) {
        Alert.alert('Travel details could not be saved', toUserMessage(error, 'Unable to save those travel details right now.'));
      }
      return;
    }

    if (modalKind === 'hotel' && hotelDraft) {
      const errors = validateHotelStay(hotelDraft);
      if (errors.length) {
        Alert.alert('Hotel details need attention', errors.join('\n'));
        return;
      }
      try {
        await saveHotelStay(hotelDraft);
        closeModal();
      } catch (error) {
        Alert.alert('Hotel could not be saved', toUserMessage(error, 'Unable to save that hotel right now.'));
      }
      return;
    }

    if (modalKind === 'transfer' && transferDraft) {
      if (!transferDraft.provider.trim() && !transferDraft.location.trim() && !transferDraft.notes.trim()) {
        Alert.alert('Transfer details needed', 'Add at least a pickup provider, location, or notes before saving.');
        return;
      }
      try {
        await saveTrip({
          ...currentTrip,
          transferSummary: [transferDraft.provider, transferDraft.method, transferDraft.location, transferDraft.notes]
            .filter(Boolean)
            .join(' · '),
          transferProvider: transferDraft.provider,
          transferMethod: transferDraft.method,
          transferLocation: transferDraft.location,
          transferTime: transferDraft.time,
          airportTravelDurationMinutes: transferDraft.airportTravelDurationMinutes.trim()
            ? Math.max(0, Math.round(Number(transferDraft.airportTravelDurationMinutes) || 0))
            : null,
          transferNotes: transferDraft.notes,
        });
        closeModal();
      } catch (error) {
        Alert.alert('Transfer details could not be saved', toUserMessage(error, 'Unable to save that transfer right now.'));
      }
      return;
    }

    if (modalKind === 'emergency' && emergencyDraft) {
      const errors = validateEmergencyInfo(emergencyDraft);
      if (errors.length) {
        Alert.alert('Emergency info needs attention', errors.join('\n'));
        return;
      }
      await saveEmergencyInfo(emergencyDraft);
      closeModal();
      return;
    }

    if (modalKind === 'invite' && inviteDraft) {
      if (!inviteDraft.email.trim()) {
        Alert.alert('Invite needs attention', 'Add an email or label for this participant invite.');
        return;
      }
      await saveTripInvite(inviteDraft);
      closeModal();
    }
  }

  async function handleExportPdf() {
    try {
      await exportTripPdfFile(tripId, exportOptions);
      setModalKind(null);
    } catch (error) {
      Alert.alert('Export failed', toUserMessage(error, 'Unable to export PDF right now.'));
    }
  }

  async function handleExportShare() {
    if (isWebCompanionPolicyActive()) {
      Alert.alert('Manual-share sync stays disabled on web', sensitiveWebSupportMessage);
      return;
    }

    try {
      const result = await exportSharedTripFile(tripId);
      Alert.alert(
        'Encrypted trip ready to share',
        `Pineapple created an encrypted share file and opened Android sharing. Share this transfer code separately with the receiver:\n\n${result.transferCode}`
      );
    } catch (error) {
      Alert.alert('Share export failed', toUserMessage(error, 'Unable to export that shared trip right now.'));
    }
  }

  async function openTransferQr() {
    try {
      const transfer = await prepareSharedTripTransfer(tripId);
      const qrPayload = buildTripTransferQrPayload(transfer.encryptedContents);
      if (!qrPayload.fitsQr) {
        Alert.alert(
          'Transfer QR unavailable',
          'This encrypted trip is too large to fit safely inside a QR code. Use the encrypted share file instead.'
        );
        return;
      }

      setTransferQrPackage(qrPayload);
      setTransferQrCode(transfer.transferCode);
      setTransferQrVisible(true);
    } catch (error) {
      Alert.alert('Transfer QR unavailable', toUserMessage(error, 'Pineapple could not prepare a secure transfer QR for this trip right now.'));
    }
  }

  function openSharedTripImport(contents: string, sourceLabel: string) {
    if (!contents.trim()) {
      Alert.alert('Shared trip unavailable', 'That encrypted shared trip was empty.');
      return;
    }

    setSharedImportContents(contents);
    setSharedImportSourceLabel(sourceLabel);
    setSharedImportCode('');
    setSharedImportVisible(true);
  }

  function closeSharedTripImportModal() {
    setSharedImportVisible(false);
    setSharedImportContents(null);
    setSharedImportCode('');
    setSharedImportSourceLabel('shared trip');
  }

  async function confirmSharedTripImport() {
    if (!sharedImportContents) {
      return;
    }

    if (!sharedImportCode.trim()) {
      Alert.alert('Transfer code needed', 'Enter the transfer code to decrypt this shared trip.');
      return;
    }

    try {
      const outcome = await importSharedTripFile(sharedImportContents, sharedImportCode);
      closeSharedTripImportModal();
      if (outcome.mode === 'conflict') {
        Alert.alert('Conflict detected', 'The incoming encrypted shared trip was stored for manual conflict review.');
      } else {
        Alert.alert('Shared trip imported', 'Trip data was updated from the encrypted shared trip.');
      }
    } catch (error) {
      Alert.alert('Share import failed', toUserMessage(error, 'Unable to decrypt or import that shared trip right now.'));
    }
  }

  async function handleImportShare() {
    if (isWebCompanionPolicyActive()) {
      Alert.alert('Manual-share sync stays disabled on web', sensitiveWebSupportMessage);
      return;
    }

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/json', '*/*'],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets[0]) {
        return;
      }

      const contents = await FileSystem.readAsStringAsync(result.assets[0].uri);
      openSharedTripImport(contents, result.assets[0].name ?? 'shared trip file');
    } catch (error) {
      Alert.alert('Share import failed', toUserMessage(error, 'Unable to import that shared trip right now.'));
    }
  }

  function renderTravelEditorFields(
    draft: TravelSegmentDraft,
    updateDraft: (updater: (current: TravelSegmentDraft) => TravelSegmentDraft) => void,
    options?: {
      sectionTitle?: string;
      sectionSubtitle?: string;
      allowTransportType?: boolean;
      allowDirection?: boolean;
      allowConnectionPrompt?: boolean;
      onRemoveConnection?: () => void;
    }
  ) {
    const providerBrand = findTransportProvider(draft.providerCode, draft.transportType);
    const transportDisplay = getTransportDisplay(draft.transportType);
    const usesAirportFields = isAirTransportType(draft.transportType);

    return (
      <>
        {options?.sectionTitle ? (
          <View style={styles.segmentSectionHeader}>
            <View style={styles.segmentSectionCopy}>
              <Text style={styles.segmentSectionTitle}>{options.sectionTitle}</Text>
              {options.sectionSubtitle ? <Text style={styles.helperText}>{options.sectionSubtitle}</Text> : null}
            </View>
            {options.onRemoveConnection ? (
              <Pressable onPress={options.onRemoveConnection} hitSlop={8}>
                <MaterialIcons name="close" size={18} color={colors.textMuted} />
              </Pressable>
            ) : null}
          </View>
        ) : null}
        {options?.allowTransportType !== false ? (
          <>
            <Text style={styles.label}>Transport type</Text>
            <ChoiceChips<TransportType>
              value={draft.transportType}
              onChange={(value) => {
                updateDraft((current) => ({
                  ...current,
                  transportType: value,
                  airline: '',
                  providerCode: '',
                  providerLogoUrl: null,
                  departureAirportCode: isAirTransportType(value) ? current.departureAirportCode : '',
                  arrivalAirportCode: isAirTransportType(value) ? current.arrivalAirportCode : '',
                }));
                if (value !== 'flight') {
                  setConnectionSegmentDraft(null);
                }
              }}
              options={[
                { label: 'Flight', value: 'flight' },
                { label: 'Private flight', value: 'private_flight' },
                { label: 'Train', value: 'train' },
                { label: 'Bus', value: 'bus' },
                { label: 'Underground', value: 'underground' },
                { label: 'Metro', value: 'metro' },
                { label: 'Ferry', value: 'ferry' },
                { label: 'Eurotunnel', value: 'eurotunnel' },
                { label: 'Drive', value: 'car' },
                { label: 'Hire car', value: 'hire_car' },
                { label: 'Taxi', value: 'taxi' },
              ]}
            />
          </>
        ) : null}
        {options?.allowDirection !== false ? (
          <>
            <Text style={styles.label}>Direction</Text>
            <ChoiceChips<TravelSegmentDraft['travelDirection']>
              value={draft.travelDirection}
              onChange={(value) => updateDraft((current) => ({ ...current, travelDirection: value }))}
              options={[
                { label: 'Outbound', value: 'outbound' },
                { label: 'Return', value: 'return' },
                { label: transportDisplay.directionOtherLabel, value: 'other' },
              ]}
            />
          </>
        ) : null}
        <TransportProviderSearchField
          label={transportDisplay.providerLabel}
          transportType={draft.transportType}
          value={draft.airline}
          onChangeText={(value) => updateDraft((current) => ({ ...current, airline: value, providerCode: '', providerLogoUrl: null }))}
          onSelectProvider={(provider) =>
            updateDraft((current) => ({
              ...current,
              airline: provider.name,
              providerCode: provider.code,
              providerLogoUrl: provider.logoUrl,
            }))
          }
          placeholder={transportDisplay.providerPlaceholder}
          helper={transportDisplay.providerHelper}
        />
        {draft.providerLogoUrl || draft.providerCode ? (
          <View style={styles.providerPreview}>
            <ProviderLogoBadge
              name={draft.airline || transportDisplay.shortLabel}
              code={draft.providerCode}
              logoXml={providerBrand?.logoXml ?? null}
              logoUrl={draft.providerLogoUrl}
              accentColor={providerBrand?.accentColor ?? null}
            />
            <Text style={styles.providerPreviewText}>
              {draft.providerCode ? `${draft.providerCode} · ` : ''}
              {draft.airline || 'Provider'}
            </Text>
          </View>
        ) : null}
        <AppTextField
          label={transportDisplay.serviceNumberLabel}
          value={draft.flightNumber}
          onChangeText={(value) => updateDraft((current) => ({ ...current, flightNumber: value }))}
        />
        {usesAirportFields ? (
          <>
            <AirportSearchField
              label={transportDisplay.departureLabel}
              iconName={transportDisplay.departureIcon}
              value={draft.departureAirport}
              airportCode={draft.departureAirportCode}
              onChangeText={(value) =>
                updateDraft((current) => ({
                  ...current,
                  departureAirport: value,
                  departureAirportCode: current.departureAirport === value ? current.departureAirportCode : '',
                }))
              }
              onSelectAirport={(airport) => updateDraft((current) => ({ ...current, departureAirport: airport.name, departureAirportCode: airport.code }))}
              placeholder="Search by city, airport, or IATA"
              helper="Type a place like London, Newcastle, or JFK."
            />
            <AirportSearchField
              label={transportDisplay.arrivalLabel}
              iconName={transportDisplay.arrivalIcon}
              value={draft.arrivalAirport}
              airportCode={draft.arrivalAirportCode}
              onChangeText={(value) =>
                updateDraft((current) => ({
                  ...current,
                  arrivalAirport: value,
                  arrivalAirportCode: current.arrivalAirport === value ? current.arrivalAirportCode : '',
                }))
              }
              onSelectAirport={(airport) => updateDraft((current) => ({ ...current, arrivalAirport: airport.name, arrivalAirportCode: airport.code }))}
              placeholder="Search by city, airport, or IATA"
              helper="Pick the right airport and Pineapple keeps the IATA code."
            />
          </>
        ) : (
          <>
            <AppTextField
              label={transportDisplay.departureLabel}
              value={draft.departureAirport}
              onChangeText={(value) => updateDraft((current) => ({ ...current, departureAirport: value }))}
            />
            <AppTextField
              label={transportDisplay.arrivalLabel}
              value={draft.arrivalAirport}
              onChangeText={(value) => updateDraft((current) => ({ ...current, arrivalAirport: value }))}
            />
          </>
        )}
        <DateTimeField
          label="Departure time"
          iconName={transportDisplay.departureIcon}
          mode="datetime"
          value={draft.departureTime}
          onChange={(value) =>
            updateDraft((current) => ({
              ...current,
              departureTime: value,
              departureTimeZone: current.departureTimeZone ?? (Intl.DateTimeFormat().resolvedOptions().timeZone || null),
            }))
          }
        />
        <DateTimeField
          label="Arrival time"
          iconName={transportDisplay.arrivalIcon}
          mode="datetime"
          value={draft.arrivalTime}
          onChange={(value) => updateDraft((current) => ({ ...current, arrivalTime: value }))}
        />
        <AppTextField
          label={transportDisplay.terminalLabel}
          value={draft.terminal}
          onChangeText={(value) => updateDraft((current) => ({ ...current, terminal: value }))}
        />
        <AppTextField
          label={transportDisplay.gateLabel}
          value={draft.gate}
          onChangeText={(value) => updateDraft((current) => ({ ...current, gate: value }))}
        />
        <AppTextField
          label="Booking ref"
          value={draft.bookingRef}
          onChangeText={(value) => updateDraft((current) => ({ ...current, bookingRef: value }))}
        />
        {options?.allowConnectionPrompt && draft.transportType === 'flight' && !connectionSegmentDraft ? (
          <Pressable onPress={openConnectingFlightEditor} style={styles.connectionPrompt}>
            <MaterialIcons name="connecting-airports" size={20} color={colors.primaryBlueDark} />
            <View style={styles.connectionPromptCopy}>
              <Text style={styles.connectionPromptTitle}>Need to add a connecting flight?</Text>
              <Text style={styles.connectionPromptHint}>Add the next leg and keep the connection details with this trip.</Text>
            </View>
          </Pressable>
        ) : null}
        <AppTextField
          label="Notes"
          value={draft.notes}
          onChangeText={(value) => updateDraft((current) => ({ ...current, notes: value }))}
          multiline
        />
      </>
    );
  }

  return (
    <AppScreen scrollRef={tripScrollRef} contentStyle={styles.tripContent}>
      <View style={styles.heroCard}>
        {trip.destinationImageLocalPath ?? trip.coverImageUri ? (
          <ManagedFileImage uri={trip.destinationImageLocalPath ?? trip.coverImageUri} style={styles.cover} />
        ) : null}
        <LinearGradient colors={tripHeroGradient(trip.destinationType)} style={styles.coverFallback} />
        <LinearGradient colors={['rgba(10, 28, 44, 0.06)', 'rgba(10, 28, 44, 0.38)']} style={styles.coverOverlay} />
        <View style={styles.heroCopy}>
          <Text style={styles.heroTitle}>{trip.name}</Text>
          <Text style={styles.heroDestination}>{trip.destination}</Text>
          <View style={styles.heroBottomRow}>
            <View style={styles.heroDateBlock}>
              <Text style={styles.heroDateLabel}>Trip dates</Text>
              <Text style={styles.heroDate}>{tripDateRange(trip.startDate, trip.endDate)}</Text>
            </View>
            <View style={styles.heroCountdownBlock}>
              <Text style={styles.heroCountdownLabel}>Countdown</Text>
              <Text style={styles.heroCountdownValue}>
                {departureDays === null
                  ? 'Dates unavailable'
                  : departureDays > 0
                    ? `${departureDays} days to go`
                    : departureDays === 0
                      ? 'Starts today'
                      : 'In progress'}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {destinationWeather?.days.length ? (
        <View style={styles.weatherCard}>
          <Pressable
            onPress={() => {
              if (!selectedWeatherDay) {
                return;
              }

              router.push({
                pathname: '/trip/[tripId]/weather',
                params: { tripId, date: selectedWeatherDay.date },
              });
            }}
            style={({ pressed }) => [styles.weatherHeroSection, pressed ? styles.cardPressed : null]}
          >
            <View style={styles.weatherBackground}>
              <View style={styles.weatherCircleLarge} />
              <View style={styles.weatherCircleMedium} />
              <View style={styles.weatherCircleSmall} />
            </View>
            <View style={styles.weatherHeroLeft}>
              <View style={styles.weatherConditionRow}>
                <MaterialIcons name={weatherIconName(selectedWeatherDay?.weatherCode ?? null) as any} size={28} color={colors.white} />
                <Text style={styles.weatherConditionLabel} numberOfLines={1} ellipsizeMode="tail">
                  {selectedWeatherDay?.conditionLabel ?? 'Weather unavailable'}
                </Text>
              </View>
              <Text style={styles.weatherHeadlineTemp}>
                {selectedWeatherDay?.temperatureMaxC !== null && selectedWeatherDay?.temperatureMaxC !== undefined
                  ? `${Math.round(selectedWeatherDay.temperatureMaxC)}°`
                  : '--'}
              </Text>
              <Text style={styles.weatherHeadlineRange}>
                {formatTemperatureRange(selectedWeatherDay?.temperatureMinC ?? null, selectedWeatherDay?.temperatureMaxC ?? null)}
              </Text>
            </View>
            <View style={styles.weatherHeroRight}>
              <Text style={styles.weatherHeroTime}>{destinationTimeInfo?.localTimeLabel ?? '--:--'}</Text>
              <Text style={styles.weatherHeroOffset}>
                {destinationTimeInfo
                  ? `${destinationTimeInfo.offsetLabel}${destinationTimeInfo.relativeLabel ? ` • ${destinationTimeInfo.relativeLabel}` : ''}`
                  : insightsLoading
                    ? 'Checking timezone…'
                    : 'Timezone unavailable'}
              </Text>
              <Text style={styles.weatherHeroPlace}>{destinationWeather.resolvedLabel ?? trip.destination}</Text>
              <Text style={styles.weatherHeroMeta}>{selectedWeatherDay?.dayLabel ?? 'Today'}</Text>
            </View>
          </Pressable>
          <View style={styles.weatherDaysSection}>
            {destinationWeather.days.slice(0, 7).map((day) => (
              <Pressable
                key={day.date}
                onPress={() => setSelectedWeatherDate(day.date)}
                style={[styles.weatherDayButton, day.date === selectedWeatherDate ? styles.weatherDayButtonActive : null]}
              >
                <Text style={styles.weatherDayButtonLabel}>{day.dayLabel.slice(0, 3)}</Text>
                <Text style={styles.weatherDayButtonTemp}>{day.temperatureMaxC !== null ? `${Math.round(day.temperatureMaxC)}°` : '--'}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : (
        <View style={styles.weatherCard}>
          <View style={styles.weatherHeroSection}>
            <View style={styles.weatherBackground}>
              <View style={styles.weatherCircleLarge} />
              <View style={styles.weatherCircleMedium} />
              <View style={styles.weatherCircleSmall} />
            </View>
            <View style={styles.weatherHeroLeft}>
              <View style={styles.weatherConditionRow}>
                <MaterialIcons name="cloud-off" size={28} color={colors.white} />
                <Text style={styles.weatherConditionLabel}>{insightsLoading ? 'Loading weather' : 'Weather unavailable'}</Text>
              </View>
              <Text style={styles.weatherHeadlineTemp}>--</Text>
              <Text style={styles.weatherHeadlineRange}>Check the full weather page for more detail.</Text>
            </View>
            <View style={styles.weatherHeroRight}>
              <Text style={styles.weatherHeroTime}>{destinationTimeInfo?.localTimeLabel ?? '--:--'}</Text>
              <Text style={styles.weatherHeroOffset}>{destinationTimeInfo?.offsetLabel ?? 'Timezone unavailable'}</Text>
              <Text style={styles.weatherHeroPlace}>{trip.destination}</Text>
              <Text style={styles.weatherHeroMeta}>Today</Text>
            </View>
          </View>
        </View>
      )}

      <Pressable
        onPress={() => router.push({ pathname: '/trip/[tripId]/destination-facts', params: { tripId } })}
        style={({ pressed }) => [styles.secondaryCardPressable, pressed ? styles.cardPressed : null]}
      >
        <AppCard title="Quick info" variant="standard" style={[styles.secondaryCard, styles.quickInfoCard]}>
          <View style={styles.quickInfoGrid}>
            <View style={styles.quickInfoCell}>
              <Text style={styles.quickFactLabel}>Currency</Text>
              <Text style={styles.quickFactValue}>{quickFactValue(destinationQuickFacts?.currencyLabel, insightsLoading ? 'Checking…' : 'Unavailable')}</Text>
            </View>
            <View style={styles.quickInfoCell}>
              <Text style={styles.quickFactLabel}>Language</Text>
              <Text style={styles.quickFactValue}>{quickFactValue(destinationQuickFacts?.languageLabel, insightsLoading ? 'Checking…' : 'Unavailable')}</Text>
            </View>
            <View style={styles.quickInfoCell}>
              <Text style={styles.quickFactLabel}>Plug</Text>
              <Text style={styles.quickFactValue}>{quickFactValue(destinationQuickFacts?.plugLabel, insightsLoading ? 'Checking…' : 'Unavailable')}</Text>
            </View>
            <View style={styles.quickInfoCell}>
              <Text style={styles.quickFactLabel}>Timezone</Text>
              <Text style={styles.quickFactValue}>
                {destinationTimeInfo?.offsetLabel ?? (insightsLoading ? 'Checking…' : 'Unavailable')}
              </Text>
            </View>
          </View>
        </AppCard>
      </Pressable>

      <TransportStackSection tripId={tripId} items={transportItems} />

      <Pressable
        onPress={() => router.push({ pathname: '/trip/[tripId]/set-off', params: { tripId } })}
        style={({ pressed }) => [styles.secondaryCardPressable, pressed ? styles.cardPressed : null]}
      >
        <AppCard title="Set-off time" variant="standard" style={styles.secondaryCard}>
          <Text style={styles.standardCardHeadline}>{airportSetOffInfo.timeLabel}</Text>
          <Text style={styles.standardCardMeta}>
            {airportSetOffInfo.status === 'available' ? airportSetOffInfo.departureLabel : 'Recommended departure unavailable'}
          </Text>
          <Text style={styles.notes}>
            {airportSetOffInfo.status === 'available' ? airportSetOffInfo.helperLabel : 'Based on check-in time and travel buffer once outbound details are added.'}
          </Text>
        </AppCard>
      </Pressable>

      <AppModal
        visible={modalKind === 'traveller'}
        title={travellerDraft?.id ? 'Edit traveller' : 'Add traveller'}
        onClose={closeModal}
      >
        {travellerDraft ? (
          <>
            <View style={styles.travellerPhotoEditor}>
              <AvatarBadge
                label={travellerDraft.fullName || 'Traveller'}
                color={travellerDraft.avatarColor}
                imageUri={travellerDraft.photoUri}
                size={78}
              />
              <View style={styles.buttonWrap}>
                <AppButton
                  label={travellerDraft.photoUri ? 'Change photo' : 'Choose photo'}
                  tone="secondary"
                  onPress={() => void handleTravellerPhotoSelection()}
                />
                {travellerDraft.photoUri ? (
                  <AppButton label="Remove photo" tone="ghost" onPress={() => void handleTravellerPhotoRemoval()} />
                ) : null}
              </View>
            </View>
            <AppTextField
              label="Full name"
              value={travellerDraft.fullName}
              onChangeText={(value) => setTravellerDraft((current) => (current ? { ...current, fullName: value } : current))}
            />
            <TypedDateField
              label="Date of birth"
              value={travellerDraft.dateOfBirth}
              onChange={(value) => setTravellerDraft((current) => (current ? { ...current, dateOfBirth: value } : current))}
            />
            <AppTextField
              label="Passport nationality"
              value={travellerDraft.passportNationality}
              onChangeText={(value) => setTravellerDraft((current) => (current ? { ...current, passportNationality: value } : current))}
            />
            <AppTextField
              label="Passport number"
              value={travellerDraft.passportNumber}
              onChangeText={(value) => setTravellerDraft((current) => (current ? { ...current, passportNumber: value } : current))}
            />
            <AppTextField
              label="GHIC / EHIC number"
              value={travellerDraft.ghicNumber}
              onChangeText={(value) => setTravellerDraft((current) => (current ? { ...current, ghicNumber: value } : current))}
            />
            <AppTextField
              label="Medical note"
              value={travellerDraft.medicalNote}
              onChangeText={(value) => setTravellerDraft((current) => (current ? { ...current, medicalNote: value } : current))}
              multiline
            />
            <AppTextField
              label="Notes"
              value={travellerDraft.notes}
              onChangeText={(value) => setTravellerDraft((current) => (current ? { ...current, notes: value } : current))}
              multiline
            />
            <Text style={styles.label}>Relationship</Text>
            <ChoiceChips
              value={travellerDraft.relationshipType}
              onChange={(value) => setTravellerDraft((current) => (current ? { ...current, relationshipType: value as TravellerDraft['relationshipType'] } : current))}
              options={relationshipOptions.map((option) => ({ label: option.label, value: option.value }))}
            />
            <Text style={styles.label}>Badge colour</Text>
            <View style={styles.colorRow}>
              {travellerAvatarColors.map((color) => (
                <Pressable
                  key={color}
                  onPress={() => setTravellerDraft((current) => (current ? { ...current, avatarColor: color } : current))}
                  style={[styles.colorSwatch, { backgroundColor: color }, travellerDraft.avatarColor === color ? styles.colorSelected : null]}
                />
              ))}
            </View>
            <AppButton label="Save traveller" onPress={saveCurrentModal} />
          </>
        ) : null}
      </AppModal>

      <AppModal visible={modalKind === 'invite'} title="Invite participant" onClose={() => setModalKind(null)}>
        {inviteDraft ? (
          <>
            <AppTextField
              label="Email or label"
              value={inviteDraft.email}
              onChangeText={(value) => setInviteDraft((current) => (current ? { ...current, email: value } : current))}
              placeholder="traveller@example.com"
            />
            <Text style={styles.label}>Role</Text>
            <ChoiceChips
              value={inviteDraft.role}
              onChange={(value) => setInviteDraft((current) => (current ? { ...current, role: value as ParticipantRole } : current))}
              options={participantRoleOptions}
            />
            <AppTextField
              label="Invite code"
              value={inviteDraft.inviteCode}
              onChangeText={(value) => setInviteDraft((current) => (current ? { ...current, inviteCode: value } : current))}
            />
            <AppButton label="Save invite" onPress={saveCurrentModal} />
          </>
        ) : null}
      </AppModal>

      <AppModal
        visible={modalKind === 'segment'}
        title={segmentDraft?.id ? 'Edit travel' : 'Add travel'}
        onClose={closeModal}
      >
        {segmentDraft ? (
          <>
            {renderTravelEditorFields(
              segmentDraft,
              (updater) => setSegmentDraft((current) => (current ? updater(current) : current)),
              { allowConnectionPrompt: true }
            )}
            {connectionSegmentDraft ? (
              <View style={styles.connectionSection}>
                {renderTravelEditorFields(
                  connectionSegmentDraft,
                  (updater) => setConnectionSegmentDraft((current) => (current ? updater(current) : current)),
                  {
                    sectionTitle: 'Connection details',
                    sectionSubtitle: 'Save the next flight leg with its own airports, times, and notes.',
                    allowTransportType: false,
                    allowDirection: false,
                    onRemoveConnection: removeConnectingFlightEditor,
                  }
                )}
              </View>
            ) : null}
            <AppButton label={`Save ${getTransportDisplay(segmentDraft.transportType).shortLabel.toLowerCase()}`} onPress={saveCurrentModal} />
          </>
        ) : null}
      </AppModal>

      <AppModal visible={modalKind === 'hotel'} title={hotelDraft?.id ? 'Edit hotel' : 'Add hotel'} onClose={() => setModalKind(null)}>
        {hotelDraft ? (
          <>
            <HotelAddressSearchField
              label="Hotel search"
              value={hotelDraft.address}
              onChangeText={(value) => setHotelDraft((current) => (current ? { ...current, address: value } : current))}
              onSelectResult={(result) =>
                setHotelDraft((current) =>
                  current
                    ? {
                        ...current,
                        hotelName: current.hotelName.trim() ? current.hotelName : result.hotelName,
                        address: result.address,
                        city: result.city,
                        country: result.country,
                        latitude: result.latitude,
                        longitude: result.longitude,
                      }
                    : current
                )
              }
              placeholder="Search hotel name or address"
              helper="Uses OpenStreetMap search. You can edit any result before saving."
            />
            <AppTextField
              label="Hotel name"
              value={hotelDraft.hotelName}
              onChangeText={(value) => setHotelDraft((current) => (current ? { ...current, hotelName: value } : current))}
            />
            <AppTextField
              label="Address"
              value={hotelDraft.address}
              onChangeText={(value) => setHotelDraft((current) => (current ? { ...current, address: value } : current))}
              multiline
            />
            <View style={styles.inlineFields}>
              <View style={styles.inlineField}>
                <AppTextField
                  label="City"
                  value={hotelDraft.city}
                  onChangeText={(value) => setHotelDraft((current) => (current ? { ...current, city: value } : current))}
                />
              </View>
              <View style={styles.inlineField}>
                <AppTextField
                  label="Country"
                  value={hotelDraft.country}
                  onChangeText={(value) => setHotelDraft((current) => (current ? { ...current, country: value } : current))}
                />
              </View>
            </View>
            {hotelDraft.hotelImageLocalPath || hotelDraft.hotelImageRemoteUrl ? (
              <View style={styles.hotelPreviewCard}>
                <ManagedFileImage uri={hotelDraft.hotelImageLocalPath ?? hotelDraft.hotelImageRemoteUrl} style={styles.hotelPreviewImage} />
                <Text style={styles.hotelPreviewLabel}>Current hotel image</Text>
              </View>
            ) : (
              <Text style={styles.helperText}>After save, Pineapple will try to fetch a free hotel or local-area image from the address.</Text>
            )}
            <AppTextField
              label="Phone"
              value={hotelDraft.phone}
              onChangeText={(value) => setHotelDraft((current) => (current ? { ...current, phone: value } : current))}
              keyboardType="phone-pad"
            />
            <AppTextField
              label="Booking ref"
              value={hotelDraft.bookingRef}
              onChangeText={(value) => setHotelDraft((current) => (current ? { ...current, bookingRef: value } : current))}
            />
            <DateTimeField
              label="Check-in"
              mode="date"
              value={hotelDraft.checkIn}
              onChange={(value) => setHotelDraft((current) => (current ? { ...current, checkIn: value } : current))}
            />
            <DateTimeField
              label="Check-out"
              mode="date"
              value={hotelDraft.checkOut}
              onChange={(value) => setHotelDraft((current) => (current ? { ...current, checkOut: value } : current))}
            />
            <AppTextField
              label="Notes"
              value={hotelDraft.notes}
              onChangeText={(value) => setHotelDraft((current) => (current ? { ...current, notes: value } : current))}
              multiline
            />
            <AppButton label="Save hotel" onPress={saveCurrentModal} />
          </>
        ) : null}
      </AppModal>

      <AppModal visible={modalKind === 'transfer'} title="Transfers and pickup" onClose={() => setModalKind(null)}>
        {transferDraft ? (
          <>
            <AppTextField
              label="Pickup person or company"
              value={transferDraft.provider}
              onChangeText={(value) => setTransferDraft((current) => (current ? { ...current, provider: value } : current))}
            />
            <AppTextField
              label="Transfer method"
              value={transferDraft.method}
              onChangeText={(value) => setTransferDraft((current) => (current ? { ...current, method: value } : current))}
              helper="Examples: taxi, shuttle, private driver, rail transfer."
            />
            <DateTimeField
              label="Pickup time"
              mode="datetime"
              value={transferDraft.time}
              onChange={(value) => setTransferDraft((current) => (current ? { ...current, time: value } : current))}
            />
            <AppTextField
              label="Pickup location"
              value={transferDraft.location}
              onChangeText={(value) => setTransferDraft((current) => (current ? { ...current, location: value } : current))}
            />
            <AppTextField
              label="Notes"
              value={transferDraft.notes}
              onChangeText={(value) => setTransferDraft((current) => (current ? { ...current, notes: value } : current))}
              multiline
            />
            <AppTextField
              label="Travel to departure airport (minutes)"
              value={transferDraft.airportTravelDurationMinutes}
              onChangeText={(value) =>
                setTransferDraft((current) =>
                  current ? { ...current, airportTravelDurationMinutes: value.replace(/[^\d]/g, '').slice(0, 4) } : current
                )
              }
              keyboardType="numeric"
              placeholder="e.g. 45"
              helper="Used to calculate the set-off time shown on the trip page."
            />
            <AppButton label="Save transfer" onPress={saveCurrentModal} />
          </>
        ) : null}
      </AppModal>

      <AppModal visible={modalKind === 'emergency'} title="Emergency reference" onClose={() => setModalKind(null)}>
        {emergencyDraft ? (
          <>
            <AppTextField
              label="Insurer emergency number"
              value={emergencyDraft.insurerEmergencyNumber}
              onChangeText={(value) => setEmergencyDraft((current) => (current ? { ...current, insurerEmergencyNumber: value } : current))}
              keyboardType="phone-pad"
            />
            <AppTextField
              label="Hotel phone"
              value={emergencyDraft.hotelPhone}
              onChangeText={(value) => setEmergencyDraft((current) => (current ? { ...current, hotelPhone: value } : current))}
              keyboardType="phone-pad"
            />
            <AppTextField
              label="Airline phone"
              value={emergencyDraft.airlinePhone}
              onChangeText={(value) => setEmergencyDraft((current) => (current ? { ...current, airlinePhone: value } : current))}
              keyboardType="phone-pad"
            />
            <AppTextField
              label="Local emergency note"
              value={emergencyDraft.localEmergencyNote}
              onChangeText={(value) => setEmergencyDraft((current) => (current ? { ...current, localEmergencyNote: value } : current))}
              multiline
            />
            <AppTextField
              label="Embassy / consulate note"
              value={emergencyDraft.embassyConsulateNote}
              onChangeText={(value) => setEmergencyDraft((current) => (current ? { ...current, embassyConsulateNote: value } : current))}
              multiline
            />
            <AppTextField
              label="Traveller medical note"
              value={emergencyDraft.travellerMedicalNote}
              onChangeText={(value) => setEmergencyDraft((current) => (current ? { ...current, travellerMedicalNote: value } : current))}
              multiline
            />
            <AppTextField
              label="Emergency contacts"
              value={emergencyDraft.emergencyContacts}
              onChangeText={(value) => setEmergencyDraft((current) => (current ? { ...current, emergencyContacts: value } : current))}
              multiline
            />
            <AppButton label="Save emergency info" onPress={saveCurrentModal} />
          </>
        ) : null}
      </AppModal>

      <AppModal visible={modalKind === 'export'} title="Export trip PDF" onClose={() => setModalKind(null)}>
        <Text style={styles.notes}>Choose what to include in the printable travel pack.</Text>
        <View style={styles.field}>
          <Text style={styles.label}>Emergency numbers</Text>
          <ChoiceChips<'yes' | 'no'>
            value={exportOptions.includeEmergencyNumbers ? 'yes' : 'no'}
            onChange={(value) => setExportOptions((current) => ({ ...current, includeEmergencyNumbers: value === 'yes' }))}
            options={[
              { label: 'Include', value: 'yes' },
              { label: 'Skip', value: 'no' },
            ]}
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Document numbers</Text>
          <ChoiceChips<'yes' | 'no'>
            value={exportOptions.includeDocumentNumbers ? 'yes' : 'no'}
            onChange={(value) => setExportOptions((current) => ({ ...current, includeDocumentNumbers: value === 'yes' }))}
            options={[
              { label: 'Include', value: 'yes' },
              { label: 'Skip', value: 'no' },
            ]}
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Packing summary</Text>
          <ChoiceChips<'yes' | 'no'>
            value={exportOptions.includePackingList ? 'yes' : 'no'}
            onChange={(value) => setExportOptions((current) => ({ ...current, includePackingList: value === 'yes' }))}
            options={[
              { label: 'Include', value: 'yes' },
              { label: 'Skip', value: 'no' },
            ]}
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Document references</Text>
          <ChoiceChips<'yes' | 'no'>
            value={exportOptions.includeDocumentReferences ? 'yes' : 'no'}
            onChange={(value) => setExportOptions((current) => ({ ...current, includeDocumentReferences: value === 'yes' }))}
            options={[
              { label: 'Include', value: 'yes' },
              { label: 'Skip', value: 'no' },
            ]}
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Hide sensitive values</Text>
          <ChoiceChips<'yes' | 'no'>
            value={exportOptions.hideSensitiveValues ? 'yes' : 'no'}
            onChange={(value) => setExportOptions((current) => ({ ...current, hideSensitiveValues: value === 'yes' }))}
            options={[
              { label: 'Hide', value: 'yes' },
              { label: 'Show', value: 'no' },
            ]}
          />
        </View>
        <AppButton label="Generate PDF" onPress={handleExportPdf} />
      </AppModal>

      <AppModal
        visible={transferQrVisible}
        title="Encrypted trip transfer QR"
        onClose={() => {
          setTransferQrVisible(false);
          setTransferQrPackage(null);
          setTransferQrCode(null);
        }}
      >
        {transferQrPackage?.fitsQr ? (
          <>
            <Text style={styles.notes}>Scan this with Pineapple installed on the other device, then enter the transfer code shown below.</Text>
            <View style={styles.transferQrCard}>
              <QRCodeImage value={transferQrPackage.externalUrl} size={232} />
            </View>
            {transferQrCode ? <Text style={styles.notes}>Transfer code: {transferQrCode}</Text> : null}
            <Text style={styles.helperText}>The code is not embedded in the QR. Share it separately with the receiver.</Text>
          </>
        ) : (
          <>
            <Text style={styles.notes}>This encrypted trip is too detailed to fit safely inside a QR code.</Text>
            <Text style={styles.helperText}>Use the encrypted file-share flow instead, then import the file on the receiving phone.</Text>
          </>
        )}
      </AppModal>

      <AppModal visible={sharedImportVisible} title="Decrypt shared trip" onClose={closeSharedTripImportModal}>
        <Text style={styles.notes}>Selected source: {sharedImportSourceLabel}</Text>
        <Text style={styles.helperText}>Enter the transfer code that was shared separately with the encrypted trip.</Text>
        <AppTextField
          label="Transfer code"
          value={sharedImportCode}
          onChangeText={setSharedImportCode}
          placeholder="PINE-ABCD-EFGH"
        />
        <AppButton label="Decrypt and import" onPress={() => void confirmSharedTripImport()} />
      </AppModal>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  tripContent: {
    gap: 14,
  },
  heroCard: {
    minHeight: 246,
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    shadowColor: 'rgba(5, 26, 46, 0.16)',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 4,
  },
  cover: {
    ...StyleSheet.absoluteFillObject,
  },
  coverFallback: {
    ...StyleSheet.absoluteFillObject,
  },
  coverOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  heroCopy: {
    minHeight: 246,
    justifyContent: 'space-between',
    gap: 10,
    padding: spacing.lg,
  },
  heroTitle: {
    color: colors.white,
    fontFamily: 'Poppins_700Bold',
    fontSize: 28,
    lineHeight: 32,
  },
  heroDestination: {
    color: 'rgba(255,255,255,0.9)',
    fontFamily: 'Inter_500Medium',
    fontSize: 16,
    lineHeight: 21,
  },
  heroDate: {
    color: colors.white,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    lineHeight: 20,
  },
  heroBottomRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  heroDateBlock: {
    flex: 1,
    gap: 4,
  },
  heroDateLabel: {
    color: 'rgba(255,255,255,0.78)',
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    lineHeight: 16,
  },
  heroCountdownBlock: {
    alignItems: 'flex-end',
    gap: 4,
    maxWidth: '42%',
  },
  heroCountdownLabel: {
    color: 'rgba(255,255,255,0.78)',
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'right',
  },
  heroCountdownValue: {
    color: colors.white,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
    lineHeight: 20,
    textAlign: 'right',
  },
  secondaryCardPressable: {
    width: '100%',
  },
  cardPressed: {
    transform: [{ scale: 0.992 }],
  },
  secondaryCard: {
    minHeight: 112,
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 18,
    shadowColor: 'rgba(9, 41, 69, 0.12)',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 22,
    elevation: 3,
  },
  heroMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  heroMetaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  heroMetaText: {
    color: colors.white,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    lineHeight: 16,
  },
  infoCardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  infoCard: {
    flex: 1,
    minWidth: 156,
    minHeight: 110,
    backgroundColor: colors.primaryBlue,
    borderRadius: 22,
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
    gap: 4,
  },
  infoCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoCardLabel: {
    flex: 1,
    color: colors.white,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
  },
  infoCardValue: {
    color: colors.white,
    fontFamily: 'Poppins_700Bold',
    fontSize: 20,
    lineHeight: 24,
  },
  infoCardMeta: {
    color: 'rgba(255,255,255,0.92)',
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
  },
  infoCardHint: {
    color: 'rgba(255,255,255,0.82)',
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    lineHeight: 14,
  },
  quickFactList: {
    gap: 10,
    marginTop: 2,
  },
  quickFactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  quickFactLabel: {
    color: colors.textMuted,
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
  },
  quickFactValue: {
    flexShrink: 1,
    color: colors.nightNavy,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    textAlign: 'right',
  },
  standardCardHeadline: {
    color: colors.nightNavy,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 23,
    lineHeight: 29,
  },
  standardCardMeta: {
    color: colors.primaryBlueText,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    lineHeight: 18,
  },
  notes: {
    color: colors.textMuted,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 20,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  metrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  metric: {
    minWidth: 70,
    gap: 2,
  },
  metricValue: {
    color: colors.nightNavy,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 24,
  },
  metricLabel: {
    color: colors.textMuted,
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
  },
  travellerCard: {
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  travellerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  travellerIdentity: {
    flexDirection: 'row',
    gap: spacing.sm,
    flex: 1,
  },
  travellerCopy: {
    flex: 1,
    gap: 2,
  },
  travellerName: {
    color: colors.nightNavy,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
  },
  iconRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  weatherCard: {
    overflow: 'hidden',
    borderRadius: 25,
    backgroundColor: '#D7D3D0',
    shadowColor: 'rgba(0,0,0,0.15)',
    shadowOffset: { width: 2, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 4,
  },
  weatherHeroSection: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 140,
    paddingHorizontal: 18,
    paddingVertical: spacing.md,
    backgroundColor: '#EC7263',
    overflow: 'hidden',
  },
  weatherBackground: {
    ...StyleSheet.absoluteFillObject,
  },
  weatherCircleLarge: {
    position: 'absolute',
    top: '-80%',
    right: '-50%',
    width: 300,
    height: 300,
    borderRadius: 150,
    opacity: 0.4,
    backgroundColor: '#EFC745',
  },
  weatherCircleMedium: {
    position: 'absolute',
    top: '-70%',
    right: '-30%',
    width: 210,
    height: 210,
    borderRadius: 105,
    opacity: 0.4,
    backgroundColor: '#EFC745',
  },
  weatherCircleSmall: {
    position: 'absolute',
    top: '-35%',
    right: '-8%',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#EFC745',
  },
  weatherHeroLeft: {
    flex: 1,
    gap: spacing.sm,
    zIndex: 1,
    paddingRight: spacing.sm,
  },
  weatherConditionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  weatherConditionLabel: {
    flex: 1,
    color: colors.white,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
  },
  weatherHeadlineTemp: {
    color: colors.white,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 36,
    lineHeight: 40,
  },
  weatherHeadlineRange: {
    color: 'rgba(255,255,255,0.88)',
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
  },
  weatherHeroRight: {
    alignItems: 'flex-end',
    gap: 4,
    maxWidth: '42%',
    zIndex: 1,
  },
  weatherHeroTime: {
    color: colors.white,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 28,
    lineHeight: 30,
    textAlign: 'right',
  },
  weatherHeroOffset: {
    color: 'rgba(255,255,255,0.88)',
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    lineHeight: 15,
    textAlign: 'right',
  },
  weatherHeroPlace: {
    color: colors.white,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 15,
    textAlign: 'right',
  },
  weatherHeroMeta: {
    color: 'rgba(255,255,255,0.88)',
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    textAlign: 'right',
  },
  weatherDaysSection: {
    flexDirection: 'row',
    backgroundColor: '#974859',
    gap: 2,
    paddingTop: 2,
  },
  weatherDayButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    minHeight: 56,
    backgroundColor: '#A75265',
    paddingVertical: spacing.sm,
  },
  weatherDayButtonActive: {
    backgroundColor: '#8F4055',
  },
  weatherDayButtonLabel: {
    color: 'rgba(255,255,255,0.75)',
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
  },
  weatherDayButtonTemp: {
    color: colors.white,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
  },
  quickInfoCard: {
    backgroundColor: '#EAF3FF',
    borderColor: 'rgba(99, 151, 243, 0.26)',
    shadowColor: 'rgba(6, 26, 52, 0.22)',
  },
  quickInfoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 16,
    rowGap: 14,
  },
  quickInfoCell: {
    width: '47%',
    gap: 4,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.78)',
  },
  proofScheduleList: {
    gap: 4,
  },
  hotelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  hotelThumb: {
    width: 82,
    height: 82,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: colors.primaryBlue,
  },
  hotelThumbImage: {
    width: '100%',
    height: '100%',
  },
  hotelThumbOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 28, 44, 0.24)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hotelCopy: {
    flex: 1,
    gap: 4,
  },
  hotelTitle: {
    color: colors.nightNavy,
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
  },
  hotelSubtitle: {
    color: colors.textMuted,
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 17,
  },
  hotelMeta: {
    color: colors.primaryBlueDark,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
  },
  hotelStatus: {
    color: colors.primaryBlue,
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
  },
  hotelPreviewCard: {
    gap: spacing.xs,
  },
  hotelPreviewImage: {
    width: '100%',
    height: 140,
    borderRadius: 16,
  },
  hotelPreviewLabel: {
    color: colors.textMuted,
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
  },
  helperText: {
    color: colors.textMuted,
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 17,
  },
  transferCard: {
    gap: spacing.sm,
  },
  transferRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  transferActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.md,
  },
  participantList: {
    gap: spacing.sm,
  },
  participantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingBottom: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  buttonWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  conflictList: {
    gap: spacing.sm,
  },
  conflictCard: {
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#FFF8EF',
  },
  field: {
    gap: spacing.xs,
  },
  providerPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 16,
    backgroundColor: colors.primaryBlueTint,
  },
  providerPreviewText: {
    color: colors.primaryBlueText,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
  },
  segmentSectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  segmentSectionCopy: {
    flex: 1,
    gap: 2,
  },
  segmentSectionTitle: {
    color: colors.nightNavy,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
  },
  connectionPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#CFE0FF',
    backgroundColor: colors.primaryBlueTint,
  },
  connectionPromptCopy: {
    flex: 1,
    gap: 2,
  },
  connectionPromptTitle: {
    color: colors.primaryBlueDark,
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
  },
  connectionPromptHint: {
    color: colors.textMuted,
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 16,
  },
  connectionSection: {
    marginTop: spacing.sm,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.sm,
  },
  travellerPhotoEditor: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  inlineFields: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  inlineField: {
    flex: 1,
  },
  label: {
    color: colors.nightNavy,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
  },
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  colorSwatch: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  colorSelected: {
    borderWidth: 3,
    borderColor: colors.nightNavy,
  },
  transferQrCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
  },
});
