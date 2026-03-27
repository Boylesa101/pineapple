import { Linking, Platform } from 'react-native';
import Constants, { AppOwnership, ExecutionEnvironment } from 'expo-constants';

import type { AppDataSnapshot, TravelSegment, TransportType } from '@/types/models';
import { updateTravelSegmentNotificationState } from '@/db/repositories';
import { createReminderContent, getTransportNotificationSummary } from '@/services/notificationPlanner';

type NotificationsModule = typeof import('expo-notifications');
export type NotificationTarget = {
  href: string;
  activeTripId?: string | null;
};

export type NotificationChannelStatus = {
  id: string;
  exists: boolean;
  name: string | null;
  importance: number | null;
  lockscreenVisibility: number | null;
};

export type ScheduledNotificationDiagnostic = {
  id: string;
  title: string;
  body: string;
  date: string | null;
  channelId: string | null;
  href: string | null;
  activeTripId: string | null;
  transportSegmentId: string | null;
  transportType: TransportType | null;
};

export type NotificationDiagnostics = {
  runtimeSupported: boolean;
  permissionGranted: boolean;
  transportChannel: NotificationChannelStatus | null;
  generalChannel: NotificationChannelStatus | null;
  futureScheduledCount: number;
  scheduledTransportAlerts: ScheduledNotificationDiagnostic[];
};

const GENERAL_CHANNEL_ID = 'pineapple-reminders';
const TRANSPORT_CHANNEL_ID = 'pineapple-transport';

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

  if (
    Platform.OS === 'android' &&
    Constants.executionEnvironment === ExecutionEnvironment.StoreClient &&
    (Constants.appOwnership === AppOwnership.Expo || Boolean(Constants.expoGoConfig))
  ) {
    return false;
  }

  return true;
}

function normalizeTransportType(value: unknown): TransportType | null {
  return value === 'flight' ||
    value === 'private_flight' ||
    value === 'train' ||
    value === 'car' ||
    value === 'taxi' ||
    value === 'ferry' ||
    value === 'eurotunnel'
    ? value
    : null;
}

function normalizeScheduledDate(value: unknown) {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === 'number') {
    return new Date(value).toISOString();
  }

  if (typeof value === 'string') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }

  return null;
}

function normalizeTriggerDate(trigger: unknown) {
  if (!trigger || typeof trigger !== 'object') {
    return null;
  }

  const data = trigger as Record<string, unknown>;
  return normalizeScheduledDate(data.date ?? data.value ?? null);
}

function buildTransportNotificationState(segment: TravelSegment, scheduledNotificationIds: string[]) {
  return {
    departureTimeZone: segment.departureTimeZone ?? (Intl.DateTimeFormat().resolvedOptions().timeZone || null),
    notificationSummary: getTransportNotificationSummary(segment),
    scheduledNotificationIds,
  };
}

