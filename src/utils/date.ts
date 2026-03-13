import { compareAsc, format, formatDistanceStrict, isAfter, parseISO, startOfDay } from 'date-fns';

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

export function sortByDateTime<T extends { dateTime: string }>(items: T[]) {
  return [...items].sort((a, b) => compareIsoDates(a.dateTime, b.dateTime));
}
