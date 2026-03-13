import {
  compareAsc,
  differenceInCalendarDays,
  format,
  formatDistanceStrict,
  isAfter,
  isBefore,
  parseISO,
  startOfDay,
} from 'date-fns';

export function formatShortDate(value: string | null | undefined) {
  if (!value) {
    return 'Not set';
  }

  return format(parseISO(value), 'dd MMM yyyy');
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return 'Not set';
  }

  return format(parseISO(value), 'dd MMM yyyy, HH:mm');
}

export function formatTimelineDate(value: string) {
  return format(parseISO(value), 'EEE, dd MMM');
}

export function compareIsoDates(left: string, right: string) {
  return compareAsc(parseISO(left), parseISO(right));
}

export function isUpcoming(dateIso: string) {
  return isAfter(parseISO(dateIso), new Date());
}

export function countdownLabel(dateIso: string) {
  const target = startOfDay(parseISO(dateIso));
  const today = startOfDay(new Date());

  if (compareAsc(target, today) <= 0) {
    return 'Today';
  }

  return formatDistanceStrict(target, today, { unit: 'day' });
}

export function daysUntil(dateIso: string) {
  return differenceInCalendarDays(startOfDay(parseISO(dateIso)), startOfDay(new Date()));
}

export function daysLeft(endDateIso: string) {
  return differenceInCalendarDays(startOfDay(parseISO(endDateIso)), startOfDay(new Date()));
}

export function isDateWithinDays(value: string | null | undefined, days: number) {
  if (!value) {
    return false;
  }

  const target = startOfDay(parseISO(value));
  const today = startOfDay(new Date());
  return !isBefore(target, today) && differenceInCalendarDays(target, today) <= days;
}

export function isPast(value: string | null | undefined) {
  if (!value) {
    return false;
  }
  return isBefore(parseISO(value), new Date());
}

export function sortByDateTime<T extends { dateTime: string }>(items: T[]) {
  return [...items].sort((a, b) => compareIsoDates(a.dateTime, b.dateTime));
}
