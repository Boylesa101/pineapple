import { Alert, Linking, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppScreen } from '@/components/AppScreen';
import { AppHeader } from '@/components/ui/AppHeader';
import { HeroCard } from '@/components/ui/HeroCard';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { colors, spacing } from '@/constants/theme';
import { useAppStore } from '@/store/useAppStore';
import { getDashboardTrip, getTripBundle } from '@/utils/selectors';

function emergencyRows(bundle: ReturnType<typeof getTripBundle>) {
  return [
    {
      icon: 'account-balance',
      title: 'Embassy / consulate note',
      description: bundle.emergencyInfo?.embassyConsulateNote || 'Add embassy or consulate guidance from your trip emergency card.',
    },
    {
      icon: 'local-police',
      title: 'Local emergency note',
      description: bundle.emergencyInfo?.localEmergencyNote || 'Save local emergency advice and numbers for this destination.',
    },
    {
      icon: 'medication',
      title: 'Traveller medical notes',
      description: bundle.emergencyInfo?.travellerMedicalNote || 'No traveller medical notes saved yet.',
    },
  ] as const;
}

export default function SosScreen() {
  const router = useRouter();
  const { data, activeTripId } = useAppStore();
  const dashboardTrip = getDashboardTrip(data);
  const tripId = activeTripId ?? dashboardTrip?.id ?? null;
  const bundle = getTripBundle(data, tripId);
  const emergency = bundle.emergencyInfo;
  const primaryPhone = emergency?.insurerEmergencyNumber || emergency?.hotelPhone || emergency?.airlinePhone || '';

  async function callPrimaryHelp() {
    if (!primaryPhone) {
      Alert.alert('No emergency number saved', 'Add insurer, hotel, or airline numbers to this trip so Pineapple can dial them quickly.');
      return;
    }
    const telUrl = `tel:${primaryPhone.replace(/\s+/g, '')}`;
    const supported = await Linking.canOpenURL(telUrl);
    if (!supported) {
      Alert.alert('Call unavailable', 'This device cannot open a phone call from Pineapple right now.');
      return;
    }
    await Linking.openURL(telUrl);
  }

  return (
    <AppScreen scroll contentStyle={styles.screen}>
      <AppHeader
        badgeLabel="!"
        title="SOS"
        subtitle="Emergency travel support"
        actionIcon="travel-explore"
        badgeTone="red"
        onActionPress={() => (tripId ? router.push({ pathname: '/trip/[tripId]/travel-mode', params: { tripId } }) : router.push('/trips'))}
      />

      <HeroCard
        tone="red"
        title="Emergency help nearby"
        description="Keep embassy notes, emergency contacts, travel insurance numbers, and key trip details ready when travel gets stressful."
        badge={
          bundle.trip ? (
            <View style={styles.locationPill}>
              <MaterialIcons name="location-on" size={18} color={colors.white} />
              <Text style={styles.locationText}>{bundle.trip.destination}</Text>
            </View>
          ) : undefined
        }
        actions={
          <>
            <AppButton label="Open Travel Mode" tone="secondary" onPress={() => (tripId ? router.push({ pathname: '/trip/[tripId]/travel-mode', params: { tripId } }) : router.push('/trips'))} />
            <AppButton label="Emergency call" tone="danger" onPress={callPrimaryHelp} />
          </>
        }
      />

      <View style={styles.section}>
        <SectionHeader title="Embassy & support notes" right="Trip data" />
        <AppCard>
          {emergencyRows(bundle).map((row, index, rows) => (
            <View key={row.title} style={[styles.emergencyItem, index === rows.length - 1 ? styles.lastItem : null]}>
              <MaterialIcons name={row.icon} size={22} color={colors.dangerRed} style={styles.itemIcon} />
              <View style={styles.itemCopy}>
                <Text style={styles.itemTitle}>{row.title}</Text>
                <Text style={styles.itemDescription}>{row.description}</Text>
              </View>
            </View>
          ))}
        </AppCard>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Nearest services" right="Local-first" />
        <AppCard>
          <View style={styles.emergencyItem}>
            <MaterialIcons name="local-hospital" size={22} color={colors.primaryBlue} style={styles.itemIcon} />
            <View style={styles.itemCopy}>
              <Text style={styles.itemTitle}>Hospital and pharmacy</Text>
              <Text style={styles.itemDescription}>
                Save local hospital, clinic, and pharmacy details in your trip emergency note so Pineapple can surface them offline.
              </Text>
            </View>
          </View>
          <View style={styles.emergencyItem}>
            <MaterialIcons name="local-police" size={22} color={colors.primaryBlue} style={styles.itemIcon} />
            <View style={styles.itemCopy}>
              <Text style={styles.itemTitle}>Police and local services</Text>
              <Text style={styles.itemDescription}>
                Pineapple keeps your local emergency note, contacts, and trip support numbers available even without signal.
              </Text>
            </View>
          </View>
        </AppCard>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Trip emergency data" />
        <AppCard>
          <View style={styles.row}>
            <Text style={styles.rowTitle}>Insurance documents</Text>
            <Text style={styles.rowAction}>{emergency?.insurerEmergencyNumber ? 'Ready' : 'Add'}</Text>
          </View>
          <Text style={styles.rowDescription}>{emergency?.insurerEmergencyNumber || 'No insurer emergency number saved yet.'}</Text>

          <View style={styles.rowSpacer} />

          <View style={styles.row}>
            <Text style={styles.rowTitle}>Emergency contacts</Text>
            <Text style={styles.rowAction}>{emergency?.emergencyContacts ? 'Saved' : 'Add'}</Text>
          </View>
          <Text style={styles.rowDescription}>{emergency?.emergencyContacts || 'Add local contacts or family contacts to your trip emergency card.'}</Text>

          <View style={styles.actions}>
            <AppButton label="Open trip emergency" tone="outline" onPress={() => (tripId ? router.push({ pathname: '/trip/[tripId]', params: { tripId } }) : router.push('/trips'))} />
            <AppButton label="Open vault" tone="secondary" onPress={() => router.push('/vault')} />
          </View>
        </AppCard>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  screen: {
    gap: spacing.lg,
  },
  section: {
    gap: spacing.sm,
  },
  locationPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  locationText: {
    color: colors.white,
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
  },
  emergencyItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF3F8',
  },
  lastItem: {
    borderBottomWidth: 0,
  },
  itemIcon: {
    marginTop: 2,
  },
  itemCopy: {
    flex: 1,
    gap: 4,
  },
  itemTitle: {
    color: colors.primaryBlueText,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
  },
  itemDescription: {
    color: '#6F8396',
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 18,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  rowTitle: {
    color: colors.primaryBlueText,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
  },
  rowAction: {
    color: colors.primaryBlue,
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
  },
  rowDescription: {
    color: '#6F8396',
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 18,
  },
  rowSpacer: {
    height: spacing.md,
  },
  actions: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
});
