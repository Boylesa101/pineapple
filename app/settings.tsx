import { useEffect, useMemo, useState } from 'react';
import { Alert, Platform, StyleSheet, Text, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppModal } from '@/components/AppModal';
import { AppScreen } from '@/components/AppScreen';
import { AppTextField } from '@/components/AppTextField';
import { ChoiceChips } from '@/components/ChoiceChips';
import { EmptyState } from '@/components/EmptyState';
import { InfoChip } from '@/components/InfoChip';
import { MultiSelectChips } from '@/components/MultiSelectChips';
import { AppHeader } from '@/components/ui/AppHeader';
import { HeroCard } from '@/components/ui/HeroCard';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { colors, spacing } from '@/constants/theme';
import {
  hasNotificationPermissions,
  isNotificationsRuntimeSupported,
  requestNotificationPermissions,
} from '@/services/notifications';
import { PINEAPPLE_BACKUP_EXTENSION, isBackupFileName } from '@/services/backup';
import { useAppStore } from '@/store/useAppStore';
import type { ConflictStatus, ExpiryReminderLeadTime, PrivacyMaskingMode } from '@/types/models';
import { canUseBiometrics } from '@/utils/security';
import { toUserMessage } from '@/utils/userErrors';

type BackupAction = 'export' | 'import';
const expiryScheduleOptions: Array<{ label: string; value: ExpiryReminderLeadTime }> = [
  { label: '180d', value: 180 },
  { label: '90d', value: 90 },
  { label: '30d', value: 30 },
  { label: '14d', value: 14 },
  { label: '7d', value: 7 },
  { label: '1d', value: 1 },
  { label: 'Day of', value: 0 },
];

