import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { LinearGradient } from 'expo-linear-gradient';
import * as Linking from 'expo-linking';

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
import { InfoChip } from '@/components/InfoChip';
import { ListRow } from '@/components/ListRow';
import { ManagedFileImage } from '@/components/ManagedFileImage';
import { ProviderLogoBadge } from '@/components/ProviderLogoBadge';
import { TransportProviderSearchField } from '@/components/TransportProviderSearchField';
import { TypedDateField } from '@/components/TypedDateField';
import { QRCodeImage } from '@/components/ui/QRCodeImage';
import { colors, spacing } from '@/constants/theme';
import { NOTIFICATION_PROOF_BUILD_VERSION, isNotificationProofTripId } from '@/data/notificationProofBuild';
import { getVisaRequirementAssessment } from '@/content/visaRequirements';
import { getTripDocumentWarningSummary } from '@/services/documentWarnings';
import { createReminderContent, describeTransportReminderMatrix } from '@/services/notificationPlanner';
import {
  getAirportSetOffInfo,
  getDestinationLocalTimeInfo,
  getDestinationQuickFacts,
  getDestinationWeatherForecast,
  type DestinationLocalTimeInfo,
  type DestinationQuickFacts,
  type DestinationWeatherForecast,
} from '@/services/tripInsightsService';
import { createSharedTripPacket } from '@/services/sync';
import { buildTripTransferQrPayload } from '@/services/tripTransfer';
import { relationshipOptions, travellerAvatarColors } from '@/data/travellerOptions';
import { findTransportProvider } from '@/data/transportProviders';
import { useAppStore } from '@/store/useAppStore';
import type {
  EmergencyInfoDraft,
  HotelStayDraft,
  ParticipantRole,
  PdfExportOptions,
  ReminderKind,
  ReminderLeadTime,
  ReminderSettingDraft,
  TransportType,
  TravelSegmentDraft,
  TripInviteDraft,
  TravellerDraft,
} from '@/types/models';
import { createShareCode } from '@/utils/shareCodes';
import { compareIsoDates, daysLeft, daysUntil, formatDateTime, formatShortDate } from '@/utils/date';
import { getDocumentExpiryRelativeLabel } from '@/utils/documentExpiry';
import { formatAirportDisplay } from '@/utils/airports';
import { relationshipLabel, tripDateRange } from '@/utils/format';
import { getMissingInfoPrompts, getTripBundle, getUpcomingTimeline } from '@/utils/selectors';
import { getPrimaryTransportType, getTransportDisplay, isAirTransportType } from '@/utils/transport';
import { toUserMessage } from '@/utils/userErrors';
import { validateEmergencyInfo, validateHotelStay, validateTravelSegment, validateTraveller } from '@/utils/validation';
import { chooseProfilePhoto } from '@/utils/profilePhotos';
import { deleteLocalFile } from '@/utils/fileStorage';

type ModalKind = 'traveller' | 'segment' | 'hotel' | 'transfer' | 'emergency' | 'export' | 'invite' | null;
type TripSection = 'overview' | 'travel' | 'hotel' | 'transfer' | 'packing' | 'itinerary' | 'vibes';
type TransferDraft = {
  provider: string;
  method: string;
  location: string;
  time: string | null;
  airportTravelDurationMinutes: string;
  notes: string;
};

type VisibleTripReminderKind = Exclude<
  ReminderKind,
  'passport_expiry' | 'ghic_expiry' | 'trip_starts_tomorrow' | 'flight_check_in'
>;

const reminderMeta: Record<
  VisibleTripReminderKind,
  { label: string; leadTimeDays: ReminderLeadTime; legacyKinds?: ReminderKind[]; subtitle?: string }
