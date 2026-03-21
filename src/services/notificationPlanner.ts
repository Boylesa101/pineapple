import { addDays, differenceInCalendarDays, differenceInHours, parseISO, setHours, setMinutes, setSeconds, subDays, subHours } from 'date-fns';

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
  return subDays(targetDate, leadTimeDays);
}

function buildReminderDateAtHour(targetIso: string, leadTimeDays: number, hour: number) {
  return setSeconds(setMinutes(setHours(buildReminderDate(targetIso, leadTimeDays), hour), 0), 0);
}

function isFutureDate(date: Date) {
  return date.getTime() > Date.now() + 60_000;
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
    .filter((item): item is { leadDays: ExpiryReminderLeadTime; scheduledDate: Date } => isFutureDate(item.scheduledDate));
}

export function createReminderContent(snapshot: AppDataSnapshot): ReminderInput[] {
  const reminders: ReminderInput[] = [];
  const hasProfilePhoto = Boolean(snapshot.appPreferences.profilePhotoUri);
  const hasPassportDocument = snapshot.documents.some((document) => document.documentType === 'passport');

  if (!hasProfilePhoto || !hasPassportDocument) {
    const setupReminderDate = setSeconds(setMinutes(setHours(addDays(new Date(), 1), 18), 0), 0);
    if (isFutureDate(setupReminderDate)) {
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

    if (trip.status !== 'completed' && isReminderEnabled(snapshot, trip.id, 'trip_starts_tomorrow')) {
      const lead = getLeadTime(snapshot, trip.id, 'trip_starts_tomorrow', 1);
      const date = buildReminderDateAtHour(trip.startDate, lead, 9);
      if (isFutureDate(date)) {
        reminders.push({
          title: `${trip.name} starts soon`,
          body: `${trip.destination} begins in ${differenceInCalendarDays(parseISO(trip.startDate), date)} day(s).`,
          date,
          href: `/trip/${trip.id}`,
          activeTripId: trip.id,
        });
      }
    }

    if (trip.status !== 'completed' && isReminderEnabled(snapshot, trip.id, 'trip_today')) {
      const date = buildReminderDateAtHour(trip.startDate, 0, 7);
      if (isFutureDate(date)) {
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
      const lead = getLeadTime(snapshot, trip.id, 'packing_incomplete', 1);
      const date = buildReminderDateAtHour(trip.startDate, lead, 18);
      if (isFutureDate(date)) {
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
      const date = buildReminderDateAtHour(trip.startDate, lead, 10);
      if (isFutureDate(date)) {
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
      for (const segment of bundle.travelSegments) {
        const date = buildReminderDateAtHour(segment.departureTime, lead, 9);
        if (isFutureDate(date)) {
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
      for (const hotel of bundle.hotelStays) {
        const date = buildReminderDateAtHour(hotel.checkIn, 0, 9);
        if (isFutureDate(date)) {
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
      const date = subHours(parseISO(trip.transferTime), 2);
      if (isFutureDate(date)) {
        const hoursUntilTransfer = Math.max(1, differenceInHours(parseISO(trip.transferTime), date));
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
      const date = buildReminderDateAtHour(trip.startDate, 0, 6);
      if (isFutureDate(date)) {
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
      const date = buildReminderDateAtHour(trip.startDate, 0, 8);
      if (isFutureDate(date)) {
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
      for (const event of bundle.itineraryEvents.filter((item) => item.type === 'excursion')) {
        const date = buildReminderDateAtHour(event.dateTime, lead, 8);
        if (isFutureDate(date)) {
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
