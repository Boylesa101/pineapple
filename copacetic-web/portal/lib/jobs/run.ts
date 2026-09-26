import { AsanaError } from '@/lib/asana/client';
import { handle, NotReady, type Deps } from './handlers';

// Retry schedule after each failed attempt; after MAX_ATTEMPTS a job is marked failed and shows on
// the admin "Sync problems" page for a manual retry.
export const BACKOFF_MINUTES = [1, 5, 30, 120, 720];
export const MAX_ATTEMPTS = 8;
// Waiting on another job (e.g. the project) isn't a failure of this one, so it gets longer.
export const MAX_WAITING_ATTEMPTS = 30;

export function nextAttemptAt(attempts: number, now: Date, retryAfterSeconds?: number) {
  const minutes = BACKOFF_MINUTES[Math.min(Math.max(attempts, 1), BACKOFF_MINUTES.length) - 1];
  return new Date(now.getTime() + Math.max(minutes * 60_000, (retryAfterSeconds ?? 0) * 1000));
}

const describe = (e: unknown) => (e instanceof Error ? e.message : 'Unknown error').slice(0, 1000);

export type RunResult = { done: number; retrying: number; failed: number };

export async function runJobs(
  deps: Deps,
  { batch = 10, budgetMs = 20_000, now = () => new Date() }: { batch?: number; budgetMs?: number; now?: () => Date } = {},
): Promise<RunResult> {
  const result: RunResult = { done: 0, retrying: 0, failed: 0 };
  const started = Date.now();
  while (Date.now() - started < budgetMs) {
    const jobs = await deps.store.claim(batch);
    if (!jobs.length) break;
    // One at a time: a firm's tasks depend on its project, which is usually the earliest job.
    for (const job of jobs) {
      try {
        await handle(job, deps);
        await deps.store.complete(job.id);
        result.done++;
      } catch (e) {
        const permanent = e instanceof AsanaError && e.permanent;
        const limit = e instanceof NotReady ? MAX_WAITING_ATTEMPTS : MAX_ATTEMPTS;
        if (permanent || job.attempts >= limit) {
          await deps.store.fail(job.id, describe(e));
          result.failed++;
        } else {
          const retryAfter = e instanceof AsanaError ? e.retryAfterSeconds : undefined;
          await deps.store.reschedule(job.id, nextAttemptAt(job.attempts, now(), retryAfter), describe(e));
          result.retrying++;
        }
      }
    }
  }
  return result;
}