export default function SettingsScreen() {
  const {
    data,
    security,
    updateSecurityPreferences,
    saveAppPreferences,
    exportBackupFile,
    importBackupFile,
    importSharedTripFile,
    resolveSyncConflictChoice,
  } = useAppStore();
  const [backupVisible, setBackupVisible] = useState(false);
  const [backupAction, setBackupAction] = useState<BackupAction>('export');
  const [backupPassword, setBackupPassword] = useState('');
  const [backupSource, setBackupSource] = useState<string | null>(null);
  const [backupSourceLabel, setBackupSourceLabel] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notificationAccess, setNotificationAccess] = useState<boolean | null>(null);

  const openConflicts = useMemo(
    () => data.syncConflicts.filter((conflict) => conflict.status === 'open'),
    [data.syncConflicts]
  );
  const lastBackupLabel = data.appPreferences.lastBackupAt
    ? new Date(data.appPreferences.lastBackupAt).toLocaleString()
    : 'Never';

  useEffect(() => {
    hasNotificationPermissions()
      .then(setNotificationAccess)
      .catch(() => setNotificationAccess(null));
  }, [data.appPreferences.notificationsEnabled]);

  function closeBackupModal() {
    setBackupVisible(false);
    setBackupPassword('');
    setBackupSource(null);
    setBackupSourceLabel(null);
  }

  async function confirmRestore() {
    return new Promise<boolean>((resolve) => {
      Alert.alert(
        'Replace current data?',
        'Restoring a backup replaces your current Pineapple data on this device. This cannot be undone.',
        [
          { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
          { text: 'Replace data', style: 'destructive', onPress: () => resolve(true) },
        ]
      );
    });
  }

  async function openBackupImport() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/json', '*/*'],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets[0]) {
        return;
      }

      const asset = result.assets[0];
      const inferredName = asset.name ?? asset.uri.split('/').pop() ?? 'selected-file';
      if (!isBackupFileName(inferredName) && !isBackupFileName(asset.uri)) {
        Alert.alert('Invalid backup file', `Choose a ${PINEAPPLE_BACKUP_EXTENSION} file exported by Pineapple.`);
        return;
      }

      setBackupSource(asset.uri);
      setBackupSourceLabel(inferredName);
      setBackupAction('import');
      setBackupVisible(true);
    } catch (error) {
      Alert.alert(
        'Restore unavailable',
        error instanceof Error && error.message
          ? 'Pineapple could not open the backup picker right now. Try again in a moment.'
          : 'Pineapple could not open the backup picker right now.'
      );
    }
  }

  async function handleBackupAction() {
    if (!backupPassword.trim()) {
      Alert.alert('Password required', 'Enter a password to continue.');
      return;
    }

    setBusy(true);
    try {
      if (backupAction === 'export') {
        const result = await exportBackupFile(backupPassword);
        const attachmentSummary = result.skippedAttachmentCount
          ? `${result.attachmentCount} files included, ${result.skippedAttachmentCount} file references kept as metadata only.`
          : `${result.attachmentCount} attachment files included.`;
        Alert.alert(
          'Backup exported',
          `Backup created on ${new Date(result.exportedAt).toLocaleString()}.\n\n${attachmentSummary}`
        );
      } else {
        if (!backupSource) {
          throw new Error('No backup file selected.');
        }
        const backupInfo = await FileSystem.getInfoAsync(backupSource);
        if (!backupInfo.exists) {
          throw new Error('The selected backup file is no longer available.');
        }
        const shouldRestore = await confirmRestore();
        if (!shouldRestore) {
          return;
        }
        const contents = await FileSystem.readAsStringAsync(backupSource);
        await importBackupFile(contents, backupPassword);
        Alert.alert('Backup restored', 'Current local data was replaced and refreshed from the selected backup file.');
      }

      closeBackupModal();
    } catch (error) {
      Alert.alert(
        'Backup failed',
        toUserMessage(error, 'Pineapple could not complete that backup action.')
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleImportSharedTrip() {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/json', '*/*'],
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets[0]) {
      return;
    }

    try {
      const contents = await FileSystem.readAsStringAsync(result.assets[0].uri);
      const outcome = await importSharedTripFile(contents);
      if (outcome.mode === 'conflict') {
        Alert.alert('Conflict detected', 'Pineapple stored the incoming share as a conflict for manual review.');
      } else {
        Alert.alert('Shared trip imported', 'Trip data was merged into your local database.');
      }
    } catch (error) {
      Alert.alert(
        'Import failed',
        toUserMessage(error, 'Pineapple could not import that shared trip file.')
      );
    }
  }

  async function toggleBiometrics() {
    if (security.biometricEnabled) {
      await updateSecurityPreferences({ biometricEnabled: false });
      return;
    }

    const supported = await canUseBiometrics();
    if (!supported) {
      Alert.alert('Biometrics unavailable', 'No enrolled biometric unlock method was detected on this device.');
      return;
    }

    await updateSecurityPreferences({ biometricEnabled: true });
  }

  async function resolveConflict(conflictId: string, resolution: Exclude<ConflictStatus, 'open'>) {
    await resolveSyncConflictChoice(conflictId, resolution);
  }

  async function toggleNotificationsEnabled() {
    if (!isNotificationsRuntimeSupported()) {
      Alert.alert(
        'Notifications unavailable here',
        'Local reminders are not available in Expo Go on Android. Use a development build or release build to test notifications.'
      );
      return;
    }

    if (data.appPreferences.notificationsEnabled) {
      await saveAppPreferences({ notificationsEnabled: false });
      return;
    }

    const alreadyGranted = await hasNotificationPermissions();
    const granted = alreadyGranted || (await requestNotificationPermissions());
    setNotificationAccess(granted);
    if (!granted) {
      Alert.alert(
        'Notifications unavailable',
        'Pineapple only uses local reminders on this device. Turn on notifications in system settings if you want expiry and trip reminders.'
      );
      return;
    }

    await saveAppPreferences({ notificationsEnabled: true });
  }

  return (
    <AppScreen scroll contentStyle={styles.screen}>
      <AppHeader
        badgeLabel="S"
        title="Settings"
        subtitle="App preferences and controls"
      />

      <HeroCard
        title="Settings that travel with you"
        description="Manage security, reminders, local backups, privacy masking, and manual-share sync without leaving your device."
      />

      <View style={styles.section}>
        <SectionHeader title="Security & reminders" />
      <AppCard title="Security">
        <Text style={styles.label}>App lock timer</Text>
        <ChoiceChips
          value={String(security.autoLockSeconds)}
          onChange={(value) => updateSecurityPreferences({ autoLockSeconds: Number(value) })}
          options={[
            { label: '30 sec', value: '30' },
            { label: '90 sec', value: '90' },
            { label: '5 min', value: '300' },
          ]}
        />
        <View style={styles.row}>
          <Text style={styles.body}>Biometric unlock</Text>
          <AppButton
            label={security.biometricEnabled ? 'On' : 'Off'}
            tone={security.biometricEnabled ? 'primary' : 'secondary'}
            onPress={toggleBiometrics}
          />
        </View>
      </AppCard>

      <AppCard title="Reminders" subtitle="All reminders are scheduled locally on this device only.">
        <View style={styles.row}>
          <Text style={styles.body}>Enable local reminders</Text>
          <AppButton
            label={data.appPreferences.notificationsEnabled ? 'On' : 'Off'}
            tone={data.appPreferences.notificationsEnabled ? 'primary' : 'secondary'}
            onPress={toggleNotificationsEnabled}
          />
        </View>
        <View style={styles.row}>
          <Text style={styles.body}>Enable expiry reminders</Text>
          <AppButton
            label={data.appPreferences.expiryRemindersEnabled ? 'On' : 'Off'}
            tone={data.appPreferences.expiryRemindersEnabled ? 'primary' : 'secondary'}
            onPress={() => saveAppPreferences({ expiryRemindersEnabled: !data.appPreferences.expiryRemindersEnabled })}
          />
        </View>
        <View style={styles.fieldBlock}>
          <Text style={styles.label}>Default expiry reminder schedule</Text>
          <MultiSelectChips<ExpiryReminderLeadTime>
            values={data.appPreferences.expiryReminderSchedule}
            onChange={(values) => saveAppPreferences({ expiryReminderSchedule: values })}
            options={expiryScheduleOptions}
          />
        </View>
        <View style={styles.row}>
          <Text style={styles.body}>Silent expiry reminders</Text>
          <AppButton
            label={data.appPreferences.expiryReminderSilent ? 'On' : 'Off'}
            tone={data.appPreferences.expiryReminderSilent ? 'primary' : 'secondary'}
            onPress={() => saveAppPreferences({ expiryReminderSilent: !data.appPreferences.expiryReminderSilent })}
          />
        </View>
        <Text style={styles.meta}>
          Expiry reminders cover passports, GHIC / EHIC cards, travel insurance, visas, driving licences, ID cards, and supported custom documents. Reminders stay local to this device only and never expose document numbers or files.
        </Text>
        <Text style={styles.meta}>
          Pineapple does not connect to your inbox or any cloud service for reminders. Email imports should come from files you choose on this device.
        </Text>
        {data.appPreferences.notificationsEnabled && notificationAccess === false ? (
          <Text style={styles.meta}>
            Notifications are currently disabled at device level, so Pineapple will keep warning states in-app but cannot deliver local alerts until permission is restored.
          </Text>
        ) : null}
        {!isNotificationsRuntimeSupported() ? (
          <Text style={styles.meta}>
            This runtime does not support Pineapple reminders. Expo Go on Android can open the app, but notification testing needs a development build or release build.
          </Text>
        ) : null}
      </AppCard>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Sync, privacy, and transfer" />
      <AppCard title="Sync" subtitle="Optional manual-share sync. Pineapple still works fully in local-only mode.">
        <View style={styles.chipRow}>
          <InfoChip label={data.appPreferences.syncEnabled ? 'Sync enabled' : 'Local-only mode'} tone={data.appPreferences.syncEnabled ? 'blue' : 'default'} />
          <InfoChip label={`Status: ${data.appPreferences.syncStatus.replaceAll('_', ' ')}`} tone={data.appPreferences.syncStatus === 'conflict' ? 'coral' : 'gold'} />
        </View>
        <View style={styles.row}>
          <Text style={styles.body}>Manual-share sync</Text>
          <AppButton
            label={data.appPreferences.syncEnabled ? 'Disable' : 'Enable'}
            tone={data.appPreferences.syncEnabled ? 'secondary' : 'primary'}
            onPress={() =>
              saveAppPreferences({
                syncEnabled: !data.appPreferences.syncEnabled,
                syncStatus: !data.appPreferences.syncEnabled ? 'ready' : 'local_only',
              })
            }
          />
        </View>
        <Text style={styles.meta}>
          Last sync: {data.appPreferences.lastSyncAt ? new Date(data.appPreferences.lastSyncAt).toLocaleString() : 'Never'}
        </Text>
        <AppButton label="Import shared trip / sync file" tone="secondary" onPress={handleImportSharedTrip} />
        <View style={styles.qrBox}>
          <View style={styles.qrCopy}>
            <Text style={styles.qrTitle}>Trip transfer</Text>
            <Text style={styles.meta}>
              Use local share packages to move trip data between devices. QR handoff can be layered on top of this safe local transfer flow later.
            </Text>
          </View>
          <View style={styles.qrVisual} />
        </View>
      </AppCard>

      <AppCard title="Privacy">
        <Text style={styles.label}>Sensitive masking</Text>
        <ChoiceChips<PrivacyMaskingMode>
          value={data.appPreferences.privacyMaskingMode}
          onChange={(value) => saveAppPreferences({ privacyMaskingMode: value })}
          options={[
            { label: 'Always mask', value: 'always' },
            { label: 'Travel Mode only', value: 'travel_mode' },
          ]}
        />
        <Text style={styles.meta}>
          Document images remain most secure on Android. Web/PWA is intended for overview, packing, itinerary, emergency info, and printable summaries.
        </Text>
      </AppCard>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Data and recovery" />
      <AppCard title="Backup & Restore" subtitle="Create encrypted local backup files and restore them later on this device.">
        <Text style={styles.meta}>
          Pineapple exports password-protected {PINEAPPLE_BACKUP_EXTENSION} files with your structured trip data and available local attachments. Store backups securely.
        </Text>
        <Text style={styles.meta}>Last backup: {lastBackupLabel}</Text>
        <View style={styles.buttonRow}>
          <AppButton
            label="Export backup"
            onPress={() => {
              setBackupAction('export');
              setBackupSource(null);
              setBackupSourceLabel(null);
              setBackupVisible(true);
            }}
          />
          <AppButton label="Restore backup" tone="secondary" onPress={openBackupImport} />
        </View>
      </AppCard>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Conflict review" />
      <AppCard title="Conflict review" subtitle="Pineapple never silently overwrites local trip changes.">
        {openConflicts.length ? (
          <View style={styles.conflictList}>
            {openConflicts.map((conflict) => (
              <View key={conflict.id} style={styles.conflictCard}>
                <Text style={styles.conflictTitle}>{conflict.summary}</Text>
                <Text style={styles.meta}>Local change: {new Date(conflict.localUpdatedAt).toLocaleString()}</Text>
                <Text style={styles.meta}>Incoming change: {new Date(conflict.incomingUpdatedAt).toLocaleString()}</Text>
                <View style={styles.buttonRow}>
                  <AppButton
                    label="Keep local"
                    tone="secondary"
                    onPress={() => resolveConflict(conflict.id, 'resolved_keep_local')}
                  />
                  <AppButton
                    label="Use incoming"
                    onPress={() => resolveConflict(conflict.id, 'resolved_use_incoming')}
                  />
                </View>
              </View>
            ))}
          </View>
        ) : (
          <EmptyState
            title="No conflicts"
            description="Manual-share sync imports cleanly unless a trip was edited on both devices since the last known remote change."
          />
        )}
      </AppCard>
      </View>

      {Platform.OS === 'web' ? (
        <View style={styles.section}>
          <SectionHeader title="Web companion" />
          <AppCard title="Web companion">
            <Text style={styles.meta}>
              This web build is intended for overview, packing, itinerary, emergency details, and printable summaries. Keep sensitive document images in the Android app whenever possible.
            </Text>
          </AppCard>
        </View>
      ) : null}

      <AppModal
        visible={backupVisible}
        title={backupAction === 'export' ? 'Export encrypted backup' : 'Restore encrypted backup'}
        onClose={closeBackupModal}
      >
        <AppTextField
          label="Backup password"
          value={backupPassword}
          onChangeText={setBackupPassword}
          secureTextEntry
          placeholder="Choose a strong password"
        />
        <Text style={styles.meta}>
          {backupAction === 'export'
            ? 'This password encrypts the exported backup file.'
            : 'Use the password that was set when the backup file was created.'}
        </Text>
        {backupAction === 'import' ? (
          <Text style={styles.meta}>Selected backup: {backupSourceLabel ?? 'No file selected'}</Text>
        ) : null}
        {backupAction === 'import' ? (
          <Text style={styles.meta}>Restoring replaces the current Pineapple data on this device after confirmation.</Text>
        ) : null}
        <AppButton label={backupAction === 'export' ? 'Create backup' : 'Restore backup'} onPress={handleBackupAction} loading={busy} />
      </AppModal>
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  body: {
    flex: 1,
    color: colors.nightNavy,
    fontFamily: 'Inter_500Medium',
    fontSize: 15,
    lineHeight: 21,
  },
  label: {
    color: colors.nightNavy,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
  },
  fieldBlock: {
    gap: spacing.xs,
  },
  meta: {
    color: colors.textMuted,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 19,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  qrBox: {
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: '#B7D1F4',
    borderStyle: 'dashed',
    borderRadius: 18,
    backgroundColor: '#F7FBFF',
    padding: spacing.md,
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
  },
  qrCopy: {
    flex: 1,
    gap: 6,
  },
  qrTitle: {
    color: colors.primaryBlueText,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
  },
  qrVisual: {
    width: 78,
    height: 78,
    borderRadius: 12,
    backgroundColor: colors.primaryBlue,
    opacity: 0.12,
  },
  conflictList: {
    gap: spacing.sm,
  },
  conflictCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xs,
    backgroundColor: '#FFF9F1',
  },
  conflictTitle: {
    color: colors.nightNavy,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
  },
});
