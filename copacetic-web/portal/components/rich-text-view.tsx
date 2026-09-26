import { Fragment, type ReactNode } from 'react';

type Node = { type: string; text?: string; content?: Node[]; attrs?: { level?: number; href?: string }; marks?: { type: string; attrs?: { href?: string } }[] };

// Renders stored Tiptap JSON as React elements. Only the allowed node types are drawn; anything
// else is ignored. No HTML strings are ever injected.
export function RichTextView({ doc }: { doc: unknown }) {
  const d = doc as Node | null;
  if (!d?.content?.length) return <p className="small">Nothing written.</p>;
  return <div className="rt-body" style={{ padding: 0, minHeight: 0 }}>{d.content.map((n, i) => render(n, i))}</div>;
}

function render(n: Node, key: number): ReactNode {
  const kids = n.content?.map((c, i) => render(c, i));
  switch (n.type) {
    case 'paragraph': return <p key={key}>{kids}</p>;
    case 'heading': return n.attrs?.level === 2 ? <h2 key={key}>{kids}</h2> : <h3 key={key}>{kids}</h3>;
    case 'bulletList': return <ul key={key}>{kids}</ul>;
    case 'orderedList': return <ol key={key}>{kids}</ol>;
    case 'listItem': return <li key={key}>{kids}</li>;
    case 'blockquote': return <blockquote key={key}>{kids}</blockquote>;
    case 'hardBreak': return <br key={key} />;
    case 'text': {
      let el: ReactNode = n.text ?? '';
      for (const m of n.marks ?? []) {
        if (m.type === 'bold') el = <strong>{el}</strong>;
        else if (m.type === 'italic') el = <em>{el}</em>;
        else if (m.type === 'link' && /^(https?:\/\/|mailto:)/i.test(m.attrs?.href ?? '')) {
          el = <a href={m.attrs!.href} target="_blank" rel="noopener noreferrer nofollow">{el}</a>;
        }
      }
      return <Fragment key={key}>{el}</Fragment>;
    }
    default: return null;
  }
}
