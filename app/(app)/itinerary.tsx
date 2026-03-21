import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppModal } from '@/components/AppModal';
import { AppScreen } from '@/components/AppScreen';
import { AppTextField } from '@/components/AppTextField';
import { ChoiceChips } from '@/components/ChoiceChips';
import { DateTimeField } from '@/components/DateTimeField';
import { EmptyState } from '@/components/EmptyState';
import { SectionHeader } from '@/components/SectionHeader';
import { TripPicker } from '@/components/TripPicker';
import { colors, spacing } from '@/constants/theme';
import { useAppStore } from '@/store/useAppStore';
import type { ItineraryEventDraft, ItineraryType } from '@/types/models';
import { formatDateTime, formatTimelineDate } from '@/utils/date';
import { getTripBundle } from '@/utils/selectors';
import { validateItineraryEvent } from '@/utils/validation';

const eventLabels: Record<ItineraryType, string> = {
  excursion: 'Excursion',
  meal: 'Meal',
  ticket: 'Ticket',
  reminder: 'Reminder',
  custom: 'Custom',
};

const emptyDraft = (tripId: string): ItineraryEventDraft => ({
  tripId,
  title: '',
  type: 'excursion',
  dateTime: new Date().toISOString(),
  location: '',
  confirmationNumber: '',
  notes: '',
});

export default function ItineraryScreen() {
  const { data, activeTripId, setActiveTrip, saveItineraryEvent, deleteRecord } = useAppStore();
  const [visible, setVisible] = useState(false);
  const [draft, setDraft] = useState<ItineraryEventDraft | null>(null);
  const selectedTripId = activeTripId ?? data.trips[0]?.id ?? null;
  const bundle = getTripBundle(data, selectedTripId);
  const grouped = useMemo(() => {
    return bundle.itineraryEvents.reduce<Record<string, typeof bundle.itineraryEvents>>((accumulator, event) => {
      const dateKey = formatTimelineDate(event.dateTime);
      accumulator[dateKey] = [...(accumulator[dateKey] ?? []), event];
      return accumulator;
    }, {});
  }, [bundle.itineraryEvents]);

  if (!data.trips.length) {
    return (
      <AppScreen title="Itinerary">
        <AppCard>
          <EmptyState title="No trip selected" description="Create a trip first, then build a timeline for excursions, meals, tickets, reminders, and custom events." />
        </AppCard>
      </AppScreen>
    );
  }

  async function handleSave() {
    if (!draft) return;
    const errors = validateItineraryEvent(draft);
    if (errors.length) {
      Alert.alert('Event needs attention', errors.join('\n'));
      return;
    }
    await saveItineraryEvent(draft);
    setVisible(false);
  }

  return (
    <AppScreen title="Itinerary" subtitle="A chronological timeline for excursions, meals, tickets, and reminders.">
      <TripPicker trips={data.trips} value={selectedTripId} onChange={setActiveTrip} />
      {Object.keys(grouped).length ? (
        Object.entries(grouped).map(([dateLabel, events]) => (
          <AppCard key={dateLabel}>
            <SectionHeader title={dateLabel} subtitle={`${events.length} event(s)`} />
            {events.map((event) => (
              <View key={event.id} style={styles.row}>
                <View style={styles.timelineDot} />
                <View style={styles.copy}>
                  <Text style={styles.title}>{event.title}</Text>
                  <Text style={styles.meta}>{eventLabels[event.type]} • {formatDateTime(event.dateTime)}</Text>
                  {event.location ? <Text style={styles.meta}>{event.location}</Text> : null}
                </View>
                <Pressable onPress={() => { setDraft(event); setVisible(true); }} style={styles.iconButton}>
                  <MaterialIcons name="edit" size={18} color={colors.nightNavy} />
                </Pressable>
                <Pressable onPress={() => deleteRecord('itinerary_events', event.id)} style={styles.iconButton}>
                  <MaterialIcons name="delete-outline" size={18} color={colors.danger} />
                </Pressable>
              </View>
            ))}
          </AppCard>
        ))
      ) : (
        <AppCard>
          <EmptyState title="No itinerary items yet" description="Add day plans, excursions, meals, reminders, and tickets so everything is in one timeline." />
        </AppCard>
      )}
      <AppButton label="Add itinerary item" onPress={() => { if (selectedTripId) { setDraft(emptyDraft(selectedTripId)); setVisible(true); } }} />

      <AppModal visible={visible} title={draft?.id ? 'Edit itinerary item' : 'Add itinerary item'} onClose={() => setVisible(false)}>
        {draft ? (
          <>
            <AppTextField label="Title" value={draft.title} onChangeText={(value) => setDraft((current) => current ? { ...current, title: value } : current)} />
            <View style={styles.field}>
              <Text style={styles.label}>Type</Text>
              <ChoiceChips<ItineraryType>
                value={draft.type}
                onChange={(value) => setDraft((current) => current ? { ...current, type: value } : current)}
                options={Object.entries(eventLabels).map(([value, label]) => ({ value: value as ItineraryType, label }))}
              />
            </View>
            <DateTimeField label="Date and time" mode="datetime" value={draft.dateTime} onChange={(value) => setDraft((current) => current ? { ...current, dateTime: value } : current)} />
            <AppTextField label="Location" value={draft.location} onChangeText={(value) => setDraft((current) => current ? { ...current, location: value } : current)} />
            <AppTextField label="Confirmation number" value={draft.confirmationNumber} onChangeText={(value) => setDraft((current) => current ? { ...current, confirmationNumber: value } : current)} />
            <AppTextField label="Notes" value={draft.notes} onChangeText={(value) => setDraft((current) => current ? { ...current, notes: value } : current)} multiline />
            <AppButton label="Save item" onPress={handleSave} />
          </>
        ) : null}
      </AppModal>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: spacing.xs,
  },
  label: {
    color: colors.nightNavy,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.sunsetCoral,
    marginTop: 6,
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  title: {
    color: colors.nightNavy,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
  },
  meta: {
    color: colors.textMuted,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
  },
  iconButton: {
    padding: spacing.xs,
  },
});
