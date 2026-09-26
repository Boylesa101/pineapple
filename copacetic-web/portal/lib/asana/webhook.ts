import { createHmac, timingSafeEqual } from 'node:crypto';
import { isGid } from './client';

// Asana signs each delivery: X-Hook-Signature = hex HMAC-SHA256 of the raw body, keyed with the secret
// it gave us in the handshake.
export function validSignature(rawBody: string, secret: string, signature: string | null) {
  if (!signature || !/^[0-9a-f]{64}$/i.test(signature)) return false;
  const expected = createHmac('sha256', secret).update(rawBody, 'utf8').digest();
  return timingSafeEqual(expected, Buffer.from(signature, 'hex'));
}

// Task ids whose "completed" changed. Events don't say which way, so the caller re-reads each task.
export function completedTaskChanges(payload: unknown): string[] {
  const events = (payload as { events?: unknown })?.events;
  if (!Array.isArray(events)) return [];
  const gids = new Set<string>();
  for (const e of events.slice(0, 500)) {
    const ev = e as { action?: string; resource?: { gid?: unknown; resource_type?: string }; change?: { field?: string } };
    if (ev?.resource?.resource_type !== 'task' || ev.action !== 'changed') continue;
    if (ev.change?.field && ev.change.field !== 'completed') continue;
    if (isGid(ev.resource.gid)) gids.add(ev.resource.gid);
  }
  return [...gids].slice(0, 50);
}

// What a section's status should become when its Asana task is (un)completed; null = leave it.
// Only submitted <-> approved moves: drafts are the client's, and Asana can't reopen them.
export function statusFromTask(current: string, completed: boolean): 'approved' | 'submitted' | null {
  if (completed && current === 'submitted') return 'approved';
  if (!completed && current === 'approved') return 'submitted';
  return null;
}
