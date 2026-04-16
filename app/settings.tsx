import { useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useRouter } from 'expo-router';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { LanguagePicker } from '@/components/LanguagePicker';
import { AppModal } from '@/components/AppModal';
import { AppScreen } from '@/components/AppScreen';
import { AppTextField } from '@/components/AppTextField';
import { ChoiceChips } from '@/components/ChoiceChips';
import { EmptyState } from '@/components/EmptyState';
import { InfoChip } from '@/components/InfoChip';
import { ListRow } from '@/components/ListRow';
import { MultiSelectChips } from '@/components/MultiSelectChips';
import { AppHeader } from '@/components/ui/AppHeader';
import { AccordionSection } from '@/components/ui/AccordionSection';
import { HeroCard } from '@/components/ui/HeroCard';
import { legalConfig, privacySummaryBullets } from '@/content/legal';
import { colors, spacing } from '@/constants/theme';
import { useTranslation } from '@/hooks/useTranslation';
import {
  getNotificationDiagnostics,
  hasNotificationPermissions,
  isNotificationsRuntimeSupported,
  openDeviceNotificationSettings,
  requestNotificationPermissions,
  type NotificationDiagnostics,
} from '@/services/notifications';
import {
  MIN_BACKUP_PASSWORD_LENGTH,
  PINEAPPLE_BACKUP_EXTENSION,
  hasStrongEnoughBackupPassword,
  isBackupFileName,
} from '@/services/backup';
import { useAppStore } from '@/store/useAppStore';
import type { ConflictStatus, ExpiryReminderLeadTime, PrivacyMaskingMode, ReminderKind, ReminderLeadTime } from '@/types/models';
import { isWebCompanionPolicyActive, sensitiveWebSupportMessage } from '@/utils/platformPolicy';
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

function notificationImportanceLabel(value: number | null) {
  if (value === null) return 'Unavailable';
  if (value >= 5) return 'Max';
  if (value === 4) return 'High';
  if (value === 3) return 'Default';
  if (value === 2) return 'Low';
  return 'Min';
}

function notificationVisibilityLabel(value: number | null) {
  if (value === null) return 'Unavailable';
  if (value === 1) return 'Public';
  if (value === 0) return 'Private';
  if (value === -1) return 'Secret';
  return 'Unknown';
}

