import { addDays, differenceInHours, parseISO, setHours, setMinutes, setSeconds, subDays, subHours } from 'date-fns';

import { getNotificationProofReminderDate, isNotificationProofTripId } from '@/data/notificationProofBuild';
import type { AppDataSnapshot, Document, ExpiryReminderLeadTime, ReminderKind, ReminderLeadTime } from '@/types/models';
import { formatAirportDisplay } from '@/utils/airports';
import { getTripBundle } from '@/utils/selectors';

export type ReminderInput = {
  title: string;
  body: string;
  date: Date;
  silent?: boolean;
  href?: string;
  activeTripId?: string | null;
};

function getReminderSetting(snapshot: AppDataSnapshot, tripId: string, kind: ReminderKind) {
  return (
    snapshot.reminderSettings.find((setting) => setting.tripId === tripId && setting.kind === kind) ??
    snapshot.reminderSettings.find((setting) => setting.tripId === null && setting.kind === kind) ??
    null
  );
}

function getReminderSettingForKinds(snapshot: AppDataSnapshot, tripId: string, kinds: ReminderKind[]) {
  for (const kind of kinds) {
    const setting = getReminderSetting(snapshot, tripId, kind);
    if (setting) {
      return setting;
    }
  }

  return null;
}

function isReminderEnabled(snapshot: AppDataSnapshot, tripId: string, kind: ReminderKind) {
  if (!snapshot.appPreferences.notificationsEnabled) {
    return false;
  }

  const setting = getReminderSetting(snapshot, tripId, kind);
  return Boolean(setting?.enabled);
}

function isReminderEnabledForKinds(snapshot: AppDataSnapshot, tripId: string, kinds: ReminderKind[]) {
  if (!snapshot.appPreferences.notificationsEnabled) {
    return false;
  }

  return Boolean(getReminderSettingForKinds(snapshot, tripId, kinds)?.enabled);
}

function getLeadTime(snapshot: AppDataSnapshot, tripId: string, kind: ReminderKind, fallback: ReminderLeadTime) {
  return getReminderSetting(snapshot, tripId, kind)?.leadTimeDays ?? fallback;
}

function getLeadTimeForKinds(snapshot: AppDataSnapshot, tripId: string, kinds: ReminderKind[], fallback: ReminderLeadTime) {
  return getReminderSettingForKinds(snapshot, tripId, kinds)?.leadTimeDays ?? fallback;
}

function buildReminderDate(targetIso: string, leadTimeDays: number) {
  const targetDate = parseISO(targetIso);
  return subDays(targetDate, leadTimeDays);
}

function buildReminderDateAtHour(targetIso: string, leadTimeDays: number, hour: number) {
  return setSeconds(setMinutes(setHours(buildReminderDate(targetIso, leadTimeDays), hour), 0), 0);
}

function isFutureDate(date: Date, now: Date) {
  return date.getTime() > now.getTime() + 60_000;
}

function formatLeadLabel(leadDays: number) {
  if (leadDays === 180) return '6 months';
  if (leadDays === 90) return '3 months';
  if (leadDays === 30) return '30 days';
  if (leadDays === 14) return '14 days';
  if (leadDays === 7) return '7 days';
  if (leadDays === 1) return '1 day';
  if (leadDays === 0) return 'today';
  return `${leadDays} days`;
}

function getDocumentReminderDates(document: Pick<Document, 'expiryDate' | 'expiryReminderSchedule'>) {
  if (!document.expiryDate) {
    return [];
  }

  return document.expiryReminderSchedule
    .map((leadDays) => ({
      leadDays,
      scheduledDate: buildReminderDate(document.expiryDate as string, leadDays),
    }))
    .filter((item): item is { leadDays: ExpiryReminderLeadTime; scheduledDate: Date } => isFutureDate(item.scheduledDate, new Date()));
}

function resolveReminderDate(options: {
  tripId: string;
  kind: ReminderKind;
  defaultDate: Date;
  now: Date;
  occurrenceIndex?: number;
}) {
  if (!isNotificationProofTripId(options.tripId)) {
    return options.defaultDate;
  }

  return getNotificationProofReminderDate(options.kind, options.now, options.occurrenceIndex ?? 0) ?? options.defaultDate;
}

