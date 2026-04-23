import { Linking, Platform } from 'react-native';
import Constants, { AppOwnership, ExecutionEnvironment } from 'expo-constants';

import type { AppDataSnapshot, TravelSegment, TransportType } from '@/types/models';
import { updateTravelSegmentNotificationState } from '@/db/repositories';
import { createReminderContent, getTransportNotificationSummary } from '@/services/notificationPlanner';
import type { TransportItem } from '@/services/transport';

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
  registrationState: 'local_only' | 'runtime_unsupported';
  transportChannel: NotificationChannelStatus | null;
  generalChannel: NotificationChannelStatus | null;
  futureScheduledCount: number;
  scheduledTransportAlerts: ScheduledNotificationDiagnostic[];
  lastScheduledAt: string | null;
  lastScheduleError: string | null;
  lastDeliveredEvent: {
    title: string;
    body: string;
    receivedAt: string;
  } | null;
};

const GENERAL_CHANNEL_ID = 'pineapple-reminders';
const TRANSPORT_CHANNEL_ID = 'pineapple-transport';

let notificationsModulePromise: Promise<NotificationsModule | null> | null = null;
let pendingRefreshTimer: ReturnType<typeof setTimeout> | null = null;
let pendingSnapshot: AppDataSnapshot | null = null;
let pendingRequestPermissions = false;
let pendingNotificationTarget: NotificationTarget | null = null;
let foregroundDeliverySubscriptionAttached = false;
let lastScheduledAt: string | null = null;
let lastScheduleError: string | null = null;
let lastDeliveredEvent: NotificationDiagnostics['lastDeliveredEvent'] = null;
const seenLiveUpdateSignatures = new Set<string>();

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
    value === 'bus' ||
    value === 'underground' ||
    value === 'metro' ||
    value === 'car' ||
    value === 'hire_car' ||
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

function rememberDeliveredEvent(title: string | null | undefined, body: string | null | undefined) {
  lastDeliveredEvent = {
    title: title?.trim() || 'Notification',
    body: body?.trim() || '',
    receivedAt: new Date().toISOString(),
  };
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

        if (!foregroundDeliverySubscriptionAttached) {
          Notifications.addNotificationReceivedListener((notification) => {
            rememberDeliveredEvent(notification.request.content.title, notification.request.content.body);
          });
          foregroundDeliverySubscriptionAttached = true;
        }

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

  lastScheduleError = null;
  await Notifications.cancelAllScheduledNotificationsAsync();
  await persistTransportNotificationStates(snapshot);

  if (!snapshot.appPreferences.notificationsEnabled) {
    lastScheduledAt = new Date().toISOString();
    return 0;
  }

  const hasPermissions = options.requestPermissions ? await requestNotificationPermissions() : await hasNotificationPermissions();
  if (!hasPermissions) {
    lastScheduledAt = new Date().toISOString();
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
  lastScheduledAt = new Date().toISOString();
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

    rescheduleLocalNotifications(nextSnapshot, { requestPermissions }).catch((error) => {
      lastScheduleError = error instanceof Error ? error.message : 'Notification scheduling failed.';
    });
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
    rememberDeliveredEvent(response.notification.request.content.title, response.notification.request.content.body);
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
      registrationState: 'runtime_unsupported',
      transportChannel: null,
      generalChannel: null,
      futureScheduledCount: 0,
      scheduledTransportAlerts: [],
      lastScheduledAt,
      lastScheduleError,
      lastDeliveredEvent,
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
    registrationState: 'local_only',
    transportChannel: await getChannelStatus(Notifications, TRANSPORT_CHANNEL_ID),
    generalChannel: await getChannelStatus(Notifications, GENERAL_CHANNEL_ID),
    futureScheduledCount: diagnostics.length,
    scheduledTransportAlerts: diagnostics.filter((item) => item.transportSegmentId !== null),
    lastScheduledAt,
    lastScheduleError,
    lastDeliveredEvent,
  } satisfies NotificationDiagnostics;
}

export async function sendImmediateTravelNotification(input: {
  title: string;
  body: string;
  href?: string | null;
  activeTripId?: string | null;
  channelId?: 'pineapple-reminders' | 'pineapple-transport';
  transportSegmentId?: string | null;
  transportType?: TransportType | null;
}) {
  const Notifications = await loadNotificationsModule();
  if (!Notifications) {
    return false;
  }

  if (!(await hasNotificationPermissions())) {
    return false;
  }

  await Notifications.scheduleNotificationAsync({
    content: ({
      title: input.title,
      body: input.body,
      data: {
        pineappleHref: input.href ?? null,
        pineappleActiveTripId: input.activeTripId ?? null,
        pineappleTransportSegmentId: input.transportSegmentId ?? null,
        pineappleTransportType: input.transportType ?? null,
      },
      channelId: input.channelId ?? (Platform.OS === 'android' ? GENERAL_CHANNEL_ID : undefined),
      sound: 'default',
    } as unknown) as Parameters<typeof Notifications.scheduleNotificationAsync>[0]['content'],
    trigger: null,
  });

  lastScheduledAt = new Date().toISOString();
  return true;
}

export async function notifyLiveTransportUpdates(tripId: string, items: TransportItem[], notificationsEnabled: boolean) {
  if (!notificationsEnabled) {
    return;
  }

  for (const item of items) {
    if (!item.isLive) {
      continue;
    }
    if (!['delayed', 'cancelled', 'gate_change', 'boarding'].includes(item.liveStatus)) {
      continue;
    }

    const signature = [item.id, item.liveStatus, item.lastUpdatedAt ?? item.departureTime ?? 'unknown'].join(':');
    if (seenLiveUpdateSignatures.has(signature)) {
      continue;
    }
    seenLiveUpdateSignatures.add(signature);

    const serviceLabel = item.flightNumber || item.trainNumber || item.serviceNumber || item.operatorName;
    const routeLabel = item.routeLabel || [item.originName, item.destinationName].filter(Boolean).join(' to ');
    const body =
      item.liveStatus === 'cancelled'
        ? `${serviceLabel} is now marked cancelled.`
        : item.liveStatus === 'gate_change'
          ? `${serviceLabel} has a gate or platform update.`
          : item.liveStatus === 'boarding'
            ? `${serviceLabel} is nearing departure.`
            : `${serviceLabel} is delayed.`;

    await sendImmediateTravelNotification({
      title: `Live travel update${routeLabel ? ` • ${routeLabel}` : ''}`,
      body,
      href: `/trip/${tripId}?focus=travel&segmentId=${item.sourceRecordId}`,
      activeTripId: tripId,
      channelId: 'pineapple-transport',
      transportSegmentId: item.sourceRecordId,
      transportType: item.travelSegment?.transportType ?? null,
    });
  }
}