export default function SettingsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const {
    data,
    security,
    updateSecurityPreferences,
    saveAppPreferences,
    exportBackupFile,
    importBackupFile,
    importSharedTripFile,
    resolveSyncConflictChoice,
    saveReminderSetting,
  } = useAppStore();
  const [backupVisible, setBackupVisible] = useState(false);
  const [backupAction, setBackupAction] = useState<BackupAction>('export');
  const [backupPassword, setBackupPassword] = useState('');
  const [backupSource, setBackupSource] = useState<string | null>(null);
  const [backupSourceLabel, setBackupSourceLabel] = useState<string | null>(null);
  const [sharedImportVisible, setSharedImportVisible] = useState(false);
  const [sharedImportContents, setSharedImportContents] = useState<string | null>(null);
  const [sharedImportCode, setSharedImportCode] = useState('');
  const [sharedImportSourceLabel, setSharedImportSourceLabel] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notificationAccess, setNotificationAccess] = useState<boolean | null>(null);
  const [notificationDiagnostics, setNotificationDiagnostics] = useState<NotificationDiagnostics | null>(null);

  const openConflicts = useMemo(
    () => data.syncConflicts.filter((conflict) => conflict.status === 'open'),
    [data.syncConflicts]
  );
  const lastBackupLabel = data.appPreferences.lastBackupAt
    ? new Date(data.appPreferences.lastBackupAt).toLocaleString()
    : 'Never';
  const globalReminderSettings = useMemo(
    () => new Map(data.reminderSettings.filter((item) => item.tripId === null).map((item) => [item.kind, item])),
    [data.reminderSettings]
  );

  useEffect(() => {
    hasNotificationPermissions()
      .then(setNotificationAccess)
      .catch(() => setNotificationAccess(null));
  }, [data.appPreferences.notificationsEnabled]);

  useEffect(() => {
    getNotificationDiagnostics()
      .then(setNotificationDiagnostics)
      .catch(() => setNotificationDiagnostics(null));
  }, [
    data.appPreferences.notificationsEnabled,
    data.reminderSettings,
    data.travelSegments,
    data.trips,
  ]);

  function closeBackupModal() {
    setBackupVisible(false);
    setBackupPassword('');
    setBackupSource(null);
    setBackupSourceLabel(null);
  }

  function closeSharedImportModal() {
    setSharedImportVisible(false);
    setSharedImportContents(null);
    setSharedImportCode('');
    setSharedImportSourceLabel(null);
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
    if (isWebCompanionPolicyActive()) {
      Alert.alert('Backups stay disabled on web', sensitiveWebSupportMessage);
      return;
    }

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
    if (isWebCompanionPolicyActive()) {
      Alert.alert('Backups stay disabled on web', sensitiveWebSupportMessage);
      return;
    }

    if (!backupPassword.trim()) {
      Alert.alert('Password required', 'Enter a password to continue.');
      return;
    }
    if (backupAction === 'export' && !hasStrongEnoughBackupPassword(backupPassword)) {
      Alert.alert(
        'Stronger password needed',
        `Use at least ${MIN_BACKUP_PASSWORD_LENGTH} characters to protect the backup file.`
      );
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
    if (isWebCompanionPolicyActive()) {
      Alert.alert('Manual-share sync stays disabled on web', sensitiveWebSupportMessage);
      return;
    }

    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/json', '*/*'],
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets[0]) {
      return;
    }

    try {
      const contents = await FileSystem.readAsStringAsync(result.assets[0].uri);
      setSharedImportContents(contents);
      setSharedImportSourceLabel(result.assets[0].name ?? 'shared trip file');
      setSharedImportCode('');
      setSharedImportVisible(true);
    } catch (error) {
      Alert.alert(
        'Import failed',
        toUserMessage(error, 'Pineapple could not import that shared trip file.')
      );
    }
  }

  async function confirmSharedTripImport() {
    if (!sharedImportContents) {
      return;
    }

    if (!sharedImportCode.trim()) {
      Alert.alert('Transfer code needed', 'Enter the transfer code to decrypt this shared trip.');
      return;
    }

    try {
      const outcome = await importSharedTripFile(sharedImportContents, sharedImportCode);
      closeSharedImportModal();
      if (outcome.mode === 'conflict') {
        Alert.alert('Conflict detected', 'Pineapple stored the incoming encrypted share as a conflict for manual review.');
      } else {
        Alert.alert('Shared trip imported', 'Trip data was merged into your local database from the encrypted share.');
      }
    } catch (error) {
      Alert.alert(
        'Import failed',
        toUserMessage(error, 'Pineapple could not decrypt or import that shared trip file.')
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
        'Local reminders are only supported in the installed Pineapple build.'
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
        'Pineapple only uses local reminders on this device. Turn on notifications in system settings if you want expiry, trip, hotel, transfer, and travel reminders.'
      );
      return;
    }

    await saveAppPreferences({ notificationsEnabled: true });
  }

  async function setReminderPreference(kind: ReminderKind, enabled: boolean, leadTimeDays: ReminderLeadTime) {
    const existing = globalReminderSettings.get(kind);
    await saveReminderSetting({
      id: existing?.id,
      tripId: null,
      kind,
      enabled,
      leadTimeDays: existing?.leadTimeDays ?? leadTimeDays,
    });
  }

  return (
    <AppScreen scroll contentStyle={styles.screen}>
      <AppHeader
        badgeLabel="S"
        title={t('settings.title')}
        subtitle={t('settings.subtitle')}
      />

      <HeroCard
        title={t('settings.heroTitle')}
        description={t('settings.heroBody')}
      />
      {isWebCompanionPolicyActive() ? (
        <AppCard title={t('settings.webLimitsTitle')}>
          <Text style={styles.meta}>{sensitiveWebSupportMessage}</Text>
        </AppCard>
      ) : null}

      <AccordionSection title={t('settings.languageTitle')} subtitle={t('settings.languageDescription')}>
        <AppCard title={t('settings.languageTitle')} subtitle={t('settings.languageDescription')}>
          <LanguagePicker
            title={t('settings.languageTitle')}
            description={t('settings.languageDescription')}
            value={data.appPreferences.appLanguage}
            onChange={(appLanguage) => {
              void saveAppPreferences({ appLanguage });
            }}
            showGreetingCycle={false}
          />
        </AppCard>
      </AccordionSection>

      <AccordionSection title={t('settings.securitySection')} subtitle="App lock, permissions, and local reminder controls.">
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
        <View style={styles.preferenceGroup}>
          <Text style={styles.label}>Trip reminder types</Text>
          <View style={styles.preferenceList}>
            <ListRow
              title="Trip countdown reminders"
              subtitle="30, 7, 3, and 1 day reminders plus a same-day travel prompt."
              onPress={() =>
                void setReminderPreference(
                  'trip_countdown_30_days',
                  !(globalReminderSettings.get('trip_countdown_30_days')?.enabled ?? true),
                  30
                )
              }
              right={<Text style={styles.linkText}>{globalReminderSettings.get('trip_countdown_30_days')?.enabled ?? true ? 'On' : 'Off'}</Text>}
            />
            <ListRow
              title="Packing reminders"
              subtitle="Includes the 3-day “Have you packed yet?” check before departure."
              onPress={() =>
                void setReminderPreference(
                  'packing_incomplete',
                  !(globalReminderSettings.get('packing_incomplete')?.enabled ?? true),
                  3
                )
              }
              right={<Text style={styles.linkText}>{globalReminderSettings.get('packing_incomplete')?.enabled ?? true ? 'On' : 'Off'}</Text>}
            />
            <ListRow
              title="Check-in reminders"
              subtitle="Airline check-in plus saved transport departure alerts."
              onPress={() =>
                void setReminderPreference(
                  'flight_check_in',
                  !(globalReminderSettings.get('flight_check_in')?.enabled ?? true),
                  1
                )
              }
              right={<Text style={styles.linkText}>{globalReminderSettings.get('flight_check_in')?.enabled ?? true ? 'On' : 'Off'}</Text>}
            />
            <ListRow
              title="Live travel updates"
              subtitle="Delay, cancellation, boarding, and gate/platform update alerts when Pineapple detects live changes."
              onPress={() =>
                void setReminderPreference(
                  'live_travel_update',
                  !(globalReminderSettings.get('live_travel_update')?.enabled ?? true),
                  0
                )
              }
              right={<Text style={styles.linkText}>{globalReminderSettings.get('live_travel_update')?.enabled ?? true ? 'On' : 'Off'}</Text>}
            />
            <ListRow
              title="Shared trip updates"
              subtitle="Alerts when an encrypted shared-trip import updates this device."
              onPress={() =>
                void setReminderPreference(
                  'shared_trip_update',
                  !(globalReminderSettings.get('shared_trip_update')?.enabled ?? true),
                  0
                )
              }
              right={<Text style={styles.linkText}>{globalReminderSettings.get('shared_trip_update')?.enabled ?? true ? 'On' : 'Off'}</Text>}
            />
            <ListRow
              title="Marketing notifications"
              subtitle="Off. Pineapple does not send marketing pushes in this release."
              right={<Text style={styles.linkText}>Off</Text>}
            />
          </View>
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
        <Text style={styles.meta}>
          Transport reminders use the Android lock screen when permission is granted and the installed Pineapple build is allowed to post notifications.
        </Text>
        {data.appPreferences.notificationsEnabled && notificationAccess === false ? (
          <Text style={styles.meta}>
            Notifications are currently disabled at device level, so Pineapple will keep warning states in-app but cannot deliver local alerts until permission is restored.
          </Text>
        ) : null}
        {!isNotificationsRuntimeSupported() ? (
          <Text style={styles.meta}>
            This runtime does not support Pineapple reminders. Use the installed Pineapple build for notification testing.
          </Text>
        ) : null}
      </AppCard>

      {__DEV__ ? (
      <AppCard
        title="Notification diagnostics"
        subtitle="Proof view for permission state, scheduling, and lock-screen readiness."
      >
        <View style={styles.chipRow}>
          <InfoChip
            label={notificationDiagnostics?.runtimeSupported ? 'Installed runtime' : 'Runtime unsupported'}
            tone={notificationDiagnostics?.runtimeSupported ? 'blue' : 'coral'}
          />
          <InfoChip
            label={notificationDiagnostics?.permissionGranted ? 'Permission granted' : 'Permission missing'}
            tone={notificationDiagnostics?.permissionGranted ? 'gold' : 'coral'}
          />
          <InfoChip
            label={`${notificationDiagnostics?.futureScheduledCount ?? 0} future reminder(s)`}
            tone="default"
          />
        </View>
        <Text style={styles.meta}>Registration state: {notificationDiagnostics?.registrationState ?? 'Unknown'}</Text>
        <Text style={styles.meta}>
          Last schedule run: {notificationDiagnostics?.lastScheduledAt ? new Date(notificationDiagnostics.lastScheduledAt).toLocaleString() : 'Never'}
        </Text>
        <Text style={styles.meta}>Last schedule error: {notificationDiagnostics?.lastScheduleError ?? 'None'}</Text>
        <Text style={styles.meta}>
          Last delivered event:{' '}
          {notificationDiagnostics?.lastDeliveredEvent
            ? `${notificationDiagnostics.lastDeliveredEvent.title} • ${new Date(notificationDiagnostics.lastDeliveredEvent.receivedAt).toLocaleString()}`
            : 'None recorded in this session'}
        </Text>
        <Text style={styles.meta}>
          Transport channel: {notificationDiagnostics?.transportChannel?.exists ? 'ready' : 'missing'} • importance{' '}
          {notificationImportanceLabel(notificationDiagnostics?.transportChannel?.importance ?? null)} • lock screen{' '}
          {notificationVisibilityLabel(notificationDiagnostics?.transportChannel?.lockscreenVisibility ?? null)}
        </Text>
        <Text style={styles.meta}>
          General channel: {notificationDiagnostics?.generalChannel?.exists ? 'ready' : 'missing'} • importance{' '}
          {notificationImportanceLabel(notificationDiagnostics?.generalChannel?.importance ?? null)} • lock screen{' '}
          {notificationVisibilityLabel(notificationDiagnostics?.generalChannel?.lockscreenVisibility ?? null)}
        </Text>
        {!notificationDiagnostics?.permissionGranted ? (
          <AppButton
            label="Open device notification settings"
            tone="secondary"
            onPress={() =>
              openDeviceNotificationSettings().catch(() => {
                Alert.alert('Settings unavailable', 'Open the Pineapple notification settings from Android system settings.');
              })
            }
          />
        ) : null}
        <AppButton
          label="Refresh diagnostics"
          tone="ghost"
          onPress={() =>
            getNotificationDiagnostics()
              .then(setNotificationDiagnostics)
              .catch(() =>
                Alert.alert('Diagnostics unavailable', 'Pineapple could not refresh the notification diagnostics right now.')
              )
          }
        />
        {notificationDiagnostics?.scheduledTransportAlerts.length ? (
          <View style={styles.diagnosticsList}>
            {notificationDiagnostics.scheduledTransportAlerts.slice(0, 12).map((alertItem) => (
              <View key={alertItem.id} style={styles.diagnosticCard}>
                <Text style={styles.diagnosticTitle}>{alertItem.title}</Text>
                <Text style={styles.meta}>{alertItem.body}</Text>
                <Text style={styles.meta}>
                  {alertItem.transportType ? `${alertItem.transportType} • ` : ''}
                  {alertItem.date ? new Date(alertItem.date).toLocaleString() : 'No trigger date'}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.meta}>
            No future transport alerts are currently scheduled. Add or edit a transport segment, then return here to confirm the device schedule.
          </Text>
        )}
      </AppCard>
      ) : null}
      </AccordionSection>

      <AccordionSection title={t('settings.syncSection')} subtitle="Encrypted trip transfer, privacy masking, and manual-share controls.">
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
        <AppButton
          label="Import shared trip / sync file"
          tone="secondary"
          onPress={handleImportSharedTrip}
          disabled={isWebCompanionPolicyActive()}
        />
        <Text style={styles.meta}>
          Trip transfer uses Pineapple-owned encrypted shared files and trip-level encrypted transfer QR codes. Open a trip and use Sharing and participants to show a Pineapple QR for that trip.
        </Text>
        <Text style={styles.meta}>
          Very detailed trips may still need encrypted file export because QR codes have limited capacity even after Pineapple encrypts the transfer payload.
        </Text>
        <Text style={styles.meta}>
          Shared-trip transfers are encrypted with a transfer code, integrity-checked before import, and stay local to the apps and devices you choose to use. Pineapple still does not offer cloud sync.
        </Text>
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
          Document images, trips, reminders, and emergency notes are designed to stay on this device unless you explicitly export or share them.
        </Text>
      </AppCard>
      </AccordionSection>

      <AccordionSection title={t('settings.dataSection')} subtitle="Encrypted backup export and device restore.">
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
            disabled={isWebCompanionPolicyActive()}
          />
          <AppButton label="Restore backup" tone="secondary" onPress={openBackupImport} disabled={isWebCompanionPolicyActive()} />
        </View>
      </AppCard>
      </AccordionSection>

      <AccordionSection title={t('settings.conflictSection')} subtitle="Manual conflict review for shared-trip changes.">
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
      </AccordionSection>

      <AccordionSection title={t('settings.legalSection')} subtitle="Privacy, terms, support, and release references.">
        <AppCard title="Privacy summary" subtitle="Keep the legal wording visible inside the app where travellers actually use it.">
          {privacySummaryBullets.map((item) => (
            <View key={item} style={styles.privacyRow}>
              <Text style={styles.privacyBullet}>•</Text>
              <Text style={styles.metaStrong}>{item}</Text>
            </View>
          ))}
        </AppCard>

        <AppCard title="Legal links" subtitle="Open Pineapple's in-app policy and support pages.">
          <ListRow
            title="About Pineapple"
            subtitle={legalConfig.tagline}
            onPress={() => router.push('/about')}
            right={<Text style={styles.linkText}>Open</Text>}
          />
          <ListRow
            title="Privacy Policy"
            subtitle="How Pineapple handles local-first travel data on your device."
            onPress={() => router.push('/privacy')}
            right={<Text style={styles.linkText}>Open</Text>}
          />
          <ListRow
            title="Terms of Use"
            subtitle="Travel responsibility, SOS disclaimers, and service terms."
            onPress={() => router.push('/terms')}
            right={<Text style={styles.linkText}>Open</Text>}
          />
          <ListRow
            title="Support"
            subtitle={`Support contact: ${legalConfig.supportEmail}`}
            onPress={() => router.push('/support')}
            right={<Text style={styles.linkText}>Open</Text>}
          />
        </AppCard>
      </AccordionSection>

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

      <AppModal visible={sharedImportVisible} title="Decrypt shared trip" onClose={closeSharedImportModal}>
        <Text style={styles.meta}>Selected source: {sharedImportSourceLabel ?? 'Encrypted shared trip'}</Text>
        <Text style={styles.meta}>Enter the transfer code that was shared separately with the encrypted trip file.</Text>
        <AppTextField
          label="Transfer code"
          value={sharedImportCode}
          onChangeText={setSharedImportCode}
          placeholder="PINE-ABCD-EFGH"
        />
        <AppButton label="Decrypt and import" onPress={() => void confirmSharedTripImport()} />
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
  preferenceGroup: {
    gap: spacing.xs,
  },
  preferenceList: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#F8FBFF',
  },
  meta: {
    color: colors.textMuted,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 19,
  },
  metaStrong: {
    flex: 1,
    color: colors.primaryBlueText,
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    lineHeight: 20,
  },
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
  privacyBullet: {
    color: colors.primaryBlue,
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
    lineHeight: 18,
  },
  linkText: {
    color: colors.primaryBlue,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
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
  diagnosticsList: {
    gap: spacing.xs,
  },
  diagnosticCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    gap: 4,
    backgroundColor: '#F7FBFF',
  },
  diagnosticTitle: {
    color: colors.nightNavy,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    lineHeight: 18,
  },
});