export function createReminderContent(snapshot: AppDataSnapshot, options: { now?: Date } = {}): ReminderInput[] {
  const now = options.now ?? new Date();
  const reminders: ReminderInput[] = [];
  const hasProfilePhoto = Boolean(snapshot.appPreferences.profilePhotoUri);
  const hasPassportDocument = snapshot.documents.some((document) => document.documentType === 'passport');

  if (!hasProfilePhoto || !hasPassportDocument) {
    const setupReminderDate = setSeconds(setMinutes(setHours(addDays(now, 1), 18), 0), 0);
    if (isFutureDate(setupReminderDate, now)) {
      reminders.push({
        title: 'Finish your Pineapple setup',
        body: !hasPassportDocument ? 'Add your main travel document so it is ready in Vault.' : 'Add a profile photo so your travel profile is easy to recognise.',
        date: setupReminderDate,
        href: !hasPassportDocument ? '/vault' : '/account',
      });
    }
  }

  for (const trip of snapshot.trips) {
    const bundle = getTripBundle(snapshot, trip.id);

    const countdownConfigs: Array<{ kinds: ReminderKind[]; fallbackLead: ReminderLeadTime }> = [
      { kinds: ['trip_countdown_30_days'], fallbackLead: 30 },
      { kinds: ['trip_countdown_7_days'], fallbackLead: 7 },
      { kinds: ['trip_countdown_3_days'], fallbackLead: 3 },
      { kinds: ['trip_countdown_1_day', 'trip_starts_tomorrow'], fallbackLead: 1 },
    ];

    for (const config of countdownConfigs) {
      if (trip.status === 'completed' || !isReminderEnabledForKinds(snapshot, trip.id, config.kinds)) {
        continue;
      }

      const lead = getLeadTimeForKinds(snapshot, trip.id, config.kinds, config.fallbackLead);
      const date = resolveReminderDate({
        tripId: trip.id,
        kind: config.kinds[0] as ReminderKind,
        defaultDate: buildReminderDateAtHour(trip.startDate, lead, 9),
        now,
      });
      if (isFutureDate(date, now)) {
        reminders.push({
          title: `${trip.name} starts soon`,
          body: `${formatLeadLabel(lead)} until ${trip.destination}.`,
          date,
          href: `/trip/${trip.id}`,
          activeTripId: trip.id,
        });
      }
    }

    if (trip.status !== 'completed' && isReminderEnabled(snapshot, trip.id, 'trip_today')) {
      const date = resolveReminderDate({
        tripId: trip.id,
        kind: 'trip_today',
        defaultDate: buildReminderDateAtHour(trip.startDate, 0, 7),
        now,
      });
      if (isFutureDate(date, now)) {
        reminders.push({
          title: `${trip.name} is today`,
          body: `Safe travels. ${trip.destination} starts today.`,
          date,
          href: `/trip/${trip.id}`,
          activeTripId: trip.id,
        });
      }
    }

    if (
      trip.status !== 'completed' &&
      bundle.packingItems.some((item) => !item.isPacked) &&
      isReminderEnabled(snapshot, trip.id, 'packing_incomplete')
    ) {
      const lead = getLeadTime(snapshot, trip.id, 'packing_incomplete', 6);
      const date = resolveReminderDate({
        tripId: trip.id,
        kind: 'packing_incomplete',
        defaultDate: buildReminderDateAtHour(trip.startDate, lead, 18),
        now,
      });
      if (isFutureDate(date, now)) {
        reminders.push({
          title: `${trip.name} packing still incomplete`,
          body: `${bundle.packingItems.filter((item) => !item.isPacked).length} item(s) still need packing.`,
          date,
          href: '/packing',
          activeTripId: trip.id,
        });
      }
    }

    if (
      trip.status !== 'completed' &&
      !bundle.documents.some((document) => document.documentType === 'insurance') &&
      isReminderEnabled(snapshot, trip.id, 'insurance_missing')
    ) {
      const lead = getLeadTime(snapshot, trip.id, 'insurance_missing', 7);
      const date = resolveReminderDate({
        tripId: trip.id,
        kind: 'insurance_missing',
        defaultDate: buildReminderDateAtHour(trip.startDate, lead, 10),
        now,
      });
      if (isFutureDate(date, now)) {
        reminders.push({
          title: `${trip.name} needs insurance details`,
          body: 'Add insurance information before departure.',
          date,
          href: '/vault',
          activeTripId: trip.id,
        });
      }
    }

    if (isReminderEnabled(snapshot, trip.id, 'flight_check_in')) {
      const lead = getLeadTime(snapshot, trip.id, 'flight_check_in', 1);
      for (const [index, segment] of bundle.travelSegments.entries()) {
        const date = resolveReminderDate({
          tripId: trip.id,
          kind: 'flight_check_in',
          defaultDate: buildReminderDateAtHour(segment.departureTime, lead, 9),
          now,
          occurrenceIndex: index,
        });
        if (isFutureDate(date, now)) {
          reminders.push({
            title: `${segment.airline} ${segment.flightNumber || ''}`.trim(),
            body: `Check in for ${formatAirportDisplay(segment.departureAirport, segment.departureAirportCode)} to ${formatAirportDisplay(segment.arrivalAirport, segment.arrivalAirportCode)}.`,
            date,
            href: `/trip/${trip.id}?focus=travel`,
            activeTripId: trip.id,
          });
        }
      }
    }

    if (isReminderEnabled(snapshot, trip.id, 'hotel_check_in')) {
      for (const [index, hotel] of bundle.hotelStays.entries()) {
        const date = resolveReminderDate({
          tripId: trip.id,
          kind: 'hotel_check_in',
          defaultDate: buildReminderDateAtHour(hotel.checkIn, 0, 9),
          now,
          occurrenceIndex: index,
        });
        if (isFutureDate(date, now)) {
          reminders.push({
            title: `${hotel.hotelName} check-in today`,
            body: `Hotel reminder for ${hotel.city || trip.destination}.`,
            date,
            href: `/trip/${trip.id}?focus=hotel`,
            activeTripId: trip.id,
          });
        }
      }
    }

    if (trip.transferTime && isReminderEnabled(snapshot, trip.id, 'transfer_reminder')) {
      const proofTrip = isNotificationProofTripId(trip.id);
      const date = resolveReminderDate({
        tripId: trip.id,
        kind: 'transfer_reminder',
        defaultDate: subHours(parseISO(trip.transferTime), 2),
        now,
      });
      if (isFutureDate(date, now)) {
        const hoursUntilTransfer = proofTrip ? 2 : Math.max(1, differenceInHours(parseISO(trip.transferTime), date));
        reminders.push({
          title: `${trip.name} transfer coming up`,
          body: `${trip.transferMethod || 'Transfer'} in ${hoursUntilTransfer} hour(s)${trip.transferLocation ? ` from ${trip.transferLocation}` : ''}.`,
          date,
          href: `/trip/${trip.id}?focus=transfer`,
          activeTripId: trip.id,
        });
      }
    }

    if (isReminderEnabled(snapshot, trip.id, 'travel_mode_reminder')) {
      const date = resolveReminderDate({
        tripId: trip.id,
        kind: 'travel_mode_reminder',
        defaultDate: buildReminderDateAtHour(trip.startDate, 0, 6),
        now,
      });
      if (isFutureDate(date, now)) {
        reminders.push({
          title: `${trip.name} travel mode is ready`,
          body: 'Open your travel pack before you leave.',
          date,
          href: `/trip/${trip.id}/travel-mode`,
          activeTripId: trip.id,
        });
      }
    }

    if (isReminderEnabled(snapshot, trip.id, 'sos_ready')) {
      const date = resolveReminderDate({
        tripId: trip.id,
        kind: 'sos_ready',
        defaultDate: buildReminderDateAtHour(trip.startDate, 0, 8),
        now,
      });
      if (isFutureDate(date, now)) {
        reminders.push({
          title: `${trip.name} SOS tools are ready`,
          body: 'Emergency numbers and quick access are available in SOS.',
          date,
          href: '/sos',
          activeTripId: trip.id,
        });
      }
    }

    if (isReminderEnabled(snapshot, trip.id, 'excursion_reminder')) {
      const lead = getLeadTime(snapshot, trip.id, 'excursion_reminder', 1);
      for (const [index, event] of bundle.itineraryEvents.filter((item) => item.type === 'excursion').entries()) {
        const date = resolveReminderDate({
          tripId: trip.id,
          kind: 'excursion_reminder',
          defaultDate: buildReminderDateAtHour(event.dateTime, lead, 8),
          now,
          occurrenceIndex: index,
        });
        if (isFutureDate(date, now)) {
          reminders.push({
            title: `${event.title} is coming up`,
            body: `${trip.name} excursion reminder${event.location ? ` at ${event.location}` : ''}.`,
            date,
            href: '/itinerary',
            activeTripId: trip.id,
          });
        }
      }
    }

    if (trip.status !== 'completed' && snapshot.appPreferences.expiryRemindersEnabled) {
      for (const document of bundle.documents.filter(
        (item) =>
          ['passport', 'ghic', 'insurance', 'visa', 'driving_licence', 'payment_card', 'id_card', 'custom'].includes(item.documentType) &&
          item.expiryDate &&
          item.expiryReminderEnabled
      )) {
        for (const reminder of getDocumentReminderDates(document)) {
          reminders.push({
            title: reminder.leadDays === 0 ? 'Travel document expired' : 'Travel document reminder',
            body:
              reminder.leadDays === 0
                ? 'One of your saved travel documents has expired.'
                : `A saved travel document expires in ${formatLeadLabel(reminder.leadDays)}.`,
            date: reminder.scheduledDate,
            silent: snapshot.appPreferences.expiryReminderSilent,
            href: `/vault?editDocumentId=${document.id}`,
            activeTripId: document.tripId,
          });
        }
      }
    }
  }

  return reminders.sort((left, right) => left.date.getTime() - right.date.getTime());
}
