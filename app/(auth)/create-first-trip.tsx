import { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { PineappleMark } from '@/brand/PineappleMark';
import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppScreen } from '@/components/AppScreen';
import { AppTextField } from '@/components/AppTextField';
import { DateTimeField } from '@/components/DateTimeField';
import { DestinationSearchField } from '@/components/DestinationSearchField';
import { colors, spacing } from '@/constants/theme';
import { useAppStore } from '@/store/useAppStore';
import { toUserMessage } from '@/utils/userErrors';
import { validateTrip, validateTraveller } from '@/utils/validation';

export default function CreateFirstTripScreen() {
  const router = useRouter();
  const { saveTrip, saveTraveller, setActiveTrip } = useAppStore();
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString());
  const [endDate, setEndDate] = useState(new Date().toISOString());
  const [travellersText, setTravellersText] = useState('');
  const [saving, setSaving] = useState(false);

  const travellerNames = useMemo(
    () =>
      travellersText
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean),
    [travellersText]
  );

  async function handleCreateTrip() {
    const tripDraft = {
      name: destination ? `${destination} getaway` : '',
      destination,
      destinationType: 'unknown' as const,
      startDate,
      endDate,
      coverImageUri: null,
      heroImageRemoteUrl: null,
      heroImageStatus: 'idle' as const,
      notes: '',
      transferSummary: '',
      status: 'upcoming' as const,
    };

    const tripErrors = validateTrip(tripDraft);
    if (tripErrors.length) {
      Alert.alert('Trip needs attention', tripErrors.join('\n'));
      return;
    }

    if (!travellerNames.length) {
      Alert.alert('Travellers needed', 'Add at least one traveller name to finish setup.');
      return;
    }

    const travellerErrors = travellerNames.flatMap((fullName) =>
      validateTraveller({
        tripId: 'pending',
        fullName,
        dateOfBirth: null,
        passportNationality: '',
        passportNumber: '',
        ghicNumber: '',
        medicalNote: '',
        notes: '',
        avatarColor: colors.pineappleGold,
        relationshipType: 'adult',
      })
    );

    if (travellerErrors.length) {
      Alert.alert('Traveller names need attention', travellerErrors.join('\n'));
      return;
    }

    setSaving(true);
    try {
      const tripId = await saveTrip(tripDraft);
      for (const [index, fullName] of travellerNames.entries()) {
        await saveTraveller({
          tripId,
          fullName,
          dateOfBirth: null,
          passportNationality: '',
          passportNumber: '',
          ghicNumber: '',
          medicalNote: '',
          notes: '',
          avatarColor: [colors.pineappleGold, colors.oceanBlue, colors.sunsetCoral, colors.leafGreen][index % 4],
          relationshipType: 'adult',
        });
      }
      setActiveTrip(tripId);
      router.replace({ pathname: '/getting-started', params: { tripId } });
    } catch (error) {
      Alert.alert(
        'Trip could not be created',
        toUserMessage(error, 'Pineapple could not finish creating that trip right now. Try again.')
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppScreen
      title="Create your first trip"
      subtitle="Set up one holiday now. You can refine travellers, documents, and details later."
      footer={<AppButton label="Create trip" onPress={handleCreateTrip} loading={saving} />}
    >
      <View style={styles.hero}>
        <PineappleMark size={74} simplified />
        <Text style={styles.heroText}>A calm start for your first holiday plan.</Text>
      </View>
      <AppCard>
        <DestinationSearchField
          label="Destination"
          value={destination}
          onChangeText={setDestination}
          placeholder="Search town, city, or country"
          helper="Start typing a town, city, or country so Pineapple can match the destination cleanly."
        />
        <DateTimeField label="Start date" mode="date" value={startDate} onChange={setStartDate} />
        <DateTimeField label="End date" mode="date" value={endDate} onChange={setEndDate} />
        <AppTextField
          label="Travellers"
          value={travellersText}
          onChangeText={setTravellersText}
          multiline
          placeholder="Andrew Moss, Jess Moss, Theo Moss"
        />
        <Text style={styles.helper}>Add one or more traveller names separated by commas.</Text>
      </AppCard>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: spacing.md,
  },
  heroText: {
    color: colors.textMuted,
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    textAlign: 'center',
  },
  helper: {
    color: colors.textMuted,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 19,
  },
});
