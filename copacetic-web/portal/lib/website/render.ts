// Turns stored rich text (Tiptap JSON) into HTML for client websites. Only the formatting the editor
// allows is emitted; everything else (unknown nodes, attributes, unsafe links) is dropped and all
// text is escaped. Safe to run on anything in the database, validated or not.

type Node = { type?: unknown; text?: unknown; content?: unknown; attrs?: unknown; marks?: unknown };

const BLOCKS: Record<string, string> = {
  paragraph: 'p', bulletList: 'ul', orderedList: 'ol', listItem: 'li', blockquote: 'blockquote',
};

export const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

export const safeHref = (h: unknown): string | null =>
  typeof h === 'string' && h.length <= 2000 && /^(https?:\/\/|mailto:)/i.test(h.trim()) ? h.trim() : null;

function renderText(n: Node): string {
  let out = escapeHtml(typeof n.text === 'string' ? n.text : '');
  const marks = Array.isArray(n.marks) ? (n.marks as Node[]).slice(0, 5) : [];
  for (const m of marks) {
    if (m?.type === 'bold') out = `<strong>${out}</strong>`;
    else if (m?.type === 'italic') out = `<em>${out}</em>`;
    else if (m?.type === 'link') {
      const href = safeHref((m.attrs as { href?: unknown } | undefined)?.href);
      if (href) {
        const external = /^https?:/i.test(href);
        out = `<a href="${escapeHtml(href)}"${external ? ' rel="noopener noreferrer nofollow"' : ''}>${out}</a>`;
      }
    }
  }
  return out;
}

function render(n: Node, depth: number): string {
  if (!n || typeof n !== 'object' || depth > 40) return '';
  const children = () =>
    Array.isArray(n.content) ? (n.content as Node[]).slice(0, 1000).map((c) => render(c, depth + 1)).join('') : '';
  switch (n.type) {
    case 'doc':
      return children();
    case 'text':
      return renderText(n);
    case 'hardBreak':
      return '<br>';
    case 'heading': {
      const level = (n.attrs as { level?: unknown } | undefined)?.level === 3 ? 3 : 2;
      return `<h${level}>${children()}</h${level}>`;
    }
    default: {
      const tag = typeof n.type === 'string' ? BLOCKS[n.type] : undefined;
      return tag ? `<${tag}>${children()}</${tag}>` : '';
    }
  }
}

export const richTextToHtml = (doc: unknown) => render(doc as Node, 0);

// Rough reading time for a post (about 200 words a minute).
export function readingMinutes(doc: unknown) {
  const words = richTextToHtml(doc).replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}
