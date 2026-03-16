import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppModal } from '@/components/AppModal';
import { AppScreen } from '@/components/AppScreen';
import { AppTextField } from '@/components/AppTextField';
import { ChoiceChips } from '@/components/ChoiceChips';
import { DateTimeField } from '@/components/DateTimeField';
import { EmptyState } from '@/components/EmptyState';
import { colors, radii, spacing } from '@/constants/theme';
import { packingTemplates, type PackingTemplateId } from '@/data/packingTemplates';
import { useAppStore } from '@/store/useAppStore';
import type { TripDraft, TripStatus } from '@/types/models';
import { tripDateRange } from '@/utils/format';
import { cleanupImportedSource, copyIntoAppStorage } from '@/utils/fileStorage';
import { validateTrip } from '@/utils/validation';

const emptyTripDraft: TripDraft = {
  name: '',
  destination: '',
  startDate: new Date().toISOString(),
  endDate: new Date().toISOString(),
  coverImageUri: null,
  notes: '',
  status: 'upcoming',
};

export default function TripsScreen() {
  const router = useRouter();
  const { data, saveTrip, deleteRecord, setActiveTrip, applyPackingTemplate } = useAppStore();
  const [visible, setVisible] = useState(false);
  const [draft, setDraft] = useState<TripDraft>(emptyTripDraft);
  const [templateId, setTemplateId] = useState<PackingTemplateId | 'none'>('none');
  const [saving, setSaving] = useState(false);

  const sortedTrips = useMemo(() => [...data.trips], [data.trips]);

  function openNewTrip() {
    setDraft(emptyTripDraft);
    setTemplateId('none');
    setVisible(true);
  }

  function openEditTrip(current: TripDraft) {
    setDraft(current);
    setTemplateId('none');
    setVisible(true);
  }

  async function pickCover() {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Photos permission needed',
          'Allow photo library access if you want to add a local cover image for this trip.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
      });

      if (result.canceled || !result.assets[0]) return;
      const localUri = await copyIntoAppStorage(result.assets[0].uri, 'trips', result.assets[0].mimeType);
      await cleanupImportedSource(result.assets[0].uri);
      setDraft((current) => ({ ...current, coverImageUri: localUri }));
    } catch {
      Alert.alert('Cover image unavailable', 'Pineapple could not import that image right now. Try a different photo.');
    }
  }

  async function handleSave() {
    const errors = validateTrip(draft);
    if (errors.length) {
      Alert.alert('Trip needs attention', errors.join('\n'));
      return;
    }

    setSaving(true);
    try {
      const wasNew = !draft.id;
      const tripId = await saveTrip(draft);
      if (wasNew && templateId !== 'none') {
        await applyPackingTemplate(tripId, templateId);
      }
      setVisible(false);
      setDraft(emptyTripDraft);
      setTemplateId('none');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppScreen title="Trips" subtitle="Create, edit, and organise every holiday offline.">
      {!sortedTrips.length ? (
        <AppCard>
          <EmptyState title="No trips yet" description="Create your first holiday to unlock packing, itinerary, travel mode, and the secure vault." />
          <AppButton label="Create trip" onPress={openNewTrip} />
        </AppCard>
      ) : (
        sortedTrips.map((trip) => (
          <AppCard key={trip.id}>
            {trip.coverImageUri ? <Image source={trip.coverImageUri} style={styles.cover} contentFit="cover" /> : null}
            <Text style={styles.tripName}>{trip.name}</Text>
            <Text style={styles.tripMeta}>{trip.destination}</Text>
            <Text style={styles.tripMeta}>{tripDateRange(trip.startDate, trip.endDate)}</Text>
            <View style={styles.actions}>
              <AppButton
                label="Open"
                tone="primary"
                onPress={() => {
                  setActiveTrip(trip.id);
                  router.push({ pathname: '/trip/[tripId]', params: { tripId: trip.id } });
                }}
              />
              <AppButton label="Edit" tone="secondary" onPress={() => openEditTrip(trip)} />
              <Pressable
                onPress={() =>
                  Alert.alert('Delete trip?', 'This removes the trip and all related local data.', [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Delete',
                      style: 'destructive',
                      onPress: () => deleteRecord('trips', trip.id),
                    },
                  ])
                }
                style={styles.deleteButton}
              >
                <MaterialIcons name="delete-outline" size={20} color={colors.danger} />
              </Pressable>
            </View>
          </AppCard>
        ))
      )}

      <AppButton label="Add trip" onPress={openNewTrip} />

      <AppModal visible={visible} title={draft.id ? 'Edit trip' : 'Create trip'} onClose={() => setVisible(false)}>
        <AppTextField label="Trip name" value={draft.name} onChangeText={(value) => setDraft((current) => ({ ...current, name: value }))} placeholder="Summer in Lisbon" />
        <AppTextField label="Destination" value={draft.destination} onChangeText={(value) => setDraft((current) => ({ ...current, destination: value }))} placeholder="Lisbon, Portugal" />
        <DateTimeField label="Start date" mode="date" value={draft.startDate} onChange={(value) => setDraft((current) => ({ ...current, startDate: value }))} />
        <DateTimeField label="End date" mode="date" value={draft.endDate} onChange={(value) => setDraft((current) => ({ ...current, endDate: value }))} />
        <View style={styles.statusField}>
          <Text style={styles.label}>Status</Text>
          <ChoiceChips<TripStatus>
            value={draft.status}
            onChange={(value) => setDraft((current) => ({ ...current, status: value }))}
            options={[
              { label: 'Upcoming', value: 'upcoming' },
              { label: 'Active', value: 'active' },
              { label: 'Completed', value: 'completed' },
            ]}
          />
        </View>
        {!draft.id ? (
          <View style={styles.statusField}>
            <Text style={styles.label}>Optional starter template</Text>
            <ChoiceChips<string>
              value={templateId}
              onChange={(value) => setTemplateId(value as PackingTemplateId | 'none')}
              options={[
                { label: 'None', value: 'none' },
                ...Object.entries(packingTemplates).map(([value, template]) => ({
                  label: template.label,
                  value,
                })),
              ]}
            />
          </View>
        ) : null}
        <AppTextField label="Notes" value={draft.notes} onChangeText={(value) => setDraft((current) => ({ ...current, notes: value }))} multiline placeholder="Check airport parking, request late checkout..." />
        {draft.coverImageUri ? <Image source={draft.coverImageUri} style={styles.cover} contentFit="cover" /> : null}
        <AppButton label={draft.coverImageUri ? 'Change cover image' : 'Add cover image'} tone="secondary" onPress={pickCover} />
        <AppButton label="Save trip" onPress={handleSave} loading={saving} />
      </AppModal>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  cover: {
    width: '100%',
    height: 160,
    borderRadius: radii.md,
  },
  tripName: {
    color: colors.nightNavy,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 20,
  },
  tripMeta: {
    color: colors.textMuted,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  deleteButton: {
    marginLeft: 'auto',
    padding: spacing.sm,
  },
  statusField: {
    gap: spacing.xs,
  },
  label: {
    color: colors.nightNavy,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
  },
});
