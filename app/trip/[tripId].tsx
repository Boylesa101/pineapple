import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppModal } from '@/components/AppModal';
import { AppScreen } from '@/components/AppScreen';
import { AppTextField } from '@/components/AppTextField';
import { AvatarBadge } from '@/components/AvatarBadge';
import { ChoiceChips } from '@/components/ChoiceChips';
import { DateTimeField } from '@/components/DateTimeField';
import { EmptyState } from '@/components/EmptyState';
import { InfoChip } from '@/components/InfoChip';
import { ListRow } from '@/components/ListRow';
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
  TravelSegmentDraft,
  TripInviteDraft,
  TravellerDraft,
} from '@/types/models';
import { daysLeft, daysUntil, formatDateTime, formatShortDate } from '@/utils/date';
import { getDocumentExpiryRelativeLabel } from '@/utils/documentExpiry';
import { relationshipLabel, tripDateRange } from '@/utils/format';
import { getMissingInfoPrompts, getTripBundle, getUpcomingTimeline } from '@/utils/selectors';
import { validateEmergencyInfo, validateHotelStay, validateTravelSegment, validateTraveller } from '@/utils/validation';

type ModalKind = 'traveller' | 'segment' | 'hotel' | 'emergency' | 'export' | 'invite' | null;

const reminderMeta: Record<ReminderKind, { label: string; leadTimeDays: ReminderLeadTime }> = {
  passport_expiry: { label: 'Passport expiry warning', leadTimeDays: 30 },
  ghic_expiry: { label: 'GHIC / EHIC expiry warning', leadTimeDays: 30 },
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
  custom: 'document',
} as const;

