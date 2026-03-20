import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';

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
import { colors, spacing } from '@/constants/theme';
import { getTripDocumentWarningSummary } from '@/services/documentWarnings';
import { relationshipOptions, travellerAvatarColors } from '@/data/travellerOptions';
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
import { daysLeft, daysUntil, formatDateTime, formatShortDate } from '@/utils/date';
import { getDocumentExpiryRelativeLabel } from '@/utils/documentExpiry';
import { formatAirportDisplay } from '@/utils/airports';
import { relationshipLabel, tripDateRange } from '@/utils/format';
import { getMissingInfoPrompts, getTripBundle, getUpcomingTimeline } from '@/utils/selectors';
import { toUserMessage } from '@/utils/userErrors';
import { validateEmergencyInfo, validateHotelStay, validateTravelSegment, validateTraveller } from '@/utils/validation';

type ModalKind = 'traveller' | 'segment' | 'hotel' | 'transfer' | 'emergency' | 'export' | 'invite' | null;
type TripSection = 'overview' | 'travel' | 'hotel' | 'transfer' | 'packing' | 'itinerary';
type TransferDraft = {
  provider: string;
  method: string;
  location: string;
  time: string | null;
  notes: string;
};

const reminderMeta: Record<Exclude<ReminderKind, 'passport_expiry' | 'ghic_expiry'>, { label: string; leadTimeDays: ReminderLeadTime }> = {
  packing_incomplete: { label: 'Packing incomplete warning', leadTimeDays: 1 },
  trip_starts_tomorrow: { label: 'Trip starts tomorrow warning', leadTimeDays: 1 },
  insurance_missing: { label: 'Missing insurance warning', leadTimeDays: 7 },
  flight_check_in: { label: 'Flight check-in reminder', leadTimeDays: 1 },
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
  custom: 'document',
} as const;

