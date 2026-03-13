import { StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppScreen } from '@/components/AppScreen';
import { colors, spacing } from '@/constants/theme';
import { useAppStore } from '@/store/useAppStore';
import { getTripBundle } from '@/utils/selectors';

function ChecklistRow({
  label,
  done,
  onPress,
}: {
  label: string;
  done: boolean;
  onPress: () => void;
}) {
  return (
    <View style={styles.row}>
      <View style={[styles.statusDot, done ? styles.statusDotDone : null]}>
        <MaterialIcons
          name={done ? 'check' : 'radio-button-unchecked'}
          size={16}
          color={done ? colors.white : colors.textMuted}
        />
      </View>
      <Text style={styles.rowLabel}>{label}</Text>
      <AppButton label={done ? 'Review' : 'Open'} tone="secondary" onPress={onPress} />
    </View>
  );
}

export default function GettingStartedScreen() {
  const router = useRouter();
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const setActiveTrip = useAppStore((state) => state.setActiveTrip);
  const data = useAppStore((state) => state.data);
  const bundle = getTripBundle(data, tripId);

  if (!bundle.trip) {
    return (
      <AppScreen title="Setup checklist">
        <AppCard>
          <Text style={styles.empty}>This trip is no longer available.</Text>
          <AppButton label="Go home" onPress={() => router.replace('/home')} />
        </AppCard>
      </AppScreen>
    );
  }

  const hasPassport = bundle.documents.some((document) => document.documentType === 'passport');
  const hasBoardingPass = bundle.documents.some((document) => document.documentType === 'boarding_pass');
  const hasHotel = bundle.hotelStays.length > 0;
  const hasPacking = bundle.packingItems.length > 0;
  const travelModeReady = bundle.travellers.length > 0;

  return (
    <AppScreen title="Setup checklist" subtitle="A short finish line before Pineapple feels fully ready.">
      <AppCard title={bundle.trip.name} subtitle={bundle.trip.destination}>
        <ChecklistRow
          label="Add passports"
          done={hasPassport}
          onPress={() => {
            setActiveTrip(tripId);
            router.push('/vault');
          }}
        />
        <ChecklistRow
          label="Scan boarding passes"
          done={hasBoardingPass}
          onPress={() => {
            setActiveTrip(tripId);
            router.push('/vault');
          }}
        />
        <ChecklistRow
          label="Add hotel"
          done={hasHotel}
          onPress={() => router.push({ pathname: '/trip/[tripId]', params: { tripId } })}
        />
        <ChecklistRow
          label="Add packing list"
          done={hasPacking}
          onPress={() => {
            setActiveTrip(tripId);
            router.push('/packing');
          }}
        />
        <ChecklistRow
          label="Enable travel mode"
          done={travelModeReady}
          onPress={() => router.push({ pathname: '/trip/[tripId]/travel-mode', params: { tripId } })}
        />
      </AppCard>
      <AppButton label="Finish setup" onPress={() => router.replace('/home')} />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  statusDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5EEE3',
  },
  statusDotDone: {
    backgroundColor: colors.leafGreen,
  },
  rowLabel: {
    flex: 1,
    color: colors.nightNavy,
    fontFamily: 'Inter_500Medium',
    fontSize: 15,
  },
  empty: {
    color: colors.textMuted,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
  },
});