> = {
  trip_countdown_30_days: { label: '30 days to trip', leadTimeDays: 30 },
  trip_countdown_7_days: { label: '7 days to trip', leadTimeDays: 7 },
  packing_incomplete: { label: 'Packing reminder', leadTimeDays: 6 },
  trip_countdown_3_days: { label: '3 days to trip', leadTimeDays: 3 },
  trip_countdown_1_day: { label: '1 day to trip', leadTimeDays: 1, legacyKinds: ['trip_starts_tomorrow'] },
  trip_today: { label: 'Trip day reminder', leadTimeDays: 0 },
  insurance_missing: { label: 'Missing insurance warning', leadTimeDays: 7 },
  transport_departure: {
    label: 'Transport departure alerts',
    leadTimeDays: 0,
    legacyKinds: ['flight_check_in'],
    subtitle: 'Flights, ferries, Eurotunnel: 7d, 3d, 2d, 1d, 2h, 1h, 15m. Trains and taxis: 1h, 15m.',
  },
  hotel_check_in: { label: 'Hotel check-in reminder', leadTimeDays: 0 },
  transfer_reminder: { label: 'Transfer reminder', leadTimeDays: 0 },
  travel_mode_reminder: { label: 'Travel mode reminder', leadTimeDays: 0 },
  sos_ready: { label: 'SOS tools reminder', leadTimeDays: 0 },
  excursion_reminder: { label: 'Excursion reminder', leadTimeDays: 1 },
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

function formatTemperatureRange(minTemp: number | null, maxTemp: number | null) {
  if (minTemp === null || maxTemp === null) {
    return 'Temperature unavailable';
  }

  return `${Math.round(minTemp)}° / ${Math.round(maxTemp)}°`;
}

function compactWeatherDayLabel(dayLabel: string) {
  const token = dayLabel.split(' ')[0]?.trim();
  return (token || dayLabel).slice(0, 3).toUpperCase();
}

function quickFactValue(value: string | null | undefined, fallback = 'Unavailable') {
  return value?.trim() || fallback;
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
    setActiveTrip,
    saveTrip,
    saveTraveller,
    saveTravelSegment,
    saveHotelStay,
    saveEmergencyInfo,
    saveReminderSetting,
    exportTripPdfFile,
    saveTripInvite,
    exportSharedTripFile,
    importSharedTripFile,
    resolveSyncConflictChoice,
    deleteRecord,
  } = useAppStore();
  const bundle = getTripBundle(data, tripId);
  const missingPrompts = getMissingInfoPrompts(data, tripId);
  const timeline = getUpcomingTimeline(data, tripId);
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
  const [visaModalVisible, setVisaModalVisible] = useState(false);
  const [travellerPhotoBaselineUri, setTravellerPhotoBaselineUri] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<TripSection>('overview');
  const [destinationTimeInfo, setDestinationTimeInfo] = useState<DestinationLocalTimeInfo | null>(null);
  const [destinationWeather, setDestinationWeather] = useState<DestinationWeatherForecast | null>(null);
  const [destinationQuickFacts, setDestinationQuickFacts] = useState<DestinationQuickFacts | null>(null);
  const [selectedWeatherDate, setSelectedWeatherDate] = useState<string | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const tripScrollRef = useRef<ScrollView | null>(null);
  const sectionOffsets = useRef<Partial<Record<TripSection, number>>>({});
  const isNotificationProofTrip = isNotificationProofTripId(tripId);
  const highlightedSegmentId = typeof segmentId === 'string' ? segmentId : null;

  const summary = useMemo(
    () => ({
      documents: bundle.documents.length,
      travellers: bundle.travellers.length,
      packing: bundle.packingItems.length,
      itinerary: bundle.itineraryEvents.length,
    }),
    [bundle.documents.length, bundle.itineraryEvents.length, bundle.packingItems.length, bundle.travellers.length]
  );
  const documentSummary = useMemo(
    () => getTripDocumentWarningSummary(bundle.documents, bundle.travellers),
    [bundle.documents, bundle.travellers]
  );
  const orderedTravelSegments = useMemo(
    () =>
      [...bundle.travelSegments].sort((left, right) => {
        const leftOrder = left.travelDirection === 'outbound' ? 0 : left.travelDirection === 'return' ? 1 : 2;
        const rightOrder = right.travelDirection === 'outbound' ? 0 : right.travelDirection === 'return' ? 1 : 2;
        if (leftOrder !== rightOrder) {
          return leftOrder - rightOrder;
        }
        return compareIsoDates(left.departureTime, right.departureTime);
      }),
    [bundle.travelSegments]
  );
  const primaryTransportType = useMemo(() => getPrimaryTransportType(bundle.travelSegments), [bundle.travelSegments]);
  const primaryPassportCountryCode = useMemo(
    () => bundle.documents.find((document) => document.documentType === 'passport')?.passportData?.countryCode ?? null,
    [bundle.documents]
  );
  const visaAssessment = useMemo(
    () => (trip ? getVisaRequirementAssessment(trip.destination, primaryPassportCountryCode) : null),
    [primaryPassportCountryCode, trip]
  );
  const primaryTransportDisplay = useMemo(
    () => (primaryTransportType ? getTransportDisplay(primaryTransportType) : null),
    [primaryTransportType]
  );
  const plannedTransportReminders = useMemo(
    () => createReminderContent(data, { now: new Date() }).filter((item) => item.transportSegmentId && item.activeTripId === tripId),
    [data, tripId]
  );
  const transportReminderPreviewBySegment = useMemo(() => {
    const preview = new Map<string, typeof plannedTransportReminders>();
    for (const reminder of plannedTransportReminders) {
      const targetSegmentId = reminder.transportSegmentId;
      if (!targetSegmentId) {
        continue;
      }
      const entries = preview.get(targetSegmentId) ?? [];
      entries.push(reminder);
      preview.set(targetSegmentId, entries);
    }
    return preview;
  }, [plannedTransportReminders]);
  const notificationProofSchedule = useMemo(
    () =>
      orderedTravelSegments.flatMap((segment) =>
        (transportReminderPreviewBySegment.get(segment.id) ?? []).slice(0, 3).map((reminder) => ({
          label: reminder.title,
          at: formatDateTime(reminder.date.toISOString()),
        }))
      ),
    [orderedTravelSegments, transportReminderPreviewBySegment]
  );

  useEffect(() => {
    if (focus === 'travel' || focus === 'hotel' || focus === 'transfer') {
      setActiveSection(focus);
      return;
    }
    setActiveSection('overview');
  }, [focus]);

  useEffect(() => {
    if (visaAssessment?.tone === 'warning') {
      setVisaModalVisible(true);
    }
  }, [visaAssessment]);
  const departureDays = trip ? daysUntil(trip.startDate) : null;
  const remainingDays = trip ? daysLeft(trip.endDate) : null;
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
  const tripTransferQr = useMemo(() => {
    if (!trip) {
      return null;
    }

    try {
      const packet = createSharedTripPacket(data, tripId);
      return buildTripTransferQrPayload(JSON.stringify(packet));
    } catch {
      return null;
    }
  }, [data, trip, tripId]);

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

  function scrollToSection(section: TripSection, animated = true) {
    const offset = sectionOffsets.current[section];
    if (typeof offset !== 'number') {
      return;
    }

    tripScrollRef.current?.scrollTo({
      y: Math.max(offset - spacing.lg, 0),
      animated,
    });
  }

  function handleSectionLayout(section: TripSection) {
    return (event: LayoutChangeEvent) => {
      sectionOffsets.current[section] = event.nativeEvent.layout.y;

      if (activeSection === section && (section === 'travel' || section === 'hotel' || section === 'transfer')) {
        scrollToSection(section, false);
      }
    };
  }

  useEffect(() => {
    if (activeSection === 'travel' || activeSection === 'hotel' || activeSection === 'transfer') {
      const frame = requestAnimationFrame(() => scrollToSection(activeSection));
      return () => cancelAnimationFrame(frame);
    }
  }, [activeSection]);

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

  async function toggleReminder(kind: VisibleTripReminderKind) {
    if (!(kind in reminderMeta)) {
      return;
    }

    const base = reminderMeta[kind];
    const targetKinds = [kind, ...(base.legacyKinds ?? [])];
    const existing = bundle.reminderSettings.find((setting) => targetKinds.includes(setting.kind) && setting.tripId === tripId);
    const exactSetting = bundle.reminderSettings.find((setting) => setting.kind === kind && setting.tripId === tripId);
    const nextEnabled = !(existing?.enabled ?? false);

    await saveReminderSetting(
      exactSetting
        ? { ...exactSetting, enabled: nextEnabled }
        : {
            tripId,
            kind,
            enabled: nextEnabled,
            leadTimeDays: base.leadTimeDays,
          }
    );

    if (base.legacyKinds?.length) {
      await Promise.all(
        base.legacyKinds.map((legacyKind) =>
          saveReminderSetting(
            bundle.reminderSettings.find((setting) => setting.kind === legacyKind && setting.tripId === tripId) ?? {
              tripId,
              kind: legacyKind,
              enabled: false,
              leadTimeDays: base.leadTimeDays,
            }
          )
        )
      );
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
    try {
      await exportSharedTripFile(tripId);
      Alert.alert('Trip ready to share', 'Pineapple created a local share file and opened Android sharing so you can use Quick Share, Nearby Share, or another app.');
    } catch (error) {
      Alert.alert('Share export failed', toUserMessage(error, 'Unable to export that shared trip right now.'));
    }
  }

  function openTransferQr() {
    if (!tripTransferQr) {
      Alert.alert('Transfer QR unavailable', 'Pineapple could not prepare a transfer QR for this trip right now.');
      return;
    }

    setTransferQrVisible(true);
  }

  async function handleImportShare() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/json', '*/*'],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets[0]) {
        return;
      }

      const contents = await FileSystem.readAsStringAsync(result.assets[0].uri);
      const outcome = await importSharedTripFile(contents);
      if (outcome.mode === 'conflict') {
        Alert.alert('Conflict detected', 'The incoming shared trip was stored for manual conflict review.');
      } else {
        Alert.alert('Shared trip imported', 'Trip data was updated from the incoming share file.');
      }
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
    <AppScreen
      scrollRef={tripScrollRef}
      footer={
        <View style={styles.tripFooterNav}>
          <Pressable
            onPress={() => {
              setActiveTrip(tripId);
              setActiveSection('packing');
              router.push('/packing');
            }}
            style={[styles.tripFooterButton, activeSection === 'packing' ? styles.tripFooterButtonActive : null]}
          >
            <MaterialIcons name="checkroom" size={22} color={colors.white} />
            <Text style={styles.tripFooterLabel}>Packing</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              setActiveTrip(tripId);
              setActiveSection('vibes');
              router.push({ pathname: '/trip/[tripId]/vibes', params: { tripId } });
            }}
            style={[styles.tripFooterButton, activeSection === 'vibes' ? styles.tripFooterButtonActive : null]}
          >
            <MaterialIcons name="explore" size={22} color={colors.white} />
            <Text style={styles.tripFooterLabel}>Vibes</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              setActiveSection('travel');
              scrollToSection('travel');
            }}
            style={[styles.tripFooterButton, activeSection === 'travel' ? styles.tripFooterButtonActive : null]}
          >
            <MaterialIcons name={(primaryTransportDisplay?.cardIcon ?? 'flight') as any} size={22} color={colors.white} />
            <Text style={styles.tripFooterLabel}>{primaryTransportDisplay?.shortLabel ?? 'Travel'}</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              setActiveSection('hotel');
              scrollToSection('hotel');
            }}
            style={[styles.tripFooterButton, activeSection === 'hotel' ? styles.tripFooterButtonActive : null]}
          >
            <MaterialIcons name="hotel" size={22} color={colors.white} />
            <Text style={styles.tripFooterLabel}>Hotel</Text>
          </Pressable>
        </View>
      }
    >
      <View style={styles.heroCard}>
        {trip.destinationImageLocalPath ?? trip.coverImageUri ? (
          <ManagedFileImage uri={trip.destinationImageLocalPath ?? trip.coverImageUri} style={styles.cover} />
        ) : null}
        <LinearGradient colors={tripHeroGradient(trip.destinationType)} style={styles.coverFallback} />
        <LinearGradient colors={['rgba(10, 28, 44, 0.14)', 'rgba(10, 28, 44, 0.74)']} style={styles.coverOverlay} />
        <View style={styles.heroCopy}>
          <Text style={styles.heroDestination}>{trip.destination.toUpperCase()}</Text>
          <Text style={styles.heroTitle}>{trip.name}</Text>
          <Text style={styles.heroDate}>{tripDateRange(trip.startDate, trip.endDate)}</Text>
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
            style={styles.weatherHeroSection}
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
                style={[styles.weatherDayButton, selectedWeatherDay?.date === day.date ? styles.weatherDayButtonActive : null]}
              >
                <Text style={styles.weatherDayButtonLabel}>{compactWeatherDayLabel(day.dayLabel)}</Text>
                <MaterialIcons name={weatherIconName(day.weatherCode) as any} size={18} color={colors.white} />
              </Pressable>
            ))}
          </View>
        </View>
      ) : (
        <AppCard title="7-day weather" subtitle={trip.destination}>
          <EmptyState
            title={insightsLoading ? 'Loading destination weather' : 'Weather unavailable'}
            description={
              insightsLoading
                ? 'Checking the next 7 days for this destination.'
                : 'We could not load a forecast for this destination right now.'
            }
          />
          {destinationTimeInfo ? (
            <Text style={styles.notes}>
              Local time {destinationTimeInfo.localTimeLabel} • {destinationTimeInfo.offsetLabel}
            </Text>
          ) : null}
        </AppCard>
      )}

      <View style={styles.infoCardGrid}>
        <View style={styles.infoCard}>
          <View style={styles.infoCardHeader}>
            <MaterialIcons name="public" size={16} color={colors.white} />
            <Text style={styles.infoCardLabel}>Quick facts</Text>
          </View>
          <View style={styles.quickFactList}>
            <View style={styles.quickFactRow}>
              <Text style={styles.quickFactLabel}>Language</Text>
              <Text style={styles.quickFactValue}>{quickFactValue(destinationQuickFacts?.languageLabel, insightsLoading ? 'Checking…' : 'Unavailable')}</Text>
            </View>
            <View style={styles.quickFactRow}>
              <Text style={styles.quickFactLabel}>Currency</Text>
              <Text style={styles.quickFactValue}>{quickFactValue(destinationQuickFacts?.currencyLabel, insightsLoading ? 'Checking…' : 'Unavailable')}</Text>
            </View>
            <View style={styles.quickFactRow}>
              <Text style={styles.quickFactLabel}>Plug</Text>
              <Text style={styles.quickFactValue}>{quickFactValue(destinationQuickFacts?.plugLabel, insightsLoading ? 'Checking…' : 'Unavailable')}</Text>
            </View>
            <View style={styles.quickFactRow}>
              <Text style={styles.quickFactLabel}>Emergency</Text>
              <Text style={styles.quickFactValue}>{quickFactValue(destinationQuickFacts?.emergencyLabel, insightsLoading ? 'Checking…' : 'Unavailable')}</Text>
            </View>
          </View>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoCardHeader}>
            <MaterialIcons name="departure-board" size={16} color={colors.white} />
            <Text style={styles.infoCardLabel}>Airport set-off time</Text>
          </View>
          <Text style={styles.infoCardValue}>{airportSetOffInfo.timeLabel}</Text>
          <Text style={styles.infoCardMeta}>
            {airportSetOffInfo.status === 'available' ? airportSetOffInfo.departureLabel : 'Departure details needed'}
          </Text>
          <Text style={styles.infoCardHint}>{airportSetOffInfo.helperLabel}</Text>
        </View>
      </View>

      <AppCard>
        <View style={styles.chipRow}>
          <InfoChip
            label={
              trip.status === 'completed'
                ? 'Completed trip'
                : departureDays === null
                  ? 'Departure date unavailable'
                  : departureDays > 0
                  ? `${departureDays} day(s) until departure`
                  : 'Trip in progress'
            }
            tone={trip.status === 'completed' ? 'default' : 'blue'}
          />
          <InfoChip
            label={remainingDays === null ? 'Trip dates unavailable' : remainingDays >= 0 ? `${remainingDays} day(s) left` : 'Trip ended'}
            tone={remainingDays !== null && remainingDays > 0 ? 'gold' : 'default'}
          />
        </View>
        <View style={styles.participantRow}>
          {bundle.participants.slice(0, 5).map((participant) => (
            <AvatarBadge key={participant.id} label={participant.displayName} color={participant.avatarColor} size={34} />
          ))}
          {bundle.participants.length ? (
            <Text style={styles.notes}>{bundle.participants.length} participant(s) in this shared trip space</Text>
          ) : null}
        </View>
        <Text style={styles.notes}>
          {trip.notes || (trip.status === 'completed' ? 'This trip is complete and kept locally for reference.' : 'Add notes, reminders, and local context for the trip.')}
        </Text>
      </AppCard>

      {visaAssessment ? (
        <AppCard title={visaAssessment.tone === 'warning' ? 'Visa warning' : 'Visa check'}>
          <Text style={styles.notes}>{visaAssessment.body}</Text>
          <Text style={styles.notes}>Official source: {visaAssessment.officialSourceLabel}</Text>
          <AppButton
            label="Open official guidance"
            tone={visaAssessment.tone === 'warning' ? 'primary' : 'secondary'}
            onPress={() => {
              void Linking.openURL(visaAssessment.officialUrl);
            }}
          />
        </AppCard>
      ) : null}

      <AppCard title="Trip overview">
        <View style={styles.metrics}>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>{summary.travellers}</Text>
            <Text style={styles.metricLabel}>Travellers</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>{summary.documents}</Text>
            <Text style={styles.metricLabel}>Documents</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>{summary.packing}</Text>
            <Text style={styles.metricLabel}>Packing</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>{summary.itinerary}</Text>
            <Text style={styles.metricLabel}>Timeline</Text>
          </View>
        </View>
      </AppCard>

      {timeline.length ? (
        <AppCard title="Upcoming timeline" subtitle="What matters next for this trip.">
          {timeline.map((item) => (
            <ListRow key={item.id} title={item.title} subtitle={`${formatDateTime(item.dateTime)} • ${item.subtitle}`} />
          ))}
        </AppCard>
      ) : null}

      {missingPrompts.length ? (
        <AppCard title="Missing info prompts">
          {missingPrompts.map((prompt) => (
            <Text key={prompt} style={styles.notes}>
              • {prompt}
            </Text>
          ))}
        </AppCard>
      ) : null}

      <AppCard title="Travellers" right={<AppButton label="Add" tone="secondary" onPress={() => openTravellerEditor()} />}>
        {bundle.travellers.length ? (
          bundle.travellers.map((traveller) => (
            <View key={traveller.id} style={styles.travellerCard}>
              <View style={styles.travellerHeader}>
                <View style={styles.travellerIdentity}>
                  <AvatarBadge label={traveller.fullName} color={traveller.avatarColor} imageUri={traveller.photoUri} size={42} />
                  <View style={styles.travellerCopy}>
                    <Text style={styles.travellerName}>{traveller.fullName}</Text>
                    <Text style={styles.notes}>
                      {relationshipLabel(traveller.relationshipType)}
                      {traveller.passportNationality ? ` • ${traveller.passportNationality}` : ''}
                      {traveller.dateOfBirth ? ` • ${formatShortDate(traveller.dateOfBirth)}` : ''}
                    </Text>
                  </View>
                </View>
                <View style={styles.iconRow}>
                  <Pressable onPress={() => openTravellerEditor(traveller)}>
                    <MaterialIcons name="edit" size={18} color={colors.nightNavy} />
                  </Pressable>
                  <Pressable onPress={() => deleteRecord('travellers', traveller.id)}>
                    <MaterialIcons name="delete-outline" size={18} color={colors.danger} />
                  </Pressable>
                </View>
              </View>
              <View style={styles.chipRow}>
                {traveller.passportNumber ? <InfoChip label={`Passport ${traveller.passportNumber.slice(-4)}`} tone="blue" /> : null}
                {traveller.ghicNumber ? <InfoChip label={`GHIC ${traveller.ghicNumber.slice(-4)}`} tone="gold" /> : null}
                {traveller.medicalNote ? <InfoChip label="Medical note" tone="coral" /> : null}
              </View>
              {traveller.notes ? <Text style={styles.notes}>{traveller.notes}</Text> : null}
            </View>
          ))
        ) : (
          <EmptyState
            title="No travellers yet"
            description="Add adults, children, infants, and other traveller profiles with badges, passport nationality, DOB, and notes."
          />
        )}
      </AppCard>

      <AppCard title="Documents" subtitle="Secure vault for passports, GHIC, insurance, tickets, and PDFs">
        <ListRow
          title={`${bundle.documents.length} document(s)`}
          subtitle="Sensitive previews stay hidden until the vault is unlocked."
        />
        {(documentSummary.expiringCount || documentSummary.expiredCount || documentSummary.missingExpiryCount || documentSummary.missingInsuranceTravellers.length) ? (
          <>
            <View style={styles.chipRow}>
              {documentSummary.expiringCount ? <InfoChip label={`${documentSummary.expiringCount} document(s) expiring soon`} tone="gold" /> : null}
              {documentSummary.expiredCount ? <InfoChip label={`${documentSummary.expiredCount} expired`} tone="danger" /> : null}
              {documentSummary.missingExpiryCount ? <InfoChip label={`${documentSummary.missingExpiryCount} need expiry dates`} tone="coral" /> : null}
            </View>
            {documentSummary.warningItems.slice(0, 3).map((item) => {
              const noun = documentTypeLabels[item.document.documentType as keyof typeof documentTypeLabels] ?? 'document';
              return (
                <Text key={item.document.id} style={styles.notes}>
                  {item.ownerLabel} • {noun} • {getDocumentExpiryRelativeLabel(item.document.expiryDate)}
                </Text>
              );
            })}
            {documentSummary.missingInsuranceTravellers.slice(0, 2).map((traveller) => (
              <Text key={traveller.id} style={styles.notes}>
                {traveller.fullName} has no insurance document.
              </Text>
            ))}
          </>
        ) : null}
        <AppButton
          label="Open vault"
          onPress={() => {
            setActiveTrip(tripId);
            router.push('/vault');
          }}
        />
      </AppCard>

      <View onLayout={handleSectionLayout('travel')}>
      <AppCard
        title="Travel plans"
        subtitle="Add flights, trains, driving legs, and taxi hops with the right icon, timing, and booking context."
        right={<AppButton label="Add" tone="secondary" onPress={() => openSegmentEditor()} />}
        style={activeSection === 'travel' ? styles.highlightedCard : null}
      >
        {orderedTravelSegments.length ? (
          orderedTravelSegments.map((segment) => {
            const providerBrand = findTransportProvider(segment.providerCode, segment.transportType);
            const transportDisplay = getTransportDisplay(segment.transportType);
            const segmentReminderPreview = transportReminderPreviewBySegment.get(segment.id) ?? [];
            const isHighlightedSegment = highlightedSegmentId === segment.id;
            return (
              <View
                key={segment.id}
                style={[styles.transportRow, isHighlightedSegment ? styles.highlightedTransportRow : null]}
              >
                <ProviderLogoBadge
                  name={segment.airline || transportDisplay.shortLabel}
                  code={segment.providerCode}
                  logoXml={providerBrand?.logoXml ?? null}
                  logoUrl={segment.providerLogoUrl}
                  accentColor={providerBrand?.accentColor ?? null}
                />
                <View style={styles.transportCopy}>
                  <View style={styles.transportHeader}>
                    <Text style={styles.transportTitle}>
                      {transportDisplay.label} · {segmentDirectionLabel(segment.travelDirection, segment.transportType)}
                    </Text>
                    <InfoChip label={transportDisplay.shortLabel} tone="blue" />
                  </View>
                  <Text style={styles.transportMeta}>
                    {[segment.airline, segment.flightNumber].filter(Boolean).join(' ')}
                  </Text>
                  <Text style={styles.transportMeta}>
                    {formatAirportDisplay(segment.departureAirport, segment.departureAirportCode)} →{' '}
                    {formatAirportDisplay(segment.arrivalAirport, segment.arrivalAirportCode)}
                  </Text>
                  <View style={styles.transportTimingRow}>
                    <MaterialIcons
                      name={transportDisplay.departureIcon as any}
                      size={14}
                      color={colors.primaryBlueDark}
                    />
                    <Text style={styles.transportMeta}>Departure {formatDateTime(segment.departureTime)}</Text>
                  </View>
                  <View style={styles.transportTimingRow}>
                    <MaterialIcons
                      name={transportDisplay.arrivalIcon as any}
                      size={14}
                      color={colors.primaryBlueDark}
                    />
                    <Text style={styles.transportMeta}>Arrival {formatDateTime(segment.arrivalTime)}</Text>
                  </View>
                  <Text style={styles.transportAlertSummary}>
                    {segment.notificationSummary || `Lock screen alerts ${describeTransportReminderMatrix(segment.transportType)}`}
                  </Text>
                  {segmentReminderPreview.length ? (
                    <View style={styles.transportReminderList}>
                      {segmentReminderPreview.slice(0, 3).map((reminder) => (
                        <Text key={reminder.key} style={styles.transportReminderText}>
                          Next: {reminder.title} • {formatDateTime(reminder.date.toISOString())}
                        </Text>
                      ))}
                    </View>
                  ) : (
                    <Text style={styles.transportReminderText}>No future alerts are scheduled for this segment right now.</Text>
                  )}
                </View>
                <View style={styles.iconRow}>
                  <Pressable onPress={() => openSegmentEditor(segment)}>
                    <MaterialIcons name="edit" size={18} color={colors.nightNavy} />
                  </Pressable>
                  <Pressable onPress={() => deleteRecord('travel_segments', segment.id)}>
                    <MaterialIcons name="delete-outline" size={18} color={colors.danger} />
                  </Pressable>
                </View>
              </View>
            );
          })
        ) : (
          <EmptyState
            title="No transport saved"
            description="Add the main way you are travelling so Pineapple can show the right icon, timing, and direction across the trip."
          />
        )}
      </AppCard>
      </View>

      <View onLayout={handleSectionLayout('hotel')}>
      <AppCard
        title="Hotel info"
        subtitle="Search or enter the stay address, then keep the details and image together."
        right={<AppButton label="Add" tone="secondary" onPress={() => openHotelEditor()} />}
        style={activeSection === 'hotel' ? styles.highlightedCard : null}
      >
        {bundle.hotelStays.length ? (
          bundle.hotelStays.map((hotel) => (
            <View key={hotel.id} style={styles.hotelRow}>
              <View style={styles.hotelThumb}>
                {hotel.hotelImageLocalPath || hotel.hotelImageRemoteUrl ? (
                  <ManagedFileImage uri={hotel.hotelImageLocalPath ?? hotel.hotelImageRemoteUrl} style={styles.hotelThumbImage} />
                ) : null}
                <View style={styles.hotelThumbOverlay}>
                  <MaterialIcons name="hotel" size={18} color={colors.white} />
                </View>
              </View>
              <View style={styles.hotelCopy}>
                <Text style={styles.hotelTitle}>{hotel.hotelName}</Text>
                <Text style={styles.hotelSubtitle}>{hotel.address}</Text>
                <Text style={styles.hotelMeta}>
                  {formatShortDate(hotel.checkIn)} to {formatShortDate(hotel.checkOut)}
                </Text>
                {hotel.hotelImageStatus === 'loading' ? <Text style={styles.hotelStatus}>Finding a free hotel image</Text> : null}
              </View>
              <View style={styles.iconRow}>
                <Pressable onPress={() => openHotelEditor(hotel)}>
                  <MaterialIcons name="edit" size={18} color={colors.nightNavy} />
                </Pressable>
                <Pressable onPress={() => deleteRecord('hotel_stays', hotel.id)}>
                  <MaterialIcons name="delete-outline" size={18} color={colors.danger} />
                </Pressable>
              </View>
            </View>
          ))
        ) : (
          <EmptyState
            title="No hotel saved"
            description="Search by hotel name or address, then review and save the stay details."
          />
        )}
      </AppCard>
      </View>

      <View onLayout={handleSectionLayout('transfer')}>
      <AppCard
        title="Transfers and pickup"
        subtitle="Airport pickup, rail transfer, local ride, or handoff details."
        right={<AppButton label={trip.transferProvider || trip.transferLocation ? 'Edit' : 'Add'} tone="secondary" onPress={openTransferEditor} />}
        style={activeSection === 'transfer' ? styles.highlightedCard : null}
      >
        {trip.transferProvider || trip.transferLocation || trip.transferNotes ? (
          <View style={styles.transferCard}>
            <View style={styles.transferRow}>
              <InfoChip label={trip.transferMethod || 'Transfer'} tone="blue" />
              {trip.transferTime ? <InfoChip label={formatDateTime(trip.transferTime)} tone="gold" /> : null}
            </View>
            <Text style={styles.transportTitle}>{trip.transferProvider || 'Transfer provider not set'}</Text>
            <Text style={styles.transportMeta}>{trip.transferLocation || 'Pickup location not set'}</Text>
            {trip.transferNotes ? <Text style={styles.notes}>{trip.transferNotes}</Text> : null}
            <View style={styles.transferActions}>
              <Pressable onPress={openTransferEditor}>
                <MaterialIcons name="edit" size={18} color={colors.nightNavy} />
              </Pressable>
              <Pressable
                onPress={() =>
                  void saveTrip({
                    ...trip,
                    transferSummary: '',
                    transferProvider: '',
                    transferMethod: '',
                    transferLocation: '',
                    transferTime: null,
                    airportTravelDurationMinutes: null,
                    transferNotes: '',
                  })
                }
              >
                <MaterialIcons name="delete-outline" size={18} color={colors.danger} />
              </Pressable>
            </View>
          </View>
        ) : (
          <EmptyState
            title="No transfer details saved"
            description="Add pickup company, time, location, method, and notes so they are easy to reach from the trip card."
          />
        )}
      </AppCard>
      </View>

      <AppCard title="Packing" subtitle="Category-based list with traveller assignment, templates, and priority flags." style={activeSection === 'packing' ? styles.highlightedCard : null}>
        <ListRow title={`${bundle.packingItems.length} item(s)`} subtitle="Track packed vs unpacked and per-traveller progress." />
        <AppButton
          label="Open packing"
          onPress={() => {
            setActiveTrip(tripId);
            router.push('/packing');
          }}
        />
      </AppCard>

      <AppCard title="Itinerary" subtitle="Chronological timeline for excursions, meals, reminders, and tickets." style={activeSection === 'itinerary' ? styles.highlightedCard : null}>
        <ListRow title={`${bundle.itineraryEvents.length} itinerary item(s)`} subtitle="Everything in one timeline view." />
        <AppButton
          label="Open itinerary"
          onPress={() => {
            setActiveTrip(tripId);
            router.push('/itinerary');
          }}
        />
      </AppCard>

      <AppCard title="Emergency" right={<AppButton label="Edit" tone="secondary" onPress={openEmergencyEditor} />}>
        {bundle.emergencyInfo ? (
          <>
            <Text style={styles.notes}>Insurer: {bundle.emergencyInfo.insurerEmergencyNumber || 'Not set'}</Text>
            <Text style={styles.notes}>Hotel: {bundle.emergencyInfo.hotelPhone || 'Not set'}</Text>
            <Text style={styles.notes}>Airline: {bundle.emergencyInfo.airlinePhone || 'Not set'}</Text>
            <Text style={styles.notes}>{bundle.emergencyInfo.localEmergencyNote || 'Add local emergency note.'}</Text>
          </>
        ) : (
          <EmptyState
            title="No emergency reference yet"
            description="Add insurer, hotel and airline phone numbers, medical notes, local emergency advice, and embassy details."
          />
        )}
      </AppCard>

      <AppCard title="Travel Mode" subtitle="Family overview plus traveller-specific details with quick copy actions.">
        <AppButton label="Open Travel Mode" onPress={() => router.push({ pathname: '/trip/[tripId]/travel-mode', params: { tripId } })} />
      </AppCard>

      <AppCard title="Travel pack PDF" subtitle="Export a clean branded trip summary without full document images.">
        <AppButton label="Export trip PDF" onPress={() => setModalKind('export')} />
      </AppCard>

      {isNotificationProofTrip ? (
        <AppCard
          title="Notification proof build"
          subtitle={`Temporary seeded trip for real Android lock-screen verification in Pineapple ${NOTIFICATION_PROOF_BUILD_VERSION}.`}
        >
          <Text style={styles.notes}>
            Turn on `Enable local reminders`, keep this trip’s reminders enabled, then lock the phone. Pineapple compresses the normal reminder windows
            into a short local test run so you can verify multiple notifications in minutes on the installed APK.
          </Text>
          {notificationProofSchedule.length ? (
            <View style={styles.proofScheduleList}>
              {notificationProofSchedule.slice(0, 8).map((entry) => (
                <Text key={`${entry.label}:${entry.at}`} style={styles.notes}>
                  • {entry.label} at {entry.at}
                </Text>
              ))}
            </View>
          ) : null}
          <Text style={styles.notes}>This seeded trip is temporary and should be removed again after notification proofing is complete.</Text>
        </AppCard>
      ) : null}

      <AppCard
        title="Trip reminders"
        subtitle="Transport alerts appear on the lock screen when device notifications are allowed. Edit any segment and Pineapple replaces its old alerts with the new schedule."
      >
        {Object.entries(reminderMeta).map(([kind, meta]) => {
          const enabled =
            bundle.reminderSettings.find(
              (setting) => setting.tripId === tripId && [kind, ...(meta.legacyKinds ?? [])].includes(setting.kind)
            )?.enabled ?? false;
          return (
            <ListRow
              key={kind}
              title={meta.label}
              subtitle={meta.subtitle ?? formatReminderLeadTimeLabel(meta.leadTimeDays)}
              right={
                <AppButton
                  label={enabled ? 'On' : 'Off'}
                  tone={enabled ? 'primary' : 'secondary'}
                  onPress={() => toggleReminder(kind as VisibleTripReminderKind)}
                />
              }
            />
          );
        })}
      </AppCard>

      <AppCard title="Sharing and participants" subtitle="Share locally with Pineapple QR transfer, Android Quick Share, or an exported trip file.">
        <View style={styles.chipRow}>
          <InfoChip label={`Share code ${bundle.sharedTripState?.shareCode ?? 'Pending'}`} tone="blue" />
          <InfoChip
            label={`Sync ${bundle.sharedTripState?.syncStatus.replaceAll('_', ' ') ?? 'local only'}`}
            tone={bundle.sharedTripState?.syncStatus === 'conflict' ? 'coral' : 'gold'}
          />
        </View>
        <View style={styles.participantList}>
          {bundle.participants.map((participant) => (
            <View key={participant.id} style={styles.participantItem}>
              <View style={styles.travellerIdentity}>
                <AvatarBadge label={participant.displayName} color={participant.avatarColor} size={38} />
                <View style={styles.travellerCopy}>
                  <Text style={styles.travellerName}>{participant.displayName}</Text>
                  <Text style={styles.notes}>
                    {participant.role}
                    {participant.email ? ` • ${participant.email}` : ''}
                  </Text>
                </View>
              </View>
              {!participant.isLocalProfile ? (
                <Pressable onPress={() => deleteRecord('trip_participants', participant.id)}>
                  <MaterialIcons name="delete-outline" size={18} color={colors.danger} />
                </Pressable>
              ) : null}
            </View>
          ))}
          {bundle.invites.map((invite) => (
            <View key={invite.id} style={styles.participantItem}>
              <View style={styles.travellerCopy}>
                <Text style={styles.travellerName}>{invite.email || 'Pending invite'}</Text>
                <Text style={styles.notes}>
                  {invite.role} • {invite.status} • code {invite.inviteCode}
                </Text>
              </View>
              <Pressable onPress={() => deleteRecord('trip_invites', invite.id)}>
                <MaterialIcons name="delete-outline" size={18} color={colors.danger} />
              </Pressable>
            </View>
          ))}
        </View>
        <View style={styles.buttonWrap}>
          <AppButton label="Invite by email / code" tone="secondary" onPress={openInviteEditor} />
          <AppButton label="Show transfer QR" tone="secondary" onPress={openTransferQr} />
          <AppButton label="Share with Nearby / Quick Share" onPress={handleExportShare} />
          <AppButton label="Import update" tone="secondary" onPress={handleImportShare} />
        </View>
        <Text style={styles.helperText}>
          Scan the transfer QR with Pineapple installed. If the trip is too large for QR, use the Nearby / Quick Share button to send the local trip file through Android sharing instead.
        </Text>
        {bundle.conflicts.length ? (
          <View style={styles.conflictList}>
            {bundle.conflicts
              .filter((conflict) => conflict.status === 'open')
              .map((conflict) => (
                <View key={conflict.id} style={styles.conflictCard}>
                  <Text style={styles.travellerName}>{conflict.summary}</Text>
                  <Text style={styles.notes}>Local: {formatDateTime(conflict.localUpdatedAt)}</Text>
                  <Text style={styles.notes}>Incoming: {formatDateTime(conflict.incomingUpdatedAt)}</Text>
                  <View style={styles.buttonWrap}>
                    <AppButton
                      label="Keep local"
                      tone="secondary"
                      onPress={() => resolveSyncConflictChoice(conflict.id, 'resolved_keep_local')}
                    />
                    <AppButton
                      label="Use incoming"
                      onPress={() => resolveSyncConflictChoice(conflict.id, 'resolved_use_incoming')}
                    />
                  </View>
                </View>
              ))}
          </View>
        ) : null}
      </AppCard>

      <AppModal
        visible={visaModalVisible}
        title={visaAssessment?.title ?? 'Visa check'}
        onClose={() => setVisaModalVisible(false)}
      >
        <Text style={styles.notes}>{visaAssessment?.body}</Text>
        <Text style={styles.notes}>Official source: {visaAssessment?.officialSourceLabel ?? 'Official immigration guidance'}</Text>
        <AppButton
          label="Open official guidance"
          onPress={() => {
            if (visaAssessment?.officialUrl) {
              void Linking.openURL(visaAssessment.officialUrl);
            }
          }}
        />
        <AppButton label="Close" tone="secondary" onPress={() => setVisaModalVisible(false)} />
      </AppModal>

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

      <AppModal visible={transferQrVisible} title="Trip transfer QR" onClose={() => setTransferQrVisible(false)}>
        {tripTransferQr?.fitsQr ? (
          <>
            <Text style={styles.notes}>Scan this with Pineapple installed on the other device to import the trip directly.</Text>
            <View style={styles.transferQrCard}>
              <QRCodeImage value={tripTransferQr.externalUrl} size={232} />
            </View>
            <Text style={styles.helperText}>If the other phone is locked, unlock Pineapple first and scan again if needed.</Text>
          </>
        ) : (
          <>
            <Text style={styles.notes}>This trip is too detailed to fit safely inside a QR code.</Text>
            <Text style={styles.helperText}>Use Export shared trip instead, then import the shared file on the receiving phone.</Text>
          </>
        )}
      </AppModal>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  tripFooterNav: {
    flexDirection: 'row',
    gap: spacing.xs,
    backgroundColor: colors.primaryBlue,
    borderRadius: 20,
    padding: spacing.xs,
  },
  tripFooterButton: {
    flex: 1,
    minHeight: 64,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  tripFooterButtonActive: {
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  tripFooterLabel: {
    color: colors.white,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
  },
  heroCard: {
    minHeight: 232,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
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
    minHeight: 232,
    justifyContent: 'flex-end',
    gap: 6,
    padding: spacing.lg,
  },
  heroDestination: {
    color: colors.white,
    fontFamily: 'Poppins_700Bold',
    fontSize: 28,
    lineHeight: 32,
    letterSpacing: 1.8,
  },
  heroTitle: {
    color: colors.white,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 20,
    lineHeight: 24,
  },
  heroDate: {
    color: 'rgba(255,255,255,0.96)',
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    lineHeight: 18,
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
    gap: 5,
    marginTop: 2,
  },
  quickFactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  quickFactLabel: {
    color: 'rgba(255,255,255,0.78)',
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
  },
  quickFactValue: {
    flexShrink: 1,
    color: colors.white,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    textAlign: 'right',
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
  highlightedCard: {
    borderColor: '#9FC6FF',
    shadowColor: 'rgba(13,110,253,0.16)',
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
  transportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  highlightedTransportRow: {
    borderRadius: 18,
    backgroundColor: '#F5FAFF',
    paddingHorizontal: spacing.xs,
  },
  transportCopy: {
    flex: 1,
    gap: 4,
  },
  transportHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.xs,
  },
  transportTitle: {
    color: colors.nightNavy,
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
  },
  transportMeta: {
    color: colors.textMuted,
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 17,
  },
  transportAlertSummary: {
    color: colors.primaryBlueText,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    lineHeight: 17,
  },
  transportReminderList: {
    gap: 2,
  },
  transportReminderText: {
    color: colors.textMuted,
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    lineHeight: 16,
  },
  proofScheduleList: {
    gap: 4,
  },
  transportTimingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
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
