import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppModal } from '@/components/AppModal';
import { AppScreen } from '@/components/AppScreen';
import { AppTextField } from '@/components/AppTextField';
import { DestinationSearchField } from '@/components/DestinationSearchField';
import { ChoiceChips } from '@/components/ChoiceChips';
import { DateTimeField } from '@/components/DateTimeField';
import { EmptyState } from '@/components/EmptyState';
import { TripHeroCard } from '@/components/ui/TripHeroCard';
import { colors, radii, spacing } from '@/constants/theme';
import { packingTemplates, type PackingTemplateId } from '@/data/packingTemplates';
import { useTranslation } from '@/hooks/useTranslation';
import { useAppStore } from '@/store/useAppStore';
import type { TripDraft, TripStatus } from '@/types/models';
import { tripDateRange } from '@/utils/format';
import { getTripBundle } from '@/utils/selectors';
import { getPrimaryTransportType } from '@/utils/transport';
import { filterVisibleTrips } from '@/utils/tripVisibility';
import { toUserMessage } from '@/utils/userErrors';
import { validateTrip } from '@/utils/validation';

const emptyTripDraft: TripDraft = {
  name: '',
  destination: '',
  destinationType: 'unknown',
  startDate: new Date().toISOString(),
  endDate: new Date().toISOString(),
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
  status: 'upcoming',
};

