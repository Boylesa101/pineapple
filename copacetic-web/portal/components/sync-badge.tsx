import { asanaTaskUrl, type SyncBadge as Badge } from '@/lib/sync';

// Where a submission stands in Asana, for the agency's content page.
export function SyncBadge({ state, label }: { state: Badge; label: string }) {
  const link = state.taskGid ? (
    <a className="small" href={asanaTaskUrl(state.taskGid)} target="_blank" rel="noopener noreferrer">
      Open in Asana<span className="sr-only"> ({label})</span>
    </a>
  ) : null;
  if (state.kind === 'failed') return <><span className="pill red">Asana sync failed</span> {link}</>;
  if (state.kind === 'waiting') return <><span className="pill amber">Syncing to Asana</span> {link}</>;
  if (state.kind === 'synced') return link;
  return null;
}
