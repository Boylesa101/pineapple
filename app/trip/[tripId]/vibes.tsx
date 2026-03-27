import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppScreen } from '@/components/AppScreen';
import { VibesEmptyState } from '@/components/vibes/VibesEmptyState';
import { VibesExperience } from '@/components/vibes/VibesExperience';
import { colors, radii, spacing } from '@/constants/theme';
import { useAppStore } from '@/store/useAppStore';
import { getTripBundle } from '@/utils/selectors';

function VibesModeFooter({
  mode,
  onChange,
}: {
  mode: 'vibe' | 'mood';
  onChange: (mode: 'vibe' | 'mood') => void;
}) {
  return (
    <View style={styles.footerSwitch}>
      <Pressable onPress={() => onChange('vibe')} style={[styles.footerButton, mode === 'vibe' ? styles.footerButtonActive : null]}>
        <Text style={[styles.footerLabel, mode === 'vibe' ? styles.footerLabelActive : null]}>Vibe</Text>
      </Pressable>
      <Pressable onPress={() => onChange('mood')} style={[styles.footerButton, mode === 'mood' ? styles.footerButtonActive : null]}>
        <Text style={[styles.footerLabel, mode === 'mood' ? styles.footerLabelActive : null]}>Mood</Text>
      </Pressable>
    </View>
  );
}

export default function TripVibesScreen() {
  const router = useRouter();
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const { data, setActiveTrip } = useAppStore();
  const bundle = useMemo(() => getTripBundle(data, tripId), [data, tripId]);
  const trip = bundle.trip;
  const [mode, setMode] = useState<'vibe' | 'mood'>('vibe');

  if (!trip) {
    return (
      <AppScreen title="Vibes">
        <AppCard>
          <VibesEmptyState icon="map" title="Trip not found" description="Go back to the trip and try again." />
          <AppButton label="Back to trips" onPress={() => router.replace('/trips')} />
        </AppCard>
      </AppScreen>
    );
  }

  return (
    <AppScreen
      title="Vibe"
      footer={
        <VibesModeFooter mode={mode} onChange={setMode} />
      }
    >
      <VibesExperience tripId={trip.id} mode={mode} onModeChange={setMode} />
      <AppButton
        label="Back to trip"
        tone="secondary"
        onPress={() => {
          setActiveTrip(tripId);
          router.push({ pathname: '/trip/[tripId]', params: { tripId } });
        }}
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  footerSwitch: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.pill,
    backgroundColor: colors.primaryBlue,
    padding: 4,
  },
  footerButton: {
    flex: 1,
    minHeight: 56,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerButtonActive: {
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  footerLabel: {
    color: 'rgba(255,255,255,0.74)',
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
  },
  footerLabelActive: {
    color: colors.white,
  },
});