async function persistTransportNotificationStates(snapshot: AppDataSnapshot, idsBySegmentId = new Map<string, string[]>()) {
  await Promise.all(
    snapshot.travelSegments.map((segment) =>
      updateTravelSegmentNotificationState(segment.id, buildTransportNotificationState(segment, idsBySegmentId.get(segment.id) ?? []))
    )
  );
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
          await Notifications.setNotificationChannelAsync(GENERAL_CHANNEL_ID, {
            name: 'Pineapple reminders',
            description: 'Local trip and document reminders scheduled by Pineapple.',
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 200, 150, 200],
            lightColor: '#0D6EFD',
            lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
          });

          await Notifications.setNotificationChannelAsync(TRANSPORT_CHANNEL_ID, {
            name: 'Pineapple transport alerts',
            description: 'Lock screen alerts for saved flights, trains, taxis, ferries, and Eurotunnel departures.',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 150, 250],
            lightColor: '#0D6EFD',
            lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
            bypassDnd: false,
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

export async function openDeviceNotificationSettings() {
  try {
    await Linking.openSettings();
    return true;
  } catch {
    return false;
  }
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
  await persistTransportNotificationStates(snapshot);

  if (!snapshot.appPreferences.notificationsEnabled) {
    return 0;
  }

  const hasPermissions = options.requestPermissions ? await requestNotificationPermissions() : await hasNotificationPermissions();
  if (!hasPermissions) {
    return 0;
  }

  const content = createReminderContent(snapshot);
  const idsBySegmentId = new Map<string, string[]>();

  await Promise.all(
    content.map(async (reminder) => {
      const identifier = await Notifications.scheduleNotificationAsync({
        content: ({
          title: reminder.title,
          body: reminder.body,
          data: {
            pineappleHref: reminder.href ?? null,
            pineappleActiveTripId: reminder.activeTripId ?? null,
            pineappleNotificationKind: reminder.kind,
            pineappleTransportSegmentId: reminder.transportSegmentId ?? null,
            pineappleTransportType: reminder.transportType ?? null,
          },
          channelId: reminder.channelId ?? (Platform.OS === 'android' ? GENERAL_CHANNEL_ID : undefined),
          ...(reminder.silent ? {} : { sound: 'default' }),
        } as unknown) as Parameters<typeof Notifications.scheduleNotificationAsync>[0]['content'],
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: reminder.date,
        },
      });

      if (reminder.transportSegmentId) {
        const existing = idsBySegmentId.get(reminder.transportSegmentId) ?? [];
        existing.push(identifier);
        idsBySegmentId.set(reminder.transportSegmentId, existing);
      }
    })
  );

  await persistTransportNotificationStates(snapshot, idsBySegmentId);
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

export async function addNotificationResponseListener(onReceive: (target: NotificationTarget) => void) {
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

async function getChannelStatus(
  Notifications: NotificationsModule,
  channelId: string
): Promise<NotificationChannelStatus | null> {
  if (Platform.OS !== 'android') {
    return null;
  }

  const channel = await Notifications.getNotificationChannelAsync(channelId);
  return {
    id: channelId,
    exists: Boolean(channel),
    name: channel?.name ?? null,
    importance: channel?.importance ?? null,
    lockscreenVisibility: channel?.lockscreenVisibility ?? null,
  };
}

export async function getNotificationDiagnostics() {
  const Notifications = await loadNotificationsModule();
  if (!Notifications) {
    return {
      runtimeSupported: false,
      permissionGranted: false,
      transportChannel: null,
      generalChannel: null,
      futureScheduledCount: 0,
      scheduledTransportAlerts: [],
    } satisfies NotificationDiagnostics;
  }

  const permissionGranted = await hasNotificationPermissions();
  const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
  const diagnostics: ScheduledNotificationDiagnostic[] = scheduledNotifications
    .map((notification) => {
      const data = (notification.content.data ?? {}) as Record<string, unknown>;
      return {
        id: notification.identifier,
        title: notification.content.title ?? '',
        body: notification.content.body ?? '',
        date: normalizeTriggerDate(notification.trigger),
        channelId: ((notification.content as { channelId?: string | null }).channelId ?? null),
        href: typeof data.pineappleHref === 'string' ? data.pineappleHref : null,
        activeTripId: typeof data.pineappleActiveTripId === 'string' ? data.pineappleActiveTripId : null,
        transportSegmentId:
          typeof data.pineappleTransportSegmentId === 'string' ? data.pineappleTransportSegmentId : null,
        transportType: normalizeTransportType(data.pineappleTransportType),
      };
    })
    .sort((left, right) => {
      const leftTime = left.date ? new Date(left.date).getTime() : Number.MAX_SAFE_INTEGER;
      const rightTime = right.date ? new Date(right.date).getTime() : Number.MAX_SAFE_INTEGER;
      return leftTime - rightTime;
    });

  return {
    runtimeSupported: true,
    permissionGranted,
    transportChannel: await getChannelStatus(Notifications, TRANSPORT_CHANNEL_ID),
    generalChannel: await getChannelStatus(Notifications, GENERAL_CHANNEL_ID),
    futureScheduledCount: diagnostics.length,
    scheduledTransportAlerts: diagnostics.filter((item) => item.transportSegmentId !== null),
  } satisfies NotificationDiagnostics;
}
