import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppModal } from '@/components/AppModal';
import { AppScreen } from '@/components/AppScreen';
import { AppTextField } from '@/components/AppTextField';
import { ChoiceChips } from '@/components/ChoiceChips';
import { DateTimeField } from '@/components/DateTimeField';
import { EmptyState } from '@/components/EmptyState';
import { ListRow } from '@/components/ListRow';
import { colors, spacing } from '@/constants/theme';
import { useAppStore } from '@/store/useAppStore';
import type { EmergencyInfoDraft, HotelStayDraft, TravelSegmentDraft, TravellerDraft } from '@/types/models';
import { formatDateTime, formatShortDate } from '@/utils/date';
import { tripDateRange } from '@/utils/format';
import { getTripBundle } from '@/utils/selectors';
import { validateEmergencyInfo, validateHotelStay, validateTravelSegment, validateTraveller } from '@/utils/validation';

type ModalKind = 'traveller' | 'segment' | 'hotel' | 'emergency' | null;

export default function TripDetailScreen() {
  const router = useRouter();
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const { data, setActiveTrip, saveTraveller, saveTravelSegment, saveHotelStay, saveEmergencyInfo, deleteRecord } = useAppStore();
  const bundle = getTripBundle(data, tripId);
  const [modalKind, setModalKind] = useState<ModalKind>(null);
  const [travellerDraft, setTravellerDraft] = useState<TravellerDraft | null>(null);
  const [segmentDraft, setSegmentDraft] = useState<TravelSegmentDraft | null>(null);
  const [hotelDraft, setHotelDraft] = useState<HotelStayDraft | null>(null);
  const [emergencyDraft, setEmergencyDraft] = useState<EmergencyInfoDraft | null>(null);

  const summary = useMemo(() => {
    return {
      documents: bundle.documents.length,
      travellers: bundle.travellers.length,
      packing: bundle.packingItems.length,
      itinerary: bundle.itineraryEvents.length,
    };
  }, [bundle.documents.length, bundle.itineraryEvents.length, bundle.packingItems.length, bundle.travellers.length]);

  if (!bundle.trip) {
    return (
      <AppScreen title="Trip not found">
        <AppCard>
          <EmptyState title="This trip is missing" description="It may have been deleted locally. Return to Trips to continue." />
          <AppButton label="Back to trips" onPress={() => router.replace('/trips')} />
        </AppCard>
      </AppScreen>
    );
  }

  const trip = bundle.trip;

  function openTravellerEditor(current?: TravellerDraft) {
    setTravellerDraft(current ?? {
      tripId,
      fullName: '',
      passportNumber: '',
      ghicNumber: '',
      medicalNote: '',
    });
    setModalKind('traveller');
  }

  function openSegmentEditor(current?: TravelSegmentDraft) {
    setSegmentDraft(current ?? {
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
    });
    setModalKind('segment');
  }

  function openHotelEditor(current?: HotelStayDraft) {
    setHotelDraft(current ?? {
      tripId,
      hotelName: '',
      address: '',
      phone: '',
      bookingRef: '',
      checkIn: trip.startDate,
      checkOut: trip.endDate,
      notes: '',
    });
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
    }
  }

  return (
    <AppScreen title={trip.name} subtitle={tripDateRange(trip.startDate, trip.endDate)}>
      {trip.coverImageUri ? <Image source={trip.coverImageUri} style={styles.cover} contentFit="cover" /> : null}
      <AppCard>
        <Text style={styles.destination}>{trip.destination}</Text>
        <Text style={styles.notes}>{trip.notes || 'Add notes, reminders, and local context for the trip.'}</Text>
      </AppCard>

      <AppCard title="Trip overview">
        <View style={styles.metrics}>
          <View style={styles.metric}><Text style={styles.metricValue}>{summary.travellers}</Text><Text style={styles.metricLabel}>Travellers</Text></View>
          <View style={styles.metric}><Text style={styles.metricValue}>{summary.documents}</Text><Text style={styles.metricLabel}>Documents</Text></View>
          <View style={styles.metric}><Text style={styles.metricValue}>{summary.packing}</Text><Text style={styles.metricLabel}>Packing</Text></View>
          <View style={styles.metric}><Text style={styles.metricValue}>{summary.itinerary}</Text><Text style={styles.metricLabel}>Timeline</Text></View>
        </View>
      </AppCard>

      <AppCard title="Travellers" right={<AppButton label="Add" tone="secondary" onPress={() => openTravellerEditor()} />}>
        {bundle.travellers.length ? bundle.travellers.map((traveller) => (
          <ListRow
            key={traveller.id}
            title={traveller.fullName}
            subtitle={`${traveller.passportNumber || 'No passport'} • ${traveller.ghicNumber || 'No GHIC / EHIC'}`}
            right={
              <View style={styles.iconRow}>
                <Pressable onPress={() => openTravellerEditor(traveller)}><MaterialIcons name="edit" size={18} color={colors.nightNavy} /></Pressable>
                <Pressable onPress={() => deleteRecord('travellers', traveller.id)}><MaterialIcons name="delete-outline" size={18} color={colors.danger} /></Pressable>
              </View>
            }
          />
        )) : <EmptyState title="No travellers yet" description="Add traveller names, passport numbers, GHIC / EHIC numbers, and medical notes for travel mode." />}
      </AppCard>

      <AppCard title="Documents" subtitle="Secure vault for passports, GHIC, insurance, tickets, and PDFs">
        <ListRow title={`${bundle.documents.length} document(s)`} subtitle="Sensitive previews stay hidden until the vault is unlocked." />
        <AppButton label="Open vault" onPress={() => { setActiveTrip(tripId); router.push('/vault'); }} />
      </AppCard>

      <AppCard title="Flights / travel" right={<AppButton label="Add" tone="secondary" onPress={() => openSegmentEditor()} />}>
        {bundle.travelSegments.length ? bundle.travelSegments.map((segment) => (
          <ListRow
            key={segment.id}
            title={`${segment.airline} ${segment.flightNumber}`.trim()}
            subtitle={`${segment.departureAirport} → ${segment.arrivalAirport} • ${formatDateTime(segment.departureTime)}`}
            right={
              <View style={styles.iconRow}>
                <Pressable onPress={() => openSegmentEditor(segment)}><MaterialIcons name="edit" size={18} color={colors.nightNavy} /></Pressable>
                <Pressable onPress={() => deleteRecord('travel_segments', segment.id)}><MaterialIcons name="delete-outline" size={18} color={colors.danger} /></Pressable>
              </View>
            }
          />
        )) : <EmptyState title="No flights saved" description="Add airline, flight number, airports, timings, terminal, gate, booking ref, and notes." />}
      </AppCard>

      <AppCard title="Hotel" right={<AppButton label="Add" tone="secondary" onPress={() => openHotelEditor()} />}>
        {bundle.hotelStays.length ? bundle.hotelStays.map((hotel) => (
          <ListRow
            key={hotel.id}
            title={hotel.hotelName}
            subtitle={`${hotel.address} • ${formatShortDate(hotel.checkIn)} to ${formatShortDate(hotel.checkOut)}`}
            right={
              <View style={styles.iconRow}>
                <Pressable onPress={() => openHotelEditor(hotel)}><MaterialIcons name="edit" size={18} color={colors.nightNavy} /></Pressable>
                <Pressable onPress={() => deleteRecord('hotel_stays', hotel.id)}><MaterialIcons name="delete-outline" size={18} color={colors.danger} /></Pressable>
              </View>
            }
          />
        )) : <EmptyState title="No hotel saved" description="Add hotel name, address, phone number, booking ref, dates, and notes." />}
      </AppCard>

      <AppCard title="Packing" subtitle="Category-based list with traveller assignment and luggage type.">
        <ListRow title={`${bundle.packingItems.length} item(s)`} subtitle="Track packed vs unpacked and overall completion." />
        <AppButton label="Open packing" onPress={() => { setActiveTrip(tripId); router.push('/packing'); }} />
      </AppCard>

      <AppCard title="Itinerary" subtitle="Chronological timeline for excursions, meals, reminders, and tickets.">
        <ListRow title={`${bundle.itineraryEvents.length} itinerary item(s)`} subtitle="Everything in one timeline view." />
        <AppButton label="Open itinerary" onPress={() => { setActiveTrip(tripId); router.push('/itinerary'); }} />
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
          <EmptyState title="No emergency reference yet" description="Add insurer, hotel and airline phone numbers, medical notes, local emergency advice, and embassy details." />
        )}
      </AppCard>

      <AppCard title="Travel Mode" subtitle="One-hand, high-contrast, copy-first access screen.">
        <AppButton label="Open Travel Mode" onPress={() => router.push({ pathname: '/trip/[tripId]/travel-mode', params: { tripId } })} />
      </AppCard>

      <AppModal visible={modalKind === 'traveller'} title={travellerDraft?.id ? 'Edit traveller' : 'Add traveller'} onClose={() => setModalKind(null)}>
        {travellerDraft ? (
          <>
            <AppTextField label="Full name" value={travellerDraft.fullName} onChangeText={(value) => setTravellerDraft((current) => current ? { ...current, fullName: value } : current)} />
            <AppTextField label="Passport number" value={travellerDraft.passportNumber} onChangeText={(value) => setTravellerDraft((current) => current ? { ...current, passportNumber: value } : current)} />
            <AppTextField label="GHIC / EHIC number" value={travellerDraft.ghicNumber} onChangeText={(value) => setTravellerDraft((current) => current ? { ...current, ghicNumber: value } : current)} />
            <AppTextField label="Medical note" value={travellerDraft.medicalNote} onChangeText={(value) => setTravellerDraft((current) => current ? { ...current, medicalNote: value } : current)} multiline />
            <AppButton label="Save traveller" onPress={saveCurrentModal} />
          </>
        ) : null}
      </AppModal>

      <AppModal visible={modalKind === 'segment'} title={segmentDraft?.id ? 'Edit flight / travel' : 'Add flight / travel'} onClose={() => setModalKind(null)}>
        {segmentDraft ? (
          <>
            <AppTextField label="Airline" value={segmentDraft.airline} onChangeText={(value) => setSegmentDraft((current) => current ? { ...current, airline: value } : current)} />
            <AppTextField label="Flight number" value={segmentDraft.flightNumber} onChangeText={(value) => setSegmentDraft((current) => current ? { ...current, flightNumber: value } : current)} />
            <AppTextField label="Departure airport" value={segmentDraft.departureAirport} onChangeText={(value) => setSegmentDraft((current) => current ? { ...current, departureAirport: value } : current)} />
            <AppTextField label="Arrival airport" value={segmentDraft.arrivalAirport} onChangeText={(value) => setSegmentDraft((current) => current ? { ...current, arrivalAirport: value } : current)} />
            <DateTimeField label="Departure time" mode="datetime" value={segmentDraft.departureTime} onChange={(value) => setSegmentDraft((current) => current ? { ...current, departureTime: value } : current)} />
            <DateTimeField label="Arrival time" mode="datetime" value={segmentDraft.arrivalTime} onChange={(value) => setSegmentDraft((current) => current ? { ...current, arrivalTime: value } : current)} />
            <AppTextField label="Terminal" value={segmentDraft.terminal} onChangeText={(value) => setSegmentDraft((current) => current ? { ...current, terminal: value } : current)} />
            <AppTextField label="Gate" value={segmentDraft.gate} onChangeText={(value) => setSegmentDraft((current) => current ? { ...current, gate: value } : current)} />
            <AppTextField label="Booking ref" value={segmentDraft.bookingRef} onChangeText={(value) => setSegmentDraft((current) => current ? { ...current, bookingRef: value } : current)} />
            <AppTextField label="Notes" value={segmentDraft.notes} onChangeText={(value) => setSegmentDraft((current) => current ? { ...current, notes: value } : current)} multiline />
            <AppButton label="Save flight" onPress={saveCurrentModal} />
          </>
        ) : null}
      </AppModal>

      <AppModal visible={modalKind === 'hotel'} title={hotelDraft?.id ? 'Edit hotel' : 'Add hotel'} onClose={() => setModalKind(null)}>
        {hotelDraft ? (
          <>
            <AppTextField label="Hotel name" value={hotelDraft.hotelName} onChangeText={(value) => setHotelDraft((current) => current ? { ...current, hotelName: value } : current)} />
            <AppTextField label="Address" value={hotelDraft.address} onChangeText={(value) => setHotelDraft((current) => current ? { ...current, address: value } : current)} multiline />
            <AppTextField label="Phone" value={hotelDraft.phone} onChangeText={(value) => setHotelDraft((current) => current ? { ...current, phone: value } : current)} keyboardType="phone-pad" />
            <AppTextField label="Booking ref" value={hotelDraft.bookingRef} onChangeText={(value) => setHotelDraft((current) => current ? { ...current, bookingRef: value } : current)} />
            <DateTimeField label="Check-in" mode="date" value={hotelDraft.checkIn} onChange={(value) => setHotelDraft((current) => current ? { ...current, checkIn: value } : current)} />
            <DateTimeField label="Check-out" mode="date" value={hotelDraft.checkOut} onChange={(value) => setHotelDraft((current) => current ? { ...current, checkOut: value } : current)} />
            <AppTextField label="Notes" value={hotelDraft.notes} onChangeText={(value) => setHotelDraft((current) => current ? { ...current, notes: value } : current)} multiline />
            <AppButton label="Save hotel" onPress={saveCurrentModal} />
          </>
        ) : null}
      </AppModal>

      <AppModal visible={modalKind === 'emergency'} title="Emergency reference" onClose={() => setModalKind(null)}>
        {emergencyDraft ? (
          <>
            <AppTextField label="Insurer emergency number" value={emergencyDraft.insurerEmergencyNumber} onChangeText={(value) => setEmergencyDraft((current) => current ? { ...current, insurerEmergencyNumber: value } : current)} keyboardType="phone-pad" />
            <AppTextField label="Hotel phone" value={emergencyDraft.hotelPhone} onChangeText={(value) => setEmergencyDraft((current) => current ? { ...current, hotelPhone: value } : current)} keyboardType="phone-pad" />
            <AppTextField label="Airline phone" value={emergencyDraft.airlinePhone} onChangeText={(value) => setEmergencyDraft((current) => current ? { ...current, airlinePhone: value } : current)} keyboardType="phone-pad" />
            <AppTextField label="Local emergency note" value={emergencyDraft.localEmergencyNote} onChangeText={(value) => setEmergencyDraft((current) => current ? { ...current, localEmergencyNote: value } : current)} multiline />
            <AppTextField label="Embassy / consulate note" value={emergencyDraft.embassyConsulateNote} onChangeText={(value) => setEmergencyDraft((current) => current ? { ...current, embassyConsulateNote: value } : current)} multiline />
            <AppTextField label="Traveller medical note" value={emergencyDraft.travellerMedicalNote} onChangeText={(value) => setEmergencyDraft((current) => current ? { ...current, travellerMedicalNote: value } : current)} multiline />
            <AppTextField label="Emergency contacts" value={emergencyDraft.emergencyContacts} onChangeText={(value) => setEmergencyDraft((current) => current ? { ...current, emergencyContacts: value } : current)} multiline />
            <AppButton label="Save emergency info" onPress={saveCurrentModal} />
          </>
        ) : null}
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
  iconRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
});
