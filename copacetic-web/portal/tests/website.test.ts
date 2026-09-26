import { describe, expect, it } from 'vitest';
import { formatIntervals, openNow, readWeek, ukClock, weekSchema, type Week } from '@/lib/website/hours';
import { postState, slugify } from '@/lib/website/posts';
import { readingMinutes, richTextToHtml } from '@/lib/website/render';

const week: Week = {
  mon: [{ open: '09:00', close: '12:30' }, { open: '13:30', close: '17:30' }],
  tue: [{ open: '09:00', close: '17:30' }],
  sat: [],
};

describe('opening times', () => {
  it('accepts sensible weeks and refuses bad ones', () => {
    expect(weekSchema.safeParse(week).success).toBe(true);
    expect(weekSchema.safeParse({ mon: [{ open: '17:00', close: '09:00' }] }).success).toBe(false);
    expect(weekSchema.safeParse({ mon: [{ open: '09:00', close: '13:00' }, { open: '12:00', close: '17:00' }] }).success).toBe(false);
    expect(weekSchema.safeParse({ funday: [] }).success).toBe(false);
    expect(weekSchema.safeParse({ mon: [{ open: '9am', close: '5pm' }] }).success).toBe(false);
    expect(weekSchema.safeParse({ fri: [{ open: '18:00', close: '24:00' }] }).success).toBe(true);
  });

  it('reads stored data tolerantly', () => {
    expect(readWeek({ mon: week.mon, tue: 'garbage' })).toEqual({ mon: week.mon });
    expect(readWeek(null)).toEqual({});
  });

  it('works in UK time across the clocks changing', () => {
    // 08:30 UTC on a summer Monday is 09:30 in London (BST).
    expect(ukClock(new Date('2026-07-06T08:30:00Z'))).toEqual({ date: '2026-07-06', day: 'mon', time: '09:30' });
    // In winter London is on GMT.
    expect(ukClock(new Date('2026-01-05T08:30:00Z'))).toEqual({ date: '2026-01-05', day: 'mon', time: '08:30' });
  });

  it('knows whether the office is open now, including lunch', () => {
    expect(openNow(week, [], new Date('2026-07-06T08:30:00Z'))).toMatchObject({ open: true, closesAt: '12:30' });
    expect(openNow(week, [], new Date('2026-07-06T12:00:00Z')).open).toBe(false); // 13:00 BST, lunch
    expect(openNow(week, [], new Date('2026-07-11T10:00:00Z')).open).toBe(false); // Saturday
    expect(openNow(week, [], new Date('2026-07-06T16:30:00Z')).open).toBe(false); // 17:30 exactly: closed
  });

  it('lets a one-off day override the week', () => {
    const closures = [
      { day: '2026-07-06', hours: null, note: 'Staff training' },
      { day: '2026-07-07', hours: [{ open: '10:00', close: '12:00' }], note: 'Short day' },
    ];
    expect(openNow(week, closures, new Date('2026-07-06T09:00:00Z'))).toMatchObject({ open: false, todayNote: 'Staff training' });
    expect(openNow(week, closures, new Date('2026-07-07T08:30:00Z')).open).toBe(false); // 09:30, opens at 10
    expect(openNow(week, closures, new Date('2026-07-07T09:30:00Z')).open).toBe(true);
  });

  it('formats hours for people', () => {
    expect(formatIntervals(week.mon)).toBe('9am to 12:30pm, 1:30pm to 5:30pm');
    expect(formatIntervals([])).toBe('Closed');
    expect(formatIntervals([{ open: '00:00', close: '24:00' }])).toBe('12am to midnight');
  });
});

describe('post rendering', () => {
  it('renders the allowed formatting', () => {
    const doc = {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Fees' }] },
        { type: 'paragraph', content: [
          { type: 'text', text: 'See ' },
          { type: 'text', text: 'our prices', marks: [{ type: 'link', attrs: { href: 'https://firm.co.uk/prices' } }, { type: 'bold' }] },
        ] },
        { type: 'bulletList', content: [{ type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'One' }] }] }] },
      ],
    };
    expect(richTextToHtml(doc)).toBe(
      '<h2>Fees</h2><p>See <strong><a href="https://firm.co.uk/prices" rel="noopener noreferrer nofollow">our prices</a></strong></p>' +
      '<ul><li><p>One</p></li></ul>',
    );
  });

  it('never lets markup or unsafe links through, whatever is stored', () => {
    const evil = {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: '<script>alert(1)</script>' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'x', marks: [{ type: 'link', attrs: { href: 'javascript:alert(1)' } }] }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'y', marks: [{ type: 'link', attrs: { href: '"><img src=x onerror=alert(1)>' } }] }] },
        { type: 'image', attrs: { src: 'https://evil.test/x.png' } },
        { type: 'heading', attrs: { level: '1 onclick=alert(1)' }, content: [{ type: 'text', text: 'H' }] },
        { type: 'iframe' },
      ],
    };
    const html = richTextToHtml(evil);
    expect(html).not.toMatch(/<script|javascript:|<img|<iframe|onclick|onerror="?alert/);
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('<h2>H</h2>');
    expect(richTextToHtml(null)).toBe('');
    expect(richTextToHtml('nonsense')).toBe('');
  });

  it('estimates reading time', () => {
    const words = Array.from({ length: 600 }, () => 'word').join(' ');
    expect(readingMinutes({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: words }] }] })).toBe(3);
  });
});

describe('posts', () => {
  it('makes readable addresses from titles', () => {
    expect(slugify('Buying your first home: a guide')).toBe('buying-your-first-home-a-guide');
    expect(slugify('Wills & Probate — FAQs')).toBe('wills-and-probate-faqs');
    expect(slugify('Café résumé')).toBe('cafe-resume');
    expect(slugify('!!!')).toBe('post');
  });

  it('works out whether a post is a draft, scheduled or live', () => {
    const now = new Date('2026-07-06T09:00:00Z');
    expect(postState({ status: 'draft', published_at: null }, now)).toBe('draft');
    expect(postState({ status: 'published', published_at: '2026-07-07T09:00:00Z' }, now)).toBe('scheduled');
    expect(postState({ status: 'published', published_at: '2026-07-05T09:00:00Z' }, now)).toBe('published');
  });
});
