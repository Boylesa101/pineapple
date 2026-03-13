import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { differenceInCalendarDays, parseISO, subDays } from 'date-fns';

import type { AppDataSnapshot, ReminderKind, ReminderLeadTime } from '@/types/models';
import { getTripBundle } from '@/utils/selectors';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

type ReminderInput = {
  title: string;
  body: string;
  date: Date;
};

function isNativeNotificationsSupported() {
  return Platform.OS === 'android' || Platform.OS === 'ios';
}

function getReminderSetting(snapshot: AppDataSnapshot, tripId: string, kind: ReminderKind) {
  return (
    snapshot.reminderSettings.find((setting) => setting.tripId === tripId && setting.kind === kind) ??
    snapshot.reminderSettings.find((setting) => setting.tripId === null && setting.kind === kind) ??
    null
  );
}

function isReminderEnabled(snapshot: AppDataSnapshot, tripId: string, kind: ReminderKind) {
  if (!snapshot.appPreferences.notificationsEnabled) {
    return false;
  }

  const setting = getReminderSetting(snapshot, tripId, kind);
  return Boolean(setting?.enabled);
}

function getLeadTime(snapshot: AppDataSnapshot, tripId: string, kind: ReminderKind, fallback: ReminderLeadTime) {
  return getReminderSetting(snapshot, tripId, kind)?.leadTimeDays ?? fallback;
}

function buildReminderDate(targetIso: string, leadTimeDays: number) {
  const targetDate = parseISO(targetIso);
  const scheduledDate = subDays(targetDate, leadTimeDays);
  return scheduledDate;
}

function isFutureDate(date: Date) {
  return date.getTime() > Date.now() + 60_000;
}

function createReminderContent(snapshot: AppDataSnapshot): ReminderInput[] {
  const reminders: ReminderInput[] = [];

  for (const trip of snapshot.trips) {
    const bundle = getTripBundle(snapshot, trip.id);

    if (trip.status !== 'completed' && isReminderEnabled(snapshot, trip.id, 'trip_starts_tomorrow')) {
      const lead = getLeadTime(snapshot, trip.id, 'trip_starts_tomorrow', 1);
      const date = buildReminderDate(trip.startDate, lead);
      if (isFutureDate(date)) {
        reminders.push({
          title: `${trip.name} starts soon`,
          body: `${trip.destination} begins in ${differenceInCalendarDays(parseISO(trip.startDate), date)} day(s).`,
          date,
        });
      }
    }

    if (
      trip.status !== 'completed' &&
      bundle.packingItems.some((item) => !item.isPacked) &&
      isReminderEnabled(snapshot, trip.id, 'packing_incomplete')
    ) {
      const lead = getLeadTime(snapshot, trip.id, 'packing_incomplete', 1);
      const date = buildReminderDate(trip.startDate, lead);
      if (isFutureDate(date)) {
        reminders.push({
          title: `${trip.name} packing still incomplete`,
          body: `${bundle.packingItems.filter((item) => !item.isPacked).length} item(s) still need packing.`,
          date,
        });
      }
    }

    if (
      trip.status !== 'completed' &&
      !bundle.documents.some((document) => document.documentType === 'insurance') &&
      isReminderEnabled(snapshot, trip.id, 'insurance_missing')
    ) {
      const lead = getLeadTime(snapshot, trip.id, 'insurance_missing', 7);
      const date = buildReminderDate(trip.startDate, lead);
      if (isFutureDate(date)) {
        reminders.push({
          title: `${trip.name} needs insurance details`,
          body: 'Add insurance information before departure.',
          date,
        });
      }
    }

    if (isReminderEnabled(snapshot, trip.id, 'flight_check_in')) {
      const lead = getLeadTime(snapshot, trip.id, 'flight_check_in', 1);
      for (const segment of bundle.travelSegments) {
        const date = buildReminderDate(segment.departureTime, lead);
        if (isFutureDate(date)) {
          reminders.push({
            title: `${segment.airline} ${segment.flightNumber || ''}`.trim(),
            body: `Check in for ${segment.departureAirport} to ${segment.arrivalAirport}.`,
            date,
          });
        }
      }
    }

    if (isReminderEnabled(snapshot, trip.id, 'excursion_reminder')) {
      const lead = getLeadTime(snapshot, trip.id, 'excursion_reminder', 1);
      for (const event of bundle.itineraryEvents.filter((item) => item.type === 'excursion')) {
        const date = buildReminderDate(event.dateTime, lead);
        if (isFutureDate(date)) {
          reminders.push({
            title: `${event.title} is coming up`,
            body: `${trip.name} excursion reminder${event.location ? ` at ${event.location}` : ''}.`,
            date,
          });
        }
      }
    }

    if (isReminderEnabled(snapshot, trip.id, 'passport_expiry')) {
      const lead = getLeadTime(snapshot, trip.id, 'passport_expiry', 30);
      for (const document of bundle.documents.filter((item) => item.documentType === 'passport' && item.expiryDate)) {
        const date = buildReminderDate(document.expiryDate as string, lead);
        if (isFutureDate(date)) {
          reminders.push({
            title: `${document.holderName || 'Passport'} expiring soon`,
            body: `Passport expiry is approaching for ${trip.name}.`,
            date,
          });
        }
      }
    }

    if (isReminderEnabled(snapshot, trip.id, 'ghic_expiry')) {
      const lead = getLeadTime(snapshot, trip.id, 'ghic_expiry', 30);
      for (const document of bundle.documents.filter((item) => item.documentType === 'ghic' && item.expiryDate)) {
        const date = buildReminderDate(document.expiryDate as string, lead);
        if (isFutureDate(date)) {
          reminders.push({
            title: `${document.holderName || 'GHIC / EHIC'} expiring soon`,
            body: `GHIC / EHIC expiry is approaching for ${trip.name}.`,
            date,
          });
        }
      }
    }
  }

  return reminders.sort((left, right) => left.date.getTime() - right.date.getTime());
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

export async function rescheduleLocalNotifications(snapshot: AppDataSnapshot) {
  if (!isNativeNotificationsSupported()) {
    return 0;
  }

  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!snapshot.appPreferences.notificationsEnabled) {
    return 0;
  }

  const hasPermissions = await requestNotificationPermissions();
  if (!hasPermissions) {
    return 0;
  }

  const content = createReminderContent(snapshot);

  for (const reminder of content) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: reminder.title,
        body: reminder.body,
        sound: 'default',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: reminder.date,
      },
    });
  }

  return content.length;
}
