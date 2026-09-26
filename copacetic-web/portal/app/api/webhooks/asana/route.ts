import { after, type NextRequest } from 'next/server';
import { asanaClient, isGid } from '@/lib/asana/client';
import { completedTaskChanges, statusFromTask, validSignature } from '@/lib/asana/webhook';
import { env } from '@/lib/env';
import { serviceClient } from '@/lib/supabase/service';

// Asana calls this (1) once with X-Hook-Secret while we create the webhook, and (2) with signed task
// events after that. The project id and a one-time handshake nonce are in the URL we registered.

const MAX_BODY = 1_000_000;
const empty = (status: number, headers?: HeadersInit) => new Response(null, { status, headers });

export async function POST(request: NextRequest) {
  const project = request.nextUrl.searchParams.get('project');
  const db = serviceClient();
  if (!isGid(project) || !db || !env.ASANA_TOKEN) return empty(404);

  // (1) Handshake: only accepted while the worker has the window open for this project, and only once.
  const hookSecret = request.headers.get('x-hook-secret');
  if (hookSecret) {
    if (!/^[\x21-\x7e]{16,200}$/.test(hookSecret)) return empty(400);
    const nonce = request.nextUrl.searchParams.get('nonce') ?? '';
    if (!/^[0-9a-f]{36}$/.test(nonce)) return empty(403);
    const { data: accepted } = await db.rpc('accept_asana_handshake', { p_project: project, p_secret: hookSecret, p_nonce: nonce });
    return accepted ? empty(200, { 'X-Hook-Secret': hookSecret }) : empty(403);
  }

  // (2) Events.
  if (Number(request.headers.get('content-length') ?? 0) > MAX_BODY) return empty(413);
  const raw = await request.text();
  if (raw.length > MAX_BODY) return empty(413);
  const { data: secret } = await db.rpc('asana_webhook_secret', { p_project: project });
  if (typeof secret !== 'string' || !validSignature(raw, secret, request.headers.get('x-hook-signature'))) {
    return empty(401);
  }
  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return empty(400);
  }
  const gids = completedTaskChanges(payload);
  // Answer Asana straight away; re-read the tasks afterwards.
  if (gids.length) after(() => applyTaskChanges(gids));
  return empty(200);
}

async function applyTaskChanges(gids: string[]) {
  const db = serviceClient()!;
  const asana = asanaClient(env.ASANA_TOKEN!);
  for (const gid of gids) {
    try {
      const { data: section } = await db
        .from('content_sections').select('id, status').eq('asana_task_gid', gid).maybeSingle();
      if (!section) continue; // not a content task (e.g. the briefing, or one the agency added)
      const task = await asana.get<{ completed: boolean }>(`/tasks/${gid}?opt_fields=completed`);
      const next = statusFromTask(section.status, task.completed);
      if (!next) continue;
      // Conditional on the status we read, so a client resubmission in between isn't overwritten.
      await db.from('content_sections').update({ status: next }).eq('id', section.id).eq('status', section.status);
    } catch (e) {
      console.error('[asana webhook] could not apply task change', gid, e instanceof Error ? e.message : e);
    }
  }
}
