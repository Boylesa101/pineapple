import {
  compareAsc,
  differenceInCalendarDays,
  format,
  formatDistanceStrict,
  isAfter,
  isBefore,
  isValid,
  parseISO,
  startOfDay,
} from 'date-fns';

export function parseIsoDate(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const parsed = parseISO(value);
  return isValid(parsed) ? parsed : null;
}

export function coerceDate(value: string | null | undefined, fallback = new Date()) {
  return parseIsoDate(value) ?? fallback;
}

export function formatShortDate(value: string | null | undefined) {
  const parsed = parseIsoDate(value);
  if (!parsed) {
    return 'Not set';
  }

  return format(parsed, 'dd MMM yyyy');
}

export function formatDateTime(value: string | null | undefined) {
  const parsed = parseIsoDate(value);
  if (!parsed) {
    return 'Not set';
  }

  return format(parsed, 'dd MMM yyyy, HH:mm');
}

export function formatTimelineDate(value: string) {
  const parsed = parseIsoDate(value);
  if (!parsed) {
    return 'Date unavailable';
  }
  return format(parsed, 'EEE, dd MMM');
}

export function compareIsoDates(left: string, right: string) {
  const leftDate = parseIsoDate(left);
  const rightDate = parseIsoDate(right);
  if (!leftDate && !rightDate) {
    return 0;
  }
  if (!leftDate) {
    return 1;
  }
  if (!rightDate) {
    return -1;
  }
  return compareAsc(leftDate, rightDate);
}

export function isUpcoming(dateIso: string) {
  const parsed = parseIsoDate(dateIso);
  return parsed ? isAfter(parsed, new Date()) : false;
}

export function countdownLabel(dateIso: string) {
  const parsed = parseIsoDate(dateIso);
  if (!parsed) {
    return 'Date unavailable';
  }

  const target = startOfDay(parsed);
  const today = startOfDay(new Date());

  if (compareAsc(target, today) <= 0) {
    return 'Today';
  }

  return formatDistanceStrict(target, today, { unit: 'day' });
}

export function daysUntil(dateIso: string) {
  const parsed = parseIsoDate(dateIso);
  if (!parsed) {
    return null;
  }
  return differenceInCalendarDays(startOfDay(parsed), startOfDay(new Date()));
}

export function daysLeft(endDateIso: string) {
  const parsed = parseIsoDate(endDateIso);
  if (!parsed) {
    return null;
  }
  return differenceInCalendarDays(startOfDay(parsed), startOfDay(new Date()));
}

export function isDateWithinDays(value: string | null | undefined, days: number) {
  const parsed = parseIsoDate(value);
  if (!parsed) {
    return false;
  }

  const target = startOfDay(parsed);
  const today = startOfDay(new Date());
  return !isBefore(target, today) && differenceInCalendarDays(target, today) <= days;
}

export function isPast(value: string | null | undefined) {
  const parsed = parseIsoDate(value);
  if (!parsed) {
    return false;
  }
  return isBefore(parsed, new Date());
}

export function sortByDateTime<T extends { dateTime: string }>(items: T[]) {
  return [...items].sort((a, b) => compareIsoDates(a.dateTime, b.dateTime));
}
