import { z } from 'zod';

// Opening times: a weekly pattern per office plus one-off days (bank holidays, closures, special
// hours). Times are "HH:MM" in UK local time. Mirrors private.valid_week() in the database.

export const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
export type Day = (typeof DAYS)[number];
export const DAY_LABELS: Record<Day, string> = {
  mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday',
};
export const TIME_ZONE = 'Europe/London';

const time = z.string().regex(/^([01][0-9]|2[0-3]):[0-5][0-9]$/, 'Use a time like 09:00');
const closeTime = z.string().regex(/^(([01][0-9]|2[0-3]):[0-5][0-9]|24:00)$/, 'Use a time like 17:30');

export const intervalsSchema = z
  .array(z.object({ open: time, close: closeTime }).strict())
  .max(3, 'Up to three opening periods a day')
  .superRefine((list, ctx) => {
    let prev = '';
    list.forEach((iv, i) => {
      if (iv.open >= iv.close) ctx.addIssue({ code: 'custom', path: [i], message: 'Closing time must be after opening time' });
      if (iv.open < prev) ctx.addIssue({ code: 'custom', path: [i], message: 'Periods must be in order and not overlap' });
      prev = iv.close;
    });
  });
export type Interval = { open: string; close: string };

export const weekSchema = z.object(Object.fromEntries(DAYS.map((d) => [d, intervalsSchema.optional()])) as Record<Day, z.ZodOptional<typeof intervalsSchema>>).strict();
export type Week = Partial<Record<Day, Interval[]>>;

export type Closure = { day: string; hours: Interval[] | null; note: string | null };

// Tolerant reader for stored data: anything malformed is dropped rather than shown wrongly.
export function readWeek(raw: unknown): Week {
  const parsed = weekSchema.safeParse(raw);
  if (parsed.success) return parsed.data as Week;
  const out: Week = {};
  if (raw && typeof raw === 'object') {
    for (const d of DAYS) {
      const one = intervalsSchema.safeParse((raw as Record<string, unknown>)[d]);
      if (one.success) out[d] = one.data;
    }
  }
  return out;
}

// The date, weekday and "HH:MM" for an instant, in UK time.
export function ukClock(now: Date) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
      weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(now).map((p) => [p.type, p.value]),
  );
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    day: parts.weekday.toLowerCase().slice(0, 3) as Day,
    time: `${parts.hour}:${parts.minute}`,
  };
}

// Hours that apply on a given date: a one-off day overrides the weekly pattern.
export function hoursOn(date: string, day: Day, week: Week, closures: Closure[]) {
  const special = closures.find((c) => c.day === date);
  if (special) return { intervals: special.hours ?? [], special: true, note: special.note };
  return { intervals: week[day] ?? [], special: false, note: null };
}

export function openNow(week: Week, closures: Closure[], now: Date) {
  const { date, day, time: t } = ukClock(now);
  const today = hoursOn(date, day, week, closures);
  const current = today.intervals.find((iv) => iv.open <= t && t < iv.close);
  return {
    open: !!current,
    closesAt: current?.close ?? null,
    today: today.intervals,
    todayNote: today.note,
  };
}

// "9:00am to 5:30pm", "Closed", "9am to 12:30pm, 1:30pm to 5:30pm"
export function formatTime(t: string) {
  if (t === '24:00') return 'midnight';
  const [h, m] = t.split(':').map(Number);
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}${m ? `:${String(m).padStart(2, '0')}` : ''}${h < 12 ? 'am' : 'pm'}`;
}
export const formatIntervals = (list: Interval[] | null | undefined) =>
  list?.length ? list.map((iv) => `${formatTime(iv.open)} to ${formatTime(iv.close)}`).join(', ') : 'Closed';
