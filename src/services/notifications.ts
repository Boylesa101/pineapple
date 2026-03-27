import { Platform } from 'react-native';
import Constants, { AppOwnership, ExecutionEnvironment } from 'expo-constants';
import type { AppDataSnapshot } from '@/types/models';
import { createReminderContent } from '@/services/notificationPlanner';

type NotificationsModule = typeof import('expo-notifications');
export type NotificationTarget = {
  href: string;
  activeTripId?: string | null;
};

let notificationsModulePromise: Promise<NotificationsModule | null> | null = null;
let pendingRefreshTimer: ReturnType<typeof setTimeout> | null = null;
let pendingSnapshot: AppDataSnapshot | null = null;
let pendingRequestPermissions = false;
let pendingNotificationTarget: NotificationTarget | null = null;

function isNativeNotificationsSupported() {
  return Platform.OS === 'android' || Platform.OS === 'ios';
}

export function isNotificationsRuntimeSupported() {
  if (!isNativeNotificationsSupported()) {
    return false;
  }

  // Expo Go on Android no longer supports the native notifications runtime that
  // expo-notifications expects, so importing the module there can crash boot.
  // Development and standalone APK builds are both valid here.
  if (
    Platform.OS === 'android' &&
    Constants.executionEnvironment === ExecutionEnvironment.StoreClient &&
    (Constants.appOwnership === AppOwnership.Expo || Boolean(Constants.expoGoConfig))
  ) {
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
      .then(async (Notifications) => {
        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldPlaySound: true,
            shouldSetBadge: false,
            shouldShowBanner: true,
            shouldShowList: true,
          }),
        });

        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('pineapple-reminders', {
            name: 'Pineapple reminders',
            description: 'Local trip and document reminders scheduled by Pineapple.',
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 200, 150, 200],
            lightColor: '#0D6EFD',
            lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE,
          });
        }

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
        content: ({
          title: reminder.title,
          body: reminder.body,
          data: {
            pineappleHref: reminder.href ?? null,
            pineappleActiveTripId: reminder.activeTripId ?? null,
          },
          channelId: Platform.OS === 'android' ? 'pineapple-reminders' : undefined,
          ...(reminder.silent ? {} : { sound: 'default' }),
        } as unknown) as Parameters<typeof Notifications.scheduleNotificationAsync>[0]['content'],
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

function parseNotificationTarget(input: unknown): NotificationTarget | null {
  if (!input || typeof input !== 'object') {
    return null;
  }

  const data = input as Record<string, unknown>;
  const href = typeof data.pineappleHref === 'string' ? data.pineappleHref : null;
  if (!href) {
    return null;
  }

  const activeTripId = typeof data.pineappleActiveTripId === 'string' ? data.pineappleActiveTripId : null;
  return {
    href,
    activeTripId,
  };
}

function rememberNotificationTarget(target: NotificationTarget | null) {
  if (target) {
    pendingNotificationTarget = target;
  }
}

export function consumePendingNotificationTarget() {
  const target = pendingNotificationTarget;
  pendingNotificationTarget = null;
  return target;
}

export async function getInitialNotificationTarget() {
  const Notifications = await loadNotificationsModule();
  if (!Notifications) {
    return pendingNotificationTarget;
  }

  const response = await Notifications.getLastNotificationResponseAsync();
  const target = parseNotificationTarget(response?.notification.request.content.data);
  rememberNotificationTarget(target);
  return pendingNotificationTarget;
}

export async function addNotificationResponseListener(
  onReceive: (target: NotificationTarget) => void
) {
  const Notifications = await loadNotificationsModule();
  if (!Notifications) {
    return () => undefined;
  }

  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const target = parseNotificationTarget(response.notification.request.content.data);
    rememberNotificationTarget(target);
    if (target) {
      onReceive(target);
    }
  });

  return () => subscription.remove();
}
