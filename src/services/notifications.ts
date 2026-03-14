import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import type { AppDataSnapshot } from '@/types/models';
import { createReminderContent } from '@/services/notificationPlanner';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function isNativeNotificationsSupported() {
  return Platform.OS === 'android' || Platform.OS === 'ios';
}

export async function requestNotificationPermissions() {
  if (!isNativeNotificationsSupported()) {
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
  if (!isNativeNotificationsSupported()) {
    return false;
  }

  const existing = await Notifications.getPermissionsAsync();
  return existing.granted || existing.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
}

export async function rescheduleLocalNotifications(
  snapshot: AppDataSnapshot,
  options: { requestPermissions?: boolean } = {}
) {
  if (!isNativeNotificationsSupported()) {
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

  for (const reminder of content) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: reminder.title,
        body: reminder.body,
        ...(reminder.silent ? {} : { sound: 'default' }),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: reminder.date,
      },
    });
  }

  return content.length;
}
