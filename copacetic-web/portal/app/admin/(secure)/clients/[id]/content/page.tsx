import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BriefingView } from '@/components/briefing-view';
import { RichTextView } from '@/components/rich-text-view';
import { Submit } from '@/components/submit';
import { SyncBadge } from '@/components/sync-badge';
import { toRgb } from '@/lib/colour';
import { briefingProgress } from '@/lib/content/briefing';
import { COLOUR_USES, FONT_ROLES, SECTIONS, type Colour, type Font } from '@/lib/content/sections';
import { withFileUrls } from '@/lib/files';
import { checklist, loadOnboarding } from '@/lib/onboarding';
import { stageInfo } from '@/lib/stages';
import { loadClientSync } from '@/lib/sync';
import { uuid } from '@/lib/validation';
import { reopenBriefing, reopenSection } from '@/app/admin/actions';

export const metadata: Metadata = { title: 'Client content' };

const STATUS = { draft: ['Draft', ''], submitted: ['Submitted', 'green'], approved: ['Approved', 'green'] } as const;
const size = (n: number) => (n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

export default async function ClientContentPage(props: PageProps<'/admin/clients/[id]/content'>) {
  const { id } = await props.params;
  if (!uuid.safeParse(id).success) notFound();
  const o = await loadOnboarding(id);
  const c = checklist(o);
  const bp = briefingProgress(o.briefing.data as Record<string, Record<string, unknown>>);
  const [files, sync] = await Promise.all([withFileUrls(o.media), loadClientSync(id)]);
  // Clients can only edit while onboarding or just after submitting; reopening later would strand the item.
  const canReopen = o.stage === 'onboarding' || o.stage === 'content_submitted';
  const pct = Math.round((c.progress.complete / c.progress.total) * 100);

  return (
    <>
      <Link className="small" href={`/admin/clients/${id}`}>← {o.org.name}</Link>
      <div className="eyebrow" style={{ marginTop: 14 }}>Content · {stageInfo(o.stage).label}</div>
      <div className="spread">
        <h1>{o.org.name}</h1>
        <div className="row">
          <Link className="btn ghost" href={`/admin/clients/${id}/briefing`}>Print briefing</Link>
          {o.media.some((m) => m.status === 'clean') && (
            <a className="btn" href={`/admin/clients/${id}/files`}>Download all files (.zip)</a>
          )}
        </div>
      </div>
      <div className="card muted">
        <div className="spread"><strong>{pct}% of required content provided</strong><span className="small">{c.progress.complete} of {c.progress.total}</span></div>
        <div className="bar" style={{ marginTop: 8 }} aria-hidden><span style={{ width: `${pct}%` }} /></div>
        {c.blocking.length > 0 && (
          <ul className="small" style={{ marginTop: 10, paddingLeft: 18 }}>{c.blocking.map((b) => <li key={b}>{b}</li>)}</ul>
        )}
      </div>

      <section className="card" aria-labelledby="briefing">
        <div className="spread">
          <h2 id="briefing" style={{ marginBottom: 0 }}>Briefing</h2>
          <div className="row">
            <span className={`pill ${o.briefing.status === 'submitted' ? 'green' : ''}`}>
              {o.briefing.status === 'submitted' ? 'Submitted' : `Draft · ${bp.done}/${bp.total} required`}
            </span>
            <SyncBadge state={sync.briefing} label="briefing" />
            {o.briefing.status === 'submitted' && canReopen && (
              <form action={reopenBriefing}>
                <input type="hidden" name="orgId" value={id} />
                <Submit className="btn link">Reopen for changes</Submit>
              </form>
            )}
          </div>
        </div>
        <details style={{ marginTop: 12 }}>
          <summary className="small">Show answers</summary>
          <div style={{ marginTop: 12 }}><BriefingView data={o.briefing.data as Record<string, Record<string, unknown>>} /></div>
        </details>
      </section>

      {SECTIONS.map((cfg) => {
        const rows = o.sections.filter((s) => s.type === cfg.type);
        if (!rows.length) return null;
        return (
          <section key={cfg.type} aria-labelledby={`sec-${cfg.type}`}>
            <h2 id={`sec-${cfg.type}`} style={{ marginTop: 28 }}>{cfg.label}</h2>
            {rows.map((r) => {
              const [label, tone] = STATUS[r.status];
              const rowFiles = files.filter((f) => o.media.find((m) => m.id === f.id)?.section_id === r.id);
              return (
                <article key={r.id} className="card">
                  <div className="spread">
                    <h3 style={{ marginBottom: 0 }}>{r.title || cfg.itemLabel}</h3>
                    <div className="row">
                      <span className={`pill ${tone}`}>{label}</span>
                      <SyncBadge state={sync.section(r.id)} label={r.title || cfg.itemLabel} />
                      {r.status !== 'draft' && canReopen && (
                        <form action={reopenSection}>
                          <input type="hidden" name="orgId" value={id} />
                          <input type="hidden" name="sectionId" value={r.id} />
                          <Submit className="btn link">Reopen for changes<span className="sr-only"> ({r.title || cfg.itemLabel})</span></Submit>
                        </form>
                      )}
                    </div>
                  </div>
                  {r.type === 'brand' && (
                    <>
                      <div className="row" style={{ margin: '12px 0' }}>
                        {((r.fields?.colours as Colour[]) ?? []).map((col, i) => (
                          <div key={i} className="row" style={{ gap: 8 }}>
                            <span className="swatch" style={{ background: col.hex }} aria-hidden />
                            <div className="small">
                              <strong>{col.name || COLOUR_USES.find((u) => u.id === col.use)?.label}</strong><br />
                              <span className="mono">{col.hex} · {toRgb(col.hex)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                      {((r.fields?.fonts as Font[]) ?? []).map((f, i) => (
                        <p key={i} className="small">
                          <strong>{f.name}</strong> · {FONT_ROLES.find((x) => x.id === f.role)?.label}{f.source && ` · ${f.source}`}
                        </p>
                      ))}
                    </>
                  )}
                  <dl className="stack" style={{ marginTop: 10 }}>
                    {cfg.fields.map((f) => {
                      const v = r.fields?.[f.key];
                      if (v == null || v === '') return null;
                      const shown = f.type === 'checkbox' ? 'Yes' : f.type === 'select' ? f.options?.find((o) => o.id === v)?.label ?? String(v) : String(v);
                      return (
                        <div key={f.key}>
                          <dt className="small">{f.label}</dt>
                          <dd style={{ whiteSpace: 'pre-line' }}>{shown}</dd>
                        </div>
                      );
                    })}
                  </dl>
                  {cfg.bodyLabel && (
                    <div style={{ marginTop: 10 }}>
                      <div className="small">{cfg.bodyLabel}</div>
                      <RichTextView doc={r.body} />
                    </div>
                  )}
                  {rowFiles.length > 0 && (
                    <div className="files" style={{ marginTop: 14 }}>
                      {rowFiles.map((f) => (
                        <div key={f.id} className="file">
                          <div className="thumb">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            {f.previewUrl ? <img src={f.previewUrl} alt={f.alt_text ?? ''} /> : <span>{f.kind.toUpperCase()}</span>}
                          </div>
                          <div style={{ wordBreak: 'break-all' }}>{f.original_name}</div>
                          <div className="small">
                            {f.label && <>{f.label} · </>}{size(f.size_bytes)} ·{' '}
                            {f.status === 'clean' ? 'Checked' : f.status === 'pending' ? 'Not yet checked' : 'Rejected'}
                          </div>
                          {f.alt_text && <div className="small">Alt: {f.alt_text}</div>}
                          {f.downloadUrl && <a className="small" href={f.downloadUrl}>Download</a>}
                        </div>
                      ))}
                    </div>
                  )}
                </article>
              );
            })}
          </section>
        );
      })}
    </>
  );
}