export default function TripsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { data, saveTrip, deleteRecord, setActiveTrip, applyPackingTemplate } = useAppStore();
  const [visible, setVisible] = useState(false);
  const [draft, setDraft] = useState<TripDraft>(emptyTripDraft);
  const [templateId, setTemplateId] = useState<PackingTemplateId | 'none'>('none');
  const [saving, setSaving] = useState(false);

  const sortedTrips = useMemo(() => filterVisibleTrips([...data.trips]), [data.trips]);

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

  async function handleSave() {
    const errors = validateTrip(draft);
    if (errors.length) {
      Alert.alert(t('trips.needsAttention'), errors.join('\n'));
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
    } catch (error) {
      Alert.alert(
        t('trips.saveFailed'),
        toUserMessage(error, 'Pineapple could not save that trip right now. Try again.')
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppScreen title={t('trips.title')} subtitle={t('trips.subtitle')}>
      {!sortedTrips.length ? (
        <AppCard>
          <EmptyState title={t('trips.noTripsTitle')} description={t('trips.noTripsBody')} />
          <AppButton label={t('trips.createTrip')} onPress={openNewTrip} />
        </AppCard>
      ) : (
        sortedTrips.map((trip) => {
          const bundle = getTripBundle(data, trip.id);
          const transportType = getPrimaryTransportType(bundle.travelSegments);

          return (
            <View key={trip.id} style={styles.tripBlock}>
              <TripHeroCard
                trip={trip}
                subtitle={tripDateRange(trip.startDate, trip.endDate)}
                meta={trip.transferSummary || 'Travel, hotel, and pickup shortcuts stay ready on this card.'}
                badgeLabel={trip.heroImageStatus === 'ready' ? null : trip.heroImageStatus === 'loading' ? 'Loading image' : 'Fallback background'}
                transportType={transportType}
                onPress={() => {
                  setActiveTrip(trip.id);
                  router.push({ pathname: '/trip/[tripId]', params: { tripId: trip.id } });
                }}
                onOpenFlights={() => {
                  setActiveTrip(trip.id);
                  router.push({ pathname: '/trip/[tripId]', params: { tripId: trip.id, focus: 'travel' } });
                }}
                onOpenHotel={() => {
                  setActiveTrip(trip.id);
                  router.push({ pathname: '/trip/[tripId]', params: { tripId: trip.id, focus: 'hotel' } });
                }}
                onOpenTransfers={() => {
                  setActiveTrip(trip.id);
                  router.push({ pathname: '/trip/[tripId]', params: { tripId: trip.id, focus: 'transfer' } });
                }}
              />
              <View style={styles.actions}>
                <AppButton label={t('common.edit')} tone="secondary" onPress={() => openEditTrip(trip)} />
                <Pressable
                  onPress={() =>
                    Alert.alert(t('trips.deleteTripTitle'), t('trips.deleteTripBody'), [
                      { text: t('common.cancel'), style: 'cancel' },
                      {
                        text: t('common.delete'),
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
            </View>
          );
        })
      )}

      <AppButton label={t('trips.addTrip')} onPress={openNewTrip} />

      <AppModal visible={visible} title={draft.id ? t('trips.editTrip') : t('trips.createTrip')} onClose={() => setVisible(false)}>
        <AppTextField
          label={t('trips.tripName')}
          value={draft.name}
          onChangeText={(value) => setDraft((current) => ({ ...current, name: value }))}
          placeholder="Optional custom trip name"
          helper="Leave this blank if you want Pineapple to use the destination as the trip title."
        />
        <DestinationSearchField
          label={t('trips.destination')}
          value={draft.destination}
          onChangeText={(value) => setDraft((current) => ({ ...current, destination: value }))}
          onSelectSuggestion={(suggestion) =>
            setDraft((current) => ({
              ...current,
              destination: suggestion.label,
              name: current.name.trim() ? current.name : suggestion.label,
            }))
          }
          placeholder="Search town, city, or country"
          helper="Start typing a town, city, or country to improve image lookup and trip matching."
        />
        <DateTimeField label={t('trips.startDate')} mode="date" value={draft.startDate} onChange={(value) => setDraft((current) => ({ ...current, startDate: value }))} />
        <DateTimeField label={t('trips.endDate')} mode="date" value={draft.endDate} onChange={(value) => setDraft((current) => ({ ...current, endDate: value }))} />
        <View style={styles.statusField}>
          <Text style={styles.label}>{t('trips.status')}</Text>
          <ChoiceChips<TripStatus>
            value={draft.status}
            onChange={(value) => setDraft((current) => ({ ...current, status: value }))}
            options={[
              { label: t('trips.upcoming'), value: 'upcoming' },
              { label: t('trips.active'), value: 'active' },
              { label: t('trips.completed'), value: 'completed' },
            ]}
          />
        </View>
        {!draft.id ? (
          <View style={styles.statusField}>
            <Text style={styles.label}>{t('trips.optionalTemplate')}</Text>
            <ChoiceChips<string>
              value={templateId}
              onChange={(value) => setTemplateId(value as PackingTemplateId | 'none')}
              options={[
                { label: t('trips.none'), value: 'none' },
                ...Object.entries(packingTemplates).map(([value, template]) => ({
                  label: template.label,
                  value,
                })),
              ]}
            />
          </View>
        ) : null}
        <AppTextField label={t('trips.notes')} value={draft.notes} onChangeText={(value) => setDraft((current) => ({ ...current, notes: value }))} multiline placeholder="Check airport parking, request late checkout..." />
        <AppTextField
          label={t('trips.transfers')}
          value={draft.transferSummary}
          onChangeText={(value) => setDraft((current) => ({ ...current, transferSummary: value }))}
          multiline
          placeholder="Airport transfer booked with Blue Cars at 14:20, meeting point T2 pickup bay 6."
        />
        <AppTextField
          label={t('trips.airportTravel')}
          value={draft.airportTravelDurationMinutes !== null ? String(draft.airportTravelDurationMinutes) : ''}
          onChangeText={(value) =>
            setDraft((current) => ({
              ...current,
              airportTravelDurationMinutes: value.trim() ? Math.max(0, Math.round(Number(value) || 0)) : null,
            }))
          }
          keyboardType="numeric"
          placeholder="Optional, e.g. 45"
          helper="Used for the airport set-off time calculation on the trip page."
        />
        <Text style={styles.autoImageNote}>
          Pineapple picks a destination image automatically from the place you enter and keeps a local cached copy after the first lookup.
        </Text>
        <AppButton label={t('trips.saveTrip')} onPress={handleSave} loading={saving} />
      </AppModal>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  tripBlock: {
    gap: spacing.sm,
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
  autoImageNote: {
    color: colors.textMuted,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 19,
  },
});
