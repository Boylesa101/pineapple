import { Platform } from 'react-native';
import Constants from 'expo-constants';
import type { AppDataSnapshot } from '@/types/models';
import { createReminderContent } from '@/services/notificationPlanner';

type NotificationsModule = typeof import('expo-notifications');

let notificationsModulePromise: Promise<NotificationsModule | null> | null = null;
let pendingRefreshTimer: ReturnType<typeof setTimeout> | null = null;
let pendingSnapshot: AppDataSnapshot | null = null;
let pendingRequestPermissions = false;

function isNativeNotificationsSupported() {
  return Platform.OS === 'android' || Platform.OS === 'ios';
}

export function isNotificationsRuntimeSupported() {
  if (!isNativeNotificationsSupported()) {
    return false;
  }

  // Expo Go on Android no longer supports the native notifications runtime that
  // expo-notifications expects, so importing the module there can crash boot.
  if (Platform.OS === 'android' && Boolean(Constants.expoGoConfig)) {
    return false;
  }

  return true;
}

async function loadNotificationsModule() {
  if (!isNotificationsRuntimeSupported()) {
    return null;
  }

  if (!notificationsModulePromise) {
    notificationsModulePromise = import('expo-notifications')
      .then((Notifications) => {
        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldPlaySound: true,
            shouldSetBadge: false,
            shouldShowBanner: true,
            shouldShowList: true,
          }),
        });

        return Notifications;
      })
      .catch(() => null);
  }

  return notificationsModulePromise;
}

export async function requestNotificationPermissions() {
  const Notifications = await loadNotificationsModule();
  if (!Notifications) {
    return false;
  }

  const existing = await Notifications.getPermissionsAsync();
  if (existing.granted || existing.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) {
    return true;
  }

  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted || requested.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
}

export async function hasNotificationPermissions() {
  const Notifications = await loadNotificationsModule();
  if (!Notifications) {
    return false;
  }

  const existing = await Notifications.getPermissionsAsync();
  return existing.granted || existing.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
}

export async function rescheduleLocalNotifications(
  snapshot: AppDataSnapshot,
  options: { requestPermissions?: boolean } = {}
) {
  const Notifications = await loadNotificationsModule();
  if (!Notifications) {
    return 0;
  }

  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!snapshot.appPreferences.notificationsEnabled) {
    return 0;
  }

  const hasPermissions = options.requestPermissions ? await requestNotificationPermissions() : await hasNotificationPermissions();
  if (!hasPermissions) {
    return 0;
  }

  const content = createReminderContent(snapshot);

  await Promise.all(
    content.map((reminder) =>
      Notifications.scheduleNotificationAsync({
        content: {
          title: reminder.title,
          body: reminder.body,
          ...(reminder.silent ? {} : { sound: 'default' }),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: reminder.date,
        },
      })
    )
  );

  return content.length;
}

export function queueNotificationRefresh(
  snapshot: AppDataSnapshot,
  options: { requestPermissions?: boolean; delayMs?: number } = {}
) {
  pendingSnapshot = snapshot;
  pendingRequestPermissions = pendingRequestPermissions || Boolean(options.requestPermissions);

  if (pendingRefreshTimer) {
    clearTimeout(pendingRefreshTimer);
  }

  pendingRefreshTimer = setTimeout(() => {
    const nextSnapshot = pendingSnapshot;
    const requestPermissions = pendingRequestPermissions;
    pendingSnapshot = null;
    pendingRequestPermissions = false;
    pendingRefreshTimer = null;

    if (!nextSnapshot) {
      return;
    }

    rescheduleLocalNotifications(nextSnapshot, { requestPermissions }).catch(() => undefined);
  }, options.delayMs ?? 350);
}