export default function TripDetailScreen() {
  const router = useRouter();
  const { tripId, focus } = useLocalSearchParams<{ tripId: string; focus?: string }>();
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
  const [modalKind, setModalKind] = useState<ModalKind>(null);
  const [travellerDraft, setTravellerDraft] = useState<TravellerDraft | null>(null);
  const [segmentDraft, setSegmentDraft] = useState<TravelSegmentDraft | null>(null);
  const [hotelDraft, setHotelDraft] = useState<HotelStayDraft | null>(null);
  const [transferDraft, setTransferDraft] = useState<TransferDraft | null>(null);
  const [emergencyDraft, setEmergencyDraft] = useState<EmergencyInfoDraft | null>(null);
  const [exportOptions, setExportOptions] = useState<PdfExportOptions>(defaultExportOptions);
  const [inviteDraft, setInviteDraft] = useState<TripInviteDraft | null>(null);
  const [activeSection, setActiveSection] = useState<TripSection>('overview');

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
        return left.departureTime.localeCompare(right.departureTime);
      }),
    [bundle.travelSegments]
  );

  useEffect(() => {
    if (focus === 'travel' || focus === 'hotel' || focus === 'transfer') {
      setActiveSection(focus);
      return;
    }
    setActiveSection('overview');
  }, [focus]);

  if (!bundle.trip) {
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

  const trip = bundle.trip;
  const departureDays = daysUntil(trip.startDate);
  const remainingDays = daysLeft(trip.endDate);

  function openTravellerEditor(current?: TravellerDraft) {
    setTravellerDraft(
      current ?? {
        tripId,
        fullName: '',
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

  function openSegmentEditor(current?: TravelSegmentDraft) {
    setSegmentDraft(
      current ?? {
        tripId,
        transportType: 'flight',
        travelDirection: bundle.travelSegments.length ? 'return' : 'outbound',
        airline: '',
        providerCode: '',
        providerLogoUrl: null,
        flightNumber: '',
        departureAirport: '',
        departureAirportCode: '',
        arrivalAirport: '',
        arrivalAirportCode: '',
        departureTime: new Date().toISOString(),
        arrivalTime: new Date().toISOString(),
        terminal: '',
        gate: '',
        bookingRef: '',
        notes: '',
      }
    );
    setModalKind('segment');
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
        checkIn: trip.startDate,
        checkOut: trip.endDate,
        notes: '',
      }
    );
    setModalKind('hotel');
  }

  function openTransferEditor() {
    setTransferDraft({
      provider: trip.transferProvider,
      method: trip.transferMethod,
      location: trip.transferLocation,
      time: trip.transferTime,
      notes: trip.transferNotes || trip.transferSummary,
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
      inviteCode: bundle.sharedTripState?.shareCode ?? `PINE-${tripId.slice(-6).toUpperCase()}`,
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
      setModalKind(null);
      return;
    }

    if (modalKind === 'segment' && segmentDraft) {
      const errors = validateTravelSegment(segmentDraft);
      if (errors.length) {
        Alert.alert('Flight details need attention', errors.join('\n'));
        return;
      }
      try {
        await saveTravelSegment(segmentDraft);
        setModalKind(null);
      } catch (error) {
        Alert.alert('Flight could not be saved', toUserMessage(error, 'Unable to save those flight details right now.'));
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
        setModalKind(null);
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
          ...trip,
          transferSummary: [transferDraft.provider, transferDraft.method, transferDraft.location, transferDraft.notes]
            .filter(Boolean)
            .join(' · '),
          transferProvider: transferDraft.provider,
          transferMethod: transferDraft.method,
          transferLocation: transferDraft.location,
          transferTime: transferDraft.time,
          transferNotes: transferDraft.notes,
        });
        setModalKind(null);
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
      setModalKind(null);
      return;
    }

    if (modalKind === 'invite' && inviteDraft) {
      if (!inviteDraft.email.trim()) {
        Alert.alert('Invite needs attention', 'Add an email or label for this participant invite.');
        return;
      }
      await saveTripInvite(inviteDraft);
      setModalKind(null);
    }
  }

  async function toggleReminder(kind: ReminderKind) {
    if (!(kind in reminderMeta)) {
      return;
    }
    const existing = bundle.reminderSettings.find((setting) => setting.kind === kind && setting.tripId === tripId);
    const base = reminderMeta[kind as keyof typeof reminderMeta];
    await saveReminderSetting(
      existing
        ? { ...existing, enabled: !existing.enabled }
        : {
            tripId,
            kind,
            enabled: true,
            leadTimeDays: base.leadTimeDays,
          }
    );
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
      Alert.alert('Shared trip exported', 'A local share file was created for manual import on another device.');
    } catch (error) {
      Alert.alert('Share export failed', toUserMessage(error, 'Unable to export that shared trip right now.'));
    }
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

  return (
    <AppScreen
      title={trip.name}
      subtitle={tripDateRange(trip.startDate, trip.endDate)}
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
              setActiveSection('itinerary');
              router.push('/itinerary');
            }}
            style={[styles.tripFooterButton, activeSection === 'itinerary' ? styles.tripFooterButtonActive : null]}
          >
            <MaterialIcons name="event-note" size={22} color={colors.white} />
            <Text style={styles.tripFooterLabel}>Itinerary</Text>
          </Pressable>
          <Pressable
            onPress={() => setActiveSection('travel')}
            style={[styles.tripFooterButton, activeSection === 'travel' ? styles.tripFooterButtonActive : null]}
          >
            <MaterialIcons name="flight" size={22} color={colors.white} />
            <Text style={styles.tripFooterLabel}>Flight</Text>
          </Pressable>
          <Pressable
            onPress={() => setActiveSection('hotel')}
            style={[styles.tripFooterButton, activeSection === 'hotel' ? styles.tripFooterButtonActive : null]}
          >
            <MaterialIcons name="hotel" size={22} color={colors.white} />
            <Text style={styles.tripFooterLabel}>Hotel</Text>
          </Pressable>
        </View>
      }
    >
      {trip.coverImageUri ? <ManagedFileImage uri={trip.coverImageUri} style={styles.cover} /> : null}

      <AppCard>
        <Text style={styles.destination}>{trip.destination}</Text>
        <View style={styles.chipRow}>
          <InfoChip
            label={
              trip.status === 'completed'
                ? 'Completed trip'
                : departureDays > 0
                  ? `${departureDays} day(s) until departure`
                  : 'Trip in progress'
            }
            tone={trip.status === 'completed' ? 'default' : 'blue'}
          />
          <InfoChip
            label={remainingDays >= 0 ? `${remainingDays} day(s) left` : 'Trip ended'}
            tone={remainingDays > 0 ? 'gold' : 'default'}
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
                  <AvatarBadge label={traveller.fullName} color={traveller.avatarColor} size={42} />
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

      <AppCard
        title="Flight and train info"
        subtitle="Add outbound, return, or rail travel with provider branding and booking details."
        right={<AppButton label="Add" tone="secondary" onPress={() => openSegmentEditor()} />}
        style={activeSection === 'travel' ? styles.highlightedCard : null}
      >
        {orderedTravelSegments.length ? (
          orderedTravelSegments.map((segment) => (
            <View key={segment.id} style={styles.transportRow}>
              <ProviderLogoBadge
                name={segment.airline || (segment.transportType === 'train' ? 'Train' : 'Flight')}
                code={segment.providerCode}
                logoUrl={segment.providerLogoUrl}
              />
              <View style={styles.transportCopy}>
                <View style={styles.transportHeader}>
                  <Text style={styles.transportTitle}>
                    {segment.transportType === 'train' ? 'Train' : 'Flight'} · {segment.travelDirection}
                  </Text>
                  <InfoChip label={segment.transportType === 'train' ? 'Train' : 'Flight'} tone="blue" />
                </View>
                <Text style={styles.transportMeta}>
                  {[segment.airline, segment.flightNumber].filter(Boolean).join(' ')}
                </Text>
                <Text style={styles.transportMeta}>
                  {formatAirportDisplay(segment.departureAirport, segment.departureAirportCode)} →{' '}
                  {formatAirportDisplay(segment.arrivalAirport, segment.arrivalAirportCode)}
                </Text>
                <Text style={styles.transportMeta}>{formatDateTime(segment.departureTime)}</Text>
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
          ))
        ) : (
          <EmptyState
            title="No transport saved"
            description="Add outbound and return flights, or save train travel with times, stations, booking reference, and notes."
          />
        )}
      </AppCard>

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

      <AppCard title="Trip reminders" subtitle="Trip-level local reminders for departures, packing, flights, and excursions.">
        {Object.entries(reminderMeta).map(([kind, meta]) => {
          const enabled = bundle.reminderSettings.find((setting) => setting.kind === kind && setting.tripId === tripId)?.enabled ?? false;
          return (
            <ListRow
              key={kind}
              title={meta.label}
              subtitle={`Lead time ${meta.leadTimeDays} day(s)`}
              right={<AppButton label={enabled ? 'On' : 'Off'} tone={enabled ? 'primary' : 'secondary'} onPress={() => toggleReminder(kind as ReminderKind)} />}
            />
          );
        })}
      </AppCard>

      <AppCard title="Sharing and participants" subtitle="Optional manual-share sync with participant roles and conflict review.">
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
          <AppButton label="Export shared trip" onPress={handleExportShare} />
          <AppButton label="Import update" tone="secondary" onPress={handleImportShare} />
        </View>
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
        visible={modalKind === 'traveller'}
        title={travellerDraft?.id ? 'Edit traveller' : 'Add traveller'}
        onClose={() => setModalKind(null)}
      >
        {travellerDraft ? (
          <>
            <AppTextField
              label="Full name"
              value={travellerDraft.fullName}
              onChangeText={(value) => setTravellerDraft((current) => (current ? { ...current, fullName: value } : current))}
            />
            <DateTimeField
              label="Date of birth"
              mode="date"
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
        title={segmentDraft?.id ? 'Edit flight / travel' : 'Add flight / travel'}
        onClose={() => setModalKind(null)}
      >
        {segmentDraft ? (
          <>
            <Text style={styles.label}>Transport type</Text>
            <ChoiceChips<TransportType>
              value={segmentDraft.transportType}
              onChange={(value) =>
                setSegmentDraft((current) =>
                  current
                    ? {
                        ...current,
                        transportType: value,
                        airline: '',
                        providerCode: '',
                        providerLogoUrl: null,
                        departureAirportCode: value === 'train' ? '' : current.departureAirportCode,
                        arrivalAirportCode: value === 'train' ? '' : current.arrivalAirportCode,
                      }
                    : current
                )
              }
              options={[
                { label: 'Flight', value: 'flight' },
                { label: 'Train', value: 'train' },
              ]}
            />
            <Text style={styles.label}>Direction</Text>
            <ChoiceChips<TravelSegmentDraft['travelDirection']>
              value={segmentDraft.travelDirection}
              onChange={(value) => setSegmentDraft((current) => (current ? { ...current, travelDirection: value } : current))}
              options={[
                { label: 'Outbound', value: 'outbound' },
                { label: 'Return', value: 'return' },
                { label: 'Other', value: 'other' },
              ]}
            />
            <TransportProviderSearchField
              label={segmentDraft.transportType === 'train' ? 'Train operator' : 'Airline'}
              transportType={segmentDraft.transportType}
              value={segmentDraft.airline}
              onChangeText={(value) =>
                setSegmentDraft((current) =>
                  current ? { ...current, airline: value, providerCode: '', providerLogoUrl: null } : current
                )
              }
              onSelectProvider={(provider) =>
                setSegmentDraft((current) =>
                  current
                    ? {
                        ...current,
                        airline: provider.name,
                        providerCode: provider.code,
                        providerLogoUrl: provider.logoUrl,
                      }
                    : current
                )
              }
              placeholder={segmentDraft.transportType === 'train' ? 'Search train operator' : 'Search airline'}
              helper={
                segmentDraft.transportType === 'train'
                  ? 'Pick a train operator or type one manually.'
                  : 'Pick an airline to keep the code and logo tidy.'
              }
            />
            {segmentDraft.providerLogoUrl || segmentDraft.providerCode ? (
              <View style={styles.providerPreview}>
                <ProviderLogoBadge
                  name={segmentDraft.airline || (segmentDraft.transportType === 'train' ? 'Train' : 'Flight')}
                  code={segmentDraft.providerCode}
                  logoUrl={segmentDraft.providerLogoUrl}
                />
                <Text style={styles.providerPreviewText}>
                  {segmentDraft.providerCode ? `${segmentDraft.providerCode} · ` : ''}
                  {segmentDraft.airline || 'Provider'}
                </Text>
              </View>
            ) : null}
            <AppTextField
              label={segmentDraft.transportType === 'train' ? 'Service number' : 'Flight number'}
              value={segmentDraft.flightNumber}
              onChangeText={(value) => setSegmentDraft((current) => (current ? { ...current, flightNumber: value } : current))}
            />
            {segmentDraft.transportType === 'flight' ? (
              <>
                <AirportSearchField
                  label="Departure airport"
                  value={segmentDraft.departureAirport}
                  airportCode={segmentDraft.departureAirportCode}
                  onChangeText={(value) =>
                    setSegmentDraft((current) =>
                      current
                        ? {
                            ...current,
                            departureAirport: value,
                            departureAirportCode: current.departureAirport === value ? current.departureAirportCode : '',
                          }
                        : current
                    )
                  }
                  onSelectAirport={(airport) =>
                    setSegmentDraft((current) =>
                      current ? { ...current, departureAirport: airport.name, departureAirportCode: airport.code } : current
                    )
                  }
                  placeholder="Search by city, airport, or IATA"
                  helper="Type a place like London, Newcastle, or JFK."
                />
                <AirportSearchField
                  label="Arrival airport"
                  value={segmentDraft.arrivalAirport}
                  airportCode={segmentDraft.arrivalAirportCode}
                  onChangeText={(value) =>
                    setSegmentDraft((current) =>
                      current
                        ? {
                            ...current,
                            arrivalAirport: value,
                            arrivalAirportCode: current.arrivalAirport === value ? current.arrivalAirportCode : '',
                          }
                        : current
                    )
                  }
                  onSelectAirport={(airport) =>
                    setSegmentDraft((current) =>
                      current ? { ...current, arrivalAirport: airport.name, arrivalAirportCode: airport.code } : current
                    )
                  }
                  placeholder="Search by city, airport, or IATA"
                  helper="Pick the right airport and Pineapple keeps the IATA code."
                />
              </>
            ) : (
              <>
                <AppTextField
                  label="Departure station"
                  value={segmentDraft.departureAirport}
                  onChangeText={(value) => setSegmentDraft((current) => (current ? { ...current, departureAirport: value } : current))}
                />
                <AppTextField
                  label="Arrival station"
                  value={segmentDraft.arrivalAirport}
                  onChangeText={(value) => setSegmentDraft((current) => (current ? { ...current, arrivalAirport: value } : current))}
                />
              </>
            )}
            <DateTimeField
              label="Departure time"
              mode="datetime"
              value={segmentDraft.departureTime}
              onChange={(value) => setSegmentDraft((current) => (current ? { ...current, departureTime: value } : current))}
            />
            <DateTimeField
              label="Arrival time"
              mode="datetime"
              value={segmentDraft.arrivalTime}
              onChange={(value) => setSegmentDraft((current) => (current ? { ...current, arrivalTime: value } : current))}
            />
            <AppTextField
              label={segmentDraft.transportType === 'train' ? 'Platform / carriage' : 'Terminal'}
              value={segmentDraft.terminal}
              onChangeText={(value) => setSegmentDraft((current) => (current ? { ...current, terminal: value } : current))}
            />
            <AppTextField
              label={segmentDraft.transportType === 'train' ? 'Seat / platform note' : 'Gate'}
              value={segmentDraft.gate}
              onChangeText={(value) => setSegmentDraft((current) => (current ? { ...current, gate: value } : current))}
            />
            <AppTextField
              label="Booking ref"
              value={segmentDraft.bookingRef}
              onChangeText={(value) => setSegmentDraft((current) => (current ? { ...current, bookingRef: value } : current))}
            />
            <AppTextField
              label="Notes"
              value={segmentDraft.notes}
              onChangeText={(value) => setSegmentDraft((current) => (current ? { ...current, notes: value } : current))}
              multiline
            />
            <AppButton label={`Save ${segmentDraft.transportType === 'train' ? 'train' : 'flight'}`} onPress={saveCurrentModal} />
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
  cover: {
    width: '100%',
    height: 200,
    borderRadius: 18,
  },
  destination: {
    color: colors.nightNavy,
    fontFamily: 'Poppins_700Bold',
    fontSize: 26,
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
});
