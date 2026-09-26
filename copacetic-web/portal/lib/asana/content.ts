import { sectionConfig } from '@/lib/content/sections';

// What the portal writes into Asana. Task notes carry a marker (portal:<kind>:<id>) so a retried
// create can find the task it made last time instead of making a duplicate.

export const ASANA_SECTIONS = ['Briefing', 'Content', 'Build', 'Review', 'Launch'] as const;
export type AsanaSectionName = (typeof ASANA_SECTIONS)[number];

export const marker = (kind: 'site' | 'section' | 'briefing', id: string) => `portal:${kind}:${id}`;
export const hasMarker = (notes: unknown, m: string) =>
  typeof notes === 'string' && notes.split(/\s+/).includes(m);

export const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Asana rejects names over 1024 characters and control characters make them unreadable.
const clean = (s: string, max = 200) => s.replace(/[\u0000-\u001f\u007f]+/g, ' ').trim().slice(0, max);

const dateTime = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London',
});

export function projectFields(o: { orgName: string; siteName: string; siteId: string; portalLink: string }) {
  return {
    name: clean(`${o.orgName} · ${o.siteName}`, 250),
    notes: `Client portal: ${o.portalLink}\n\n${marker('site', o.siteId)}`,
  };
}

// Only the essentials go to Asana: the content itself stays in the portal, behind its permissions.
function notesHtml(lines: [string, string][], link: string, m: string) {
  const items = lines.map(([k, v]) => `<li><strong>${escapeHtml(k)}:</strong> ${escapeHtml(v)}</li>`).join('');
  return `<body><ul>${items}</ul><a href="${escapeHtml(link)}">Open in the client portal</a>\n\n<code>${m}</code></body>`;
}

export function sectionTask(s: {
  id: string; orgName: string; type: string; title: string | null; submittedAt: string | null; link: string;
}) {
  const label = sectionConfig(s.type)?.label ?? s.type;
  const what = s.title?.trim() ? `${label}: ${s.title}` : label;
  const lines: [string, string][] = [['Client', clean(s.orgName)], ['Section', clean(what)]];
  if (s.submittedAt) lines.push(['Submitted', dateTime.format(new Date(s.submittedAt))]);
  return {
    name: clean(`${s.orgName}: ${what}`, 250),
    html_notes: notesHtml(lines, s.link, marker('section', s.id)),
  };
}

export function briefingTask(b: { orgId: string; orgName: string; submittedAt: string | null; link: string }) {
  const lines: [string, string][] = [['Client', clean(b.orgName)]];
  if (b.submittedAt) lines.push(['Submitted', dateTime.format(new Date(b.submittedAt))]);
  return {
    name: clean(`${b.orgName}: briefing`, 250),
    html_notes: notesHtml(lines, b.link, marker('briefing', b.orgId)),
  };
}
