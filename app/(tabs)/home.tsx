import type { ComponentProps } from 'react';
import { useMemo, useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';

import { PineappleMark } from '@/brand/PineappleMark';
import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppModal } from '@/components/AppModal';
import { AppScreen } from '@/components/AppScreen';
import { AppTextField } from '@/components/AppTextField';
import { ChoiceChips } from '@/components/ChoiceChips';
import { EmptyState } from '@/components/EmptyState';
import { InfoChip } from '@/components/InfoChip';
import { ProgressBar } from '@/components/ProgressBar';
import { colors, radii, spacing } from '@/constants/theme';
import { useAppStore } from '@/store/useAppStore';
import { countdownLabel, formatDateTime } from '@/utils/date';
import { percent, tripDateRange } from '@/utils/format';
import {
  getMissingInfoPrompts,
  getNextEvent,
  getNextFlight,
  getNextHotel,
  getPackingProgress,
  getTripStatusChips,
  getUpcomingTimeline,
  getUpcomingTrip,
} from '@/utils/selectors';
import { canUseBiometrics } from '@/utils/security';

function QuickCard({
  icon,
  title,
  value,
  onPress,
}: {
  icon: ComponentProps<typeof MaterialIcons>['name'];
  title: string;
  value: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.quickCard}>
      <View style={styles.quickIcon}>
        <MaterialIcons name={icon} size={20} color={colors.nightNavy} />
      </View>
      <Text style={styles.quickTitle}>{title}</Text>
      <Text style={styles.quickValue}>{value}</Text>
    </Pressable>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const {
    data,
    security,
    updateSecurityPreferences,
    resetWithDemoData,
    setActiveTrip,
    exportBackupFile,
    importBackupFile,
  } = useAppStore();
  const [checkingBiometrics, setCheckingBiometrics] = useState(false);
  const [backupModalVisible, setBackupModalVisible] = useState(false);
  const [backupAction, setBackupAction] = useState<'export' | 'import'>('export');
  const [backupPassword, setBackupPassword] = useState('');
  const [backupSource, setBackupSource] = useState<string | null>(null);
  const upcomingTrip = useMemo(() => getUpcomingTrip(data), [data]);

  const nextFlight = getNextFlight(data, upcomingTrip?.id);
  const nextHotel = getNextHotel(data, upcomingTrip?.id);
  const nextEvent = getNextEvent(data, upcomingTrip?.id);
  const packing = getPackingProgress(data, upcomingTrip?.id);
  const timeline = getUpcomingTimeline(data, upcomingTrip?.id);
  const prompts = getMissingInfoPrompts(data, upcomingTrip?.id);
  const tripStatus = upcomingTrip ? getTripStatusChips(upcomingTrip.startDate, upcomingTrip.endDate) : null;

  const quickCards = upcomingTrip
    ? ([
        {
          icon: 'lock',
          title: 'Documents',
          value: `${data.documents.filter((item) => item.tripId === upcomingTrip.id).length} saved`,
          onPress: () => {
            setActiveTrip(upcomingTrip.id);
            router.push('/vault');
          },
        },
        {
          icon: 'checkroom',
          title: 'Packing',
          value: `${percent(packing.packed, packing.total)}% ready`,
          onPress: () => {
            setActiveTrip(upcomingTrip.id);
            router.push('/packing');
          },
        },
        {
          icon: 'flight-takeoff',
          title: 'Next flight / hotel',
          value: nextFlight ? `${nextFlight.airline} ${nextFlight.flightNumber}` : nextHotel ? nextHotel.hotelName : 'Add travel details',
          onPress: () => router.push({ pathname: '/trip/[tripId]', params: { tripId: upcomingTrip.id } }),
        },
        {
          icon: 'celebration',
          title: 'Upcoming excursion',
          value: nextEvent ? nextEvent.title : 'Plan something memorable',
          onPress: () => {
            setActiveTrip(upcomingTrip.id);
            router.push('/itinerary');
          },
        },
        {
          icon: 'local-hospital',
          title: 'Emergency info',
          value: data.emergencyInfos.find((item) => item.tripId === upcomingTrip.id)?.insurerEmergencyNumber || 'Add trip contacts',
          onPress: () => router.push({ pathname: '/trip/[tripId]', params: { tripId: upcomingTrip.id } }),
        },
        {
          icon: 'bolt',
          title: 'Travel Mode',
          value: 'Fast access screen',
          onPress: () => router.push({ pathname: '/trip/[tripId]/travel-mode', params: { tripId: upcomingTrip.id } }),
        },
      ] satisfies Array<{
        icon: ComponentProps<typeof MaterialIcons>['name'];
        title: string;
        value: string;
        onPress: () => void;
      }>)
    : [];

  async function openBackupImport() {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/json', '*/*'],
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets[0]) {
      return;
    }
    setBackupSource(result.assets[0].uri);
    setBackupAction('import');
    setBackupModalVisible(true);
  }

  async function handleBackupAction() {
    if (!backupPassword.trim()) {
      Alert.alert('Password required', 'Enter a password to continue.');
      return;
    }

    try {
      if (backupAction === 'export') {
        await exportBackupFile(backupPassword);
        Alert.alert('Backup exported', 'Your encrypted backup was generated and shared locally if sharing is available.');
      } else {
        if (!backupSource) {
          throw new Error('No backup file selected.');
        }
        const contents = await FileSystem.readAsStringAsync(backupSource);
        await importBackupFile(contents, backupPassword);
        Alert.alert('Backup imported', 'Local data was restored from the encrypted backup.');
      }

      setBackupPassword('');
      setBackupSource(null);
      setBackupModalVisible(false);
    } catch (error) {
      Alert.alert('Backup action failed', error instanceof Error ? error.message : 'Unable to continue.');
    }
  }

  return (
    <AppScreen title="Home" subtitle="One calm place for your next holiday.">
      <AppCard>
        <View style={styles.heroRow}>
          <View style={styles.heroCopy}>
            <Text style={styles.brandTitle}>Pineapple</Text>
            <Text style={styles.brandSubtitle}>
              Local-first planner, secure vault, family travel mode, printable travel packs, and encrypted backups.
            </Text>
          </View>
          <PineappleMark size={72} />
        </View>
        <AppButton label="Open settings" tone="secondary" onPress={() => router.push('/settings')} />
      </AppCard>

      {!upcomingTrip ? (
        <AppCard>
          <EmptyState
            title="Start your first trip"
            description="Create a holiday, add travellers, and keep everything on-device from day one."
          />
          <AppButton label="Create your first trip" onPress={() => router.push('/trips')} />
        </AppCard>
      ) : (
        <>
          <AppCard title={upcomingTrip.name} subtitle={tripDateRange(upcomingTrip.startDate, upcomingTrip.endDate)}>
            <Text style={styles.destination}>{upcomingTrip.destination}</Text>
            <View style={styles.chipRow}>
              <InfoChip label={`${countdownLabel(upcomingTrip.startDate)} until departure`} tone="blue" />
              {tripStatus ? <InfoChip label={`${tripStatus.daysLeft} day(s) left`} tone="gold" /> : null}
              <InfoChip label={`${data.travellers.filter((item) => item.tripId === upcomingTrip.id).length} traveller(s)`} tone="default" />
            </View>
            {upcomingTrip.status === 'completed' ? (
              <Text style={styles.meta}>This trip is complete and kept locally for reference, travel packs, and family records.</Text>
            ) : (
              <Text style={styles.meta}>
                {nextFlight
                  ? `Next flight: ${nextFlight.airline} ${nextFlight.flightNumber} on ${formatDateTime(nextFlight.departureTime)}`
                  : 'Add travel details to see the next movement here.'}
              </Text>
            )}
            <AppButton
              label="Open trip"
              onPress={() => router.push({ pathname: '/trip/[tripId]', params: { tripId: upcomingTrip.id } })}
            />
          </AppCard>

          {timeline.length ? (
            <AppCard title="Upcoming timeline">
              {timeline.map((item) => (
                <View key={item.id} style={styles.timelineRow}>
                  <View style={styles.timelineDot} />
                  <View style={styles.timelineCopy}>
                    <Text style={styles.quickTitle}>{item.title}</Text>
                    <Text style={styles.quickValue}>{formatDateTime(item.dateTime)} • {item.subtitle}</Text>
                  </View>
                </View>
              ))}
            </AppCard>
          ) : null}

          {prompts.length ? (
            <AppCard title="Missing info prompts">
              {prompts.map((prompt) => (
                <Text key={prompt} style={styles.meta}>• {prompt}</Text>
              ))}
            </AppCard>
          ) : null}

          <View style={styles.quickGrid}>
            {quickCards.map((card) => (
              <QuickCard key={card.title} {...card} />
            ))}
          </View>
        </>
      )}

      <AppCard title="Security">
        <Text style={styles.securityLabel}>Auto-lock</Text>
        <ChoiceChips
          value={String(security.autoLockSeconds) as '30' | '90' | '300'}
          onChange={(value) => updateSecurityPreferences({ autoLockSeconds: Number(value) })}
          options={[
            { label: '30 sec', value: '30' },
            { label: '90 sec', value: '90' },
            { label: '5 min', value: '300' },
          ]}
        />
        <AppButton
          label={security.biometricEnabled ? 'Disable biometrics' : 'Enable biometrics'}
          tone="secondary"
          onPress={async () => {
            if (security.biometricEnabled) {
              await updateSecurityPreferences({ biometricEnabled: false });
              return;
            }

            setCheckingBiometrics(true);
            const supported = await canUseBiometrics();
            setCheckingBiometrics(false);
            if (!supported) {
              Alert.alert('Biometrics unavailable', 'No enrolled biometric unlock method was detected on this device.');
              return;
            }

            await updateSecurityPreferences({ biometricEnabled: true });
          }}
          loading={checkingBiometrics}
        />
      </AppCard>

      {upcomingTrip ? (
        <AppCard title="Packing progress">
          <Text style={styles.meta}>
            {packing.packed} of {packing.total} items packed
          </Text>
          <ProgressBar progress={percent(packing.packed, packing.total)} />
        </AppCard>
      ) : null}

      <AppCard title="Encrypted local backup" subtitle="Export and restore your local data without any remote backend.">
        <Text style={styles.meta}>
          Backup files are password-protected AES exports of your SQLite-backed app data and referenced local attachments.
        </Text>
        <View style={styles.buttonRow}>
          <AppButton
            label="Export backup"
            onPress={() => {
              setBackupAction('export');
              setBackupSource(null);
              setBackupModalVisible(true);
            }}
          />
          <AppButton label="Import backup" tone="secondary" onPress={openBackupImport} />
        </View>
      </AppCard>

      {Platform.OS === 'web' ? (
        <AppCard title="Web companion">
          <Text style={styles.meta}>
            Pineapple on web focuses on trip overview, packing, itinerary, emergency details, and printable summaries. The Android app remains the best place for sensitive document images.
          </Text>
        </AppCard>
      ) : null}

      {__DEV__ ? (
        <AppCard title="Development">
          <Text style={styles.meta}>Reset the local database with demo content for QA and layout checks.</Text>
          <AppButton label="Load demo data" tone="ghost" onPress={resetWithDemoData} />
        </AppCard>
      ) : null}

      <AppModal
        visible={backupModalVisible}
        title={backupAction === 'export' ? 'Export encrypted backup' : 'Import encrypted backup'}
        onClose={() => setBackupModalVisible(false)}
      >
        <Text style={styles.meta}>
          {backupAction === 'export'
            ? 'Choose a password. You will need the same password to restore this backup later.'
            : 'Enter the password used when the backup was created. Restoring will replace current local data.'}
        </Text>
        <AppTextField
          label="Password"
          value={backupPassword}
          onChangeText={setBackupPassword}
          secureTextEntry
        />
        <AppButton label={backupAction === 'export' ? 'Export now' : 'Import now'} onPress={handleBackupAction} />
      </AppModal>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  heroCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  brandTitle: {
    color: colors.nightNavy,
    fontFamily: 'Poppins_700Bold',
    fontSize: 24,
  },
  brandSubtitle: {
    color: colors.textMuted,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 20,
  },
  destination: {
    color: colors.nightNavy,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 24,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  meta: {
    color: colors.textMuted,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 20,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  quickCard: {
    width: '48%',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.xs,
  },
  quickIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFF3D6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickTitle: {
    color: colors.nightNavy,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
  },
  quickValue: {
    color: colors.textMuted,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 18,
  },
  securityLabel: {
    color: colors.nightNavy,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 5,
    backgroundColor: colors.sunsetCoral,
  },
  timelineCopy: {
    flex: 1,
    gap: 2,
  },
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
});
