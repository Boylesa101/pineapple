import { differenceInCalendarDays, parseISO, subDays } from 'date-fns';

import type { AppDataSnapshot, Document, DocumentType, ExpiryReminderLeadTime, ReminderKind, ReminderLeadTime } from '@/types/models';
import { getTripBundle } from '@/utils/selectors';

export type ReminderInput = {
  title: string;
  body: string;
  date: Date;
  silent?: boolean;
};

const documentLabelMap: Record<DocumentType, string> = {
  passport: 'Passport',
  ghic: 'GHIC / EHIC',
  insurance: 'Travel insurance',
  visa: 'Visa',
  driving_licence: 'Driving licence',
  payment_card: 'Payment card',
  id_card: 'ID card',
  boarding_pass: 'Boarding pass',
  hotel_booking: 'Hotel booking',
  excursion_ticket: 'Excursion ticket',
  custom: 'Document',
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

function isFutureDate(date: Date) {
  return date.getTime() > Date.now() + 60_000;
}

function getDocumentOwnerLabel(holderName: string, fallback: string | undefined) {
  return holderName || fallback || 'Your';
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

    if (trip.status !== 'completed' && snapshot.appPreferences.expiryRemindersEnabled) {
      for (const document of bundle.documents.filter(
        (item) =>
          ['passport', 'ghic', 'insurance', 'visa', 'driving_licence', 'payment_card', 'id_card', 'custom'].includes(item.documentType) &&
          item.expiryDate &&
          item.expiryReminderEnabled
      )) {
        const traveller = bundle.travellers.find((item) => item.id === document.travellerId);
        const owner = getDocumentOwnerLabel(document.holderName, traveller?.fullName);

        for (const reminder of getDocumentReminderDates(document)) {
          reminders.push({
            title: `${owner} ${documentLabelMap[document.documentType]} expires soon`,
            body:
              reminder.leadDays === 0
                ? 'One of your travel documents has expired.'
                : `Your ${documentLabelMap[document.documentType].toLowerCase()} expires in ${formatLeadLabel(reminder.leadDays)}.`,
            date: reminder.scheduledDate,
            silent: snapshot.appPreferences.expiryReminderSilent,
          });
        }
      }
    }
  }

  return reminders.sort((left, right) => left.date.getTime() - right.date.getTime());
}