export default function TripDetailScreen() {
  const router = useRouter();
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const {
    data,
    setActiveTrip,
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
  const [emergencyDraft, setEmergencyDraft] = useState<EmergencyInfoDraft | null>(null);
  const [exportOptions, setExportOptions] = useState<PdfExportOptions>(defaultExportOptions);
  const [inviteDraft, setInviteDraft] = useState<TripInviteDraft | null>(null);

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
        airline: '',
        flightNumber: '',
        departureAirport: '',
        arrivalAirport: '',
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
        phone: '',
        bookingRef: '',
        checkIn: trip.startDate,
        checkOut: trip.endDate,
        notes: '',
      }
    );
    setModalKind('hotel');
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
      await saveTravelSegment(segmentDraft);
      setModalKind(null);
      return;
    }

    if (modalKind === 'hotel' && hotelDraft) {
      const errors = validateHotelStay(hotelDraft);
      if (errors.length) {
        Alert.alert('Hotel details need attention', errors.join('\n'));
        return;
      }
      await saveHotelStay(hotelDraft);
      setModalKind(null);
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
    const existing = bundle.reminderSettings.find((setting) => setting.kind === kind && setting.tripId === tripId);
    const base = reminderMeta[kind];
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
      Alert.alert('Export failed', error instanceof Error ? error.message : 'Unable to export PDF.');
    }
  }

  async function handleExportShare() {
    try {
      await exportSharedTripFile(tripId);
      Alert.alert('Shared trip exported', 'A local share file was created for manual import on another device.');
    } catch (error) {
      Alert.alert('Share export failed', error instanceof Error ? error.message : 'Unable to export shared trip.');
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
      Alert.alert('Share import failed', error instanceof Error ? error.message : 'Unable to import shared trip.');
    }
  }

  return (
    <AppScreen title={trip.name} subtitle={tripDateRange(trip.startDate, trip.endDate)}>
      {trip.coverImageUri ? <Image source={trip.coverImageUri} style={styles.cover} contentFit="cover" /> : null}

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

      <AppCard title="Sharing and participants" subtitle="Optional manual-share sync with participant roles and conflict review.">
        <View style={styles.chipRow}>
          <InfoChip label={`Share code ${bundle.sharedTripState?.shareCode ?? 'Pending'}`} tone="blue" />
          <InfoChip label={`Sync ${bundle.sharedTripState?.syncStatus.replaceAll('_', ' ') ?? 'local only'}`} tone={bundle.sharedTripState?.syncStatus === 'conflict' ? 'coral' : 'gold'} />
        </View>
        <View style={styles.participantList}>
          {bundle.participants.map((participant) => (
            <View key={participant.id} style={styles.participantItem}>
              <View style={styles.travellerIdentity}>
                <AvatarBadge label={participant.displayName} color={participant.avatarColor} size={38} />
                <View style={styles.travellerCopy}>
                  <Text style={styles.travellerName}>{participant.displayName}</Text>
                  <Text style={styles.notes}>{participant.role}{participant.email ? ` • ${participant.email}` : ''}</Text>
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
                <Text style={styles.notes}>{invite.role} • {invite.status} • code {invite.inviteCode}</Text>
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

      <AppCard title="Flights / travel" right={<AppButton label="Add" tone="secondary" onPress={() => openSegmentEditor()} />}>
        {bundle.travelSegments.length ? (
          bundle.travelSegments.map((segment) => (
            <ListRow
              key={segment.id}
              title={`${segment.airline} ${segment.flightNumber}`.trim()}
              subtitle={`${segment.departureAirport} → ${segment.arrivalAirport} • ${formatDateTime(segment.departureTime)}`}
              right={
                <View style={styles.iconRow}>
                  <Pressable onPress={() => openSegmentEditor(segment)}>
                    <MaterialIcons name="edit" size={18} color={colors.nightNavy} />
                  </Pressable>
                  <Pressable onPress={() => deleteRecord('travel_segments', segment.id)}>
                    <MaterialIcons name="delete-outline" size={18} color={colors.danger} />
                  </Pressable>
                </View>
              }
            />
          ))
        ) : (
          <EmptyState
            title="No flights saved"
            description="Add airline, flight number, airports, timings, terminal, gate, booking ref, and notes."
          />
        )}
      </AppCard>

      <AppCard title="Hotel" right={<AppButton label="Add" tone="secondary" onPress={() => openHotelEditor()} />}>
        {bundle.hotelStays.length ? (
          bundle.hotelStays.map((hotel) => (
            <ListRow
              key={hotel.id}
              title={hotel.hotelName}
              subtitle={`${hotel.address} • ${formatShortDate(hotel.checkIn)} to ${formatShortDate(hotel.checkOut)}`}
              right={
                <View style={styles.iconRow}>
                  <Pressable onPress={() => openHotelEditor(hotel)}>
                    <MaterialIcons name="edit" size={18} color={colors.nightNavy} />
                  </Pressable>
                  <Pressable onPress={() => deleteRecord('hotel_stays', hotel.id)}>
                    <MaterialIcons name="delete-outline" size={18} color={colors.danger} />
                  </Pressable>
                </View>
              }
            />
          ))
        ) : (
          <EmptyState
            title="No hotel saved"
            description="Add hotel name, address, phone number, booking ref, dates, and notes."
          />
        )}
      </AppCard>

      <AppCard title="Packing" subtitle="Category-based list with traveller assignment, templates, and priority flags.">
        <ListRow title={`${bundle.packingItems.length} item(s)`} subtitle="Track packed vs unpacked and per-traveller progress." />
        <AppButton
          label="Open packing"
          onPress={() => {
            setActiveTrip(tripId);
            router.push('/packing');
          }}
        />
      </AppCard>

      <AppCard title="Itinerary" subtitle="Chronological timeline for excursions, meals, reminders, and tickets.">
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

      <AppCard title="Reminder groundwork" subtitle="Local-only reminder preferences scaffolded for phase 3.">
        {Object.entries(reminderMeta).map(([kind, meta]) => {
          const enabled = bundle.reminderSettings.find((setting) => setting.kind === kind && setting.tripId === tripId)?.enabled
            ?? ((kind === 'passport_expiry' || kind === 'ghic_expiry') ? data.appPreferences.expiryRemindersEnabled : false);
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
            <AppTextField
              label="Airline"
              value={segmentDraft.airline}
              onChangeText={(value) => setSegmentDraft((current) => (current ? { ...current, airline: value } : current))}
            />
            <AppTextField
              label="Flight number"
              value={segmentDraft.flightNumber}
              onChangeText={(value) => setSegmentDraft((current) => (current ? { ...current, flightNumber: value } : current))}
            />
            <AppTextField
              label="Departure airport"
              value={segmentDraft.departureAirport}
              onChangeText={(value) => setSegmentDraft((current) => (current ? { ...current, departureAirport: value } : current))}
            />
            <AppTextField
              label="Arrival airport"
              value={segmentDraft.arrivalAirport}
              onChangeText={(value) => setSegmentDraft((current) => (current ? { ...current, arrivalAirport: value } : current))}
            />
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
              label="Terminal"
              value={segmentDraft.terminal}
              onChangeText={(value) => setSegmentDraft((current) => (current ? { ...current, terminal: value } : current))}
            />
            <AppTextField
              label="Gate"
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
            <AppButton label="Save flight" onPress={saveCurrentModal} />
          </>
        ) : null}
      </AppModal>

      <AppModal visible={modalKind === 'hotel'} title={hotelDraft?.id ? 'Edit hotel' : 'Add hotel'} onClose={() => setModalKind(null)}>
        {hotelDraft ? (
          <>
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
