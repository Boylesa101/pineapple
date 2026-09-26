import { BRIEFING, displayValue } from '@/lib/content/briefing';

// Read-only briefing, used on the agency content page and the print view.
export function BriefingView({ data }: { data: Record<string, Record<string, unknown>> }) {
  return (
    <>
      {BRIEFING.map((part) => (
        <section key={part.id} className="card" aria-labelledby={`b-${part.id}`}>
          <h2 id={`b-${part.id}`}>{part.title}</h2>
          <dl className="stack">
            {part.fields.map((f) => {
              const v = displayValue(f, data?.[part.id]?.[f.key]);
              return (
                <div key={f.key}>
                  <dt className="small">{f.label}</dt>
                  <dd style={{ whiteSpace: 'pre-line' }}>{v || <span className="small">Not answered</span>}</dd>
                </div>
              );
            })}
          </dl>
        </section>
      ))}
    </>
  );
}
